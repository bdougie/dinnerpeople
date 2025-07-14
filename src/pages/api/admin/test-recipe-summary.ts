import { Request, Response } from 'express';
import * as PromptUtils from '../../../lib/prompt-utils';

// Import constants from a shared configuration file
import { TEXT_MODEL } from '../../../lib/constants';

// Express-compatible handler instead of Next.js API route
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { frames, prompt, streamResponse, model } = req.body;

  if (!frames || !Array.isArray(frames) || frames.length === 0) {
    return res.status(400).json({ error: 'Frames data is required' });
  }

  const modelToUse = model || process.env.OLLAMA_MODEL || TEXT_MODEL;

  try {
    const cookingSteps = formatCookingSteps(frames);

    if (streamResponse) {
      res.setHeader('Content-Type', 'application/json');
      console.log(`Using model: ${modelToUse} for streaming response`);

      const ollamaResponse = await fetch(process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          prompt: createConsistentPrompt(cookingSteps, prompt),
          stream: true
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

      if (!ollamaResponse.body) {
        return res.status(500).json({ error: 'No streaming body received from AI service' });
      }

      const reader = ollamaResponse.body.getReader();
      let firstChunk = true;
      let responseBuffer = "";

      try {
        res.write('{"summary":[');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = new TextDecoder().decode(value);
          responseBuffer += text;

          try {
            const lines = text.split('\n').filter(line => line.trim());
            for (const line of lines) {
              const parsed = JSON.parse(line);
              if (parsed.response) {
                if (!firstChunk) {
                  res.write(',');
                } else {
                  firstChunk = false;
                }
                res.write(JSON.stringify(parsed.response));
              }
            }
          } catch (parseError) {
            console.error('Error parsing streamed response:', parseError, text);
          }
        }

        res.write(']}');
        res.end();
      } catch (streamError) {
        console.error('Streaming error:', streamError);
        const errorMessage = streamError instanceof Error ? streamError.message : 'An unknown error occurred';
        return res.status(500).json({ 
          error: 'Error processing streaming response',
          details: errorMessage,
          partialResponse: responseBuffer
        });
      }
    } else {
      const ollamaResponse = await fetch(process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          prompt: createConsistentPrompt(cookingSteps, prompt),
          stream: false
        })
      });

      if (!ollamaResponse.ok) {
        const errorText = await ollamaResponse.text();
        return res.status(500).json({ 
          error: 'AI service returned an error', 
          details: errorText
        });
      }

      const data = await ollamaResponse.json();
      return res.status(200).json({ summary: data.response });
    }
  } catch (error) {
    console.error('Error processing recipe summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ 
      error: 'Failed to generate recipe summary',
      details: errorMessage
    });
  }
}

function formatCookingSteps(frames: Array<{ timestamp: number; description: string }>) {
  return frames
    .map(frame => `[${frame.timestamp}s]: ${frame.description}`)
    .join('\n\n');
}

function createConsistentPrompt(cookingSteps: string, customPrompt?: string) {
  if (customPrompt) {
    return customPrompt.replace('{steps}', cookingSteps);
  } else {
    return PromptUtils.PROMPTS.RECIPE_SUMMARY.replace('{steps}', cookingSteps) + `
    
IMPORTANT: Your response MUST be in valid JSON format with only 'title' and 'description' fields.
Example: {"title": "Recipe Title", "description": "Recipe description text"}`;
  }
}
