import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { frames, prompt, streamResponse, model } = req.body;

  if (!frames || !Array.isArray(frames) || frames.length === 0) {
    return res.status(400).json({ error: 'Frames data is required' });
  }

  // Use provided model or fall back to env var or default to llama3
  const modelToUse = model || process.env.OLLAMA_MODEL || 'llama3';

  try {
    // Determine if we should use streaming based on request
    if (streamResponse) {
      // Set up streaming response
      res.setHeader('Content-Type', 'application/json');
      
      console.log(`Using model: ${modelToUse} for streaming response`);
      
      // Get response from Ollama (or your AI service) as a stream
      const ollamaResponse = await fetch(process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          prompt: createPrompt(frames, prompt),
          stream: true
        })
      });

      // Check for non-OK response from Ollama
      if (!ollamaResponse.ok) {
        const errorText = await ollamaResponse.text();
        return res.status(500).json({ 
          error: 'AI service returned an error',
          details: errorText,
          suggestions: [
            `Try using a different model. Current model: ${modelToUse}`,
            "Check if 'llama3' is available on your Ollama instance",
            "Verify the AI service is running correctly"
          ]
        });
      }

      // Stream the response to the client
      if (!ollamaResponse.body) {
        return res.status(500).json({ 
          error: 'No streaming body received from AI service',
          suggestions: [
            "Verify the Ollama API is configured for streaming",
            "Try using the 'llama3' model which handles streaming better"
          ] 
        });
      }

      const reader = ollamaResponse.body.getReader();
      let firstChunk = true;
      let responseBuffer = "";

      try {
        // Start response with opening JSON
        res.write('{"summary":[');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Parse the chunk
          const text = new TextDecoder().decode(value);
          responseBuffer += text;
          
          try {
            // Parse each line as JSON
            const lines = text.split('\n').filter(line => line.trim());
            for (const line of lines) {
              const parsed = JSON.parse(line);
              if (parsed.response) {
                if (!firstChunk) {
                  res.write(',');
                } else {
                  firstChunk = false;
                }
                // Format as a valid JSON array element
                res.write(JSON.stringify(parsed.response));
              }
            }
          } catch (e) {
            console.error('Error parsing streamed response:', e, text);
          }
        }
        
        // Close the JSON response
        res.write(']}');
        res.end();
      } catch (streamError) {
        // If streaming fails, try to send what we have so far
        console.error('Streaming error:', streamError);
        return res.status(500).json({ 
          error: 'Error processing streaming response',
          details: streamError.message,
          partialResponse: responseBuffer,
          suggestions: [
            "Try using 'llama3' model which has better streaming support",
            "Ensure your Ollama instance is up to date"
          ]
        });
      }
    } else {
      // Non-streaming response
      console.log(`Using model: ${modelToUse} for non-streaming response`);
      
      const ollamaResponse = await fetch(process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          prompt: createPrompt(frames, prompt),
          stream: false
        })
      });

      if (!ollamaResponse.ok) {
        const errorText = await ollamaResponse.text();
        return res.status(500).json({ 
          error: 'AI service returned an error',
          details: errorText,
          suggestions: [`Try using a different model. Current model: ${modelToUse}`]
        });
      }

      const data = await ollamaResponse.json();
      return res.status(200).json({ 
        summary: data.response 
      });
    }
  } catch (error) {
    console.error('Error processing recipe summary:', error);
    return res.status(500).json({ 
      error: 'Failed to generate recipe summary',
      details: error.message,
      suggestions: [
        "Try using the 'llama3' model which handles streaming better",
        "Check if your Ollama instance is running and accessible"
      ]
    });
  }
}

function createPrompt(frames, customPrompt) {
  // Frame data formatting
  const frameDescriptions = frames
    .map(f => `[${f.timestamp}s]: ${f.description}`)
    .join('\n');
  
  return `${customPrompt}\n\nFrame descriptions:\n${frameDescriptions}`;
}
