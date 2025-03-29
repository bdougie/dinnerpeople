import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173', // Vite's default port
  credentials: true
}));

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Ollama API URL
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api';

// API Routes
app.post('/api/admin/test-frame-analysis', async (req, res) => {
  try {
    const { imageUrl, prompt } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Fetch the image data
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Call Ollama API for image analysis
    const ollamaResponse = await fetch(`${OLLAMA_API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama3",
        prompt: prompt || "What's in this image?",
        images: [base64Image],
        stream: false
      })
    });

    const data = await ollamaResponse.json();
    const analysis = data.response;
    return res.json({ analysis });
  } catch (error) {
    console.error('Error in frame analysis:', error);
    return res.status(500).json({ 
      error: 'Error analyzing frame',
      details: error.message 
    });
  }
});

// Add the test-recipe-summary route
app.post('/api/admin/test-recipe-summary', async (req, res) => {
  try {
    const { frames, prompt } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({ error: 'Frame data is required' });
    }

    console.log('DEBUG: Received frames:', frames.length);

    // Format cooking steps from the frame descriptions
    const cookingSteps = frames
      .map(frame => `[${Math.floor(frame.timestamp / 60)}:${String(Math.floor(frame.timestamp % 60)).padStart(2, '0')}] ${frame.description}`)
      .join('\n\n');

    // Replace the steps placeholder in the custom prompt
    const formattedPrompt = prompt.replace('{steps}', cookingSteps);

    console.log('DEBUG: Preparing to call Ollama API');
    console.log('DEBUG: Formatted prompt:', formattedPrompt);

    try {
      console.log('DEBUG: Calling Ollama API...');

      const ollamaResponse = await fetch(`${OLLAMA_API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama3.2-vision:11b",
          prompt: formattedPrompt,
          system: 'You are a culinary expert specializing in creating engaging and accurate recipe titles and descriptions.',
          format: 'json'
        })
      });

      if (!ollamaResponse.ok) {
        throw new Error(`HTTP error! status: ${ollamaResponse.status}`);
      }

      // Get raw text first
      const rawText = await ollamaResponse.text();
      console.log('DEBUG: Raw API response:', rawText);

      let summary;
      try {
        // First try to get JSON data from the response
        let jsonData;
        try {
          // Direct parsing of the whole response
          jsonData = JSON.parse(rawText);
        } catch (parseError) {
          // Find any JSON object in the text
          const jsonMatch = rawText.match(/(\{[\s\S]*?\})/g);
          if (jsonMatch && jsonMatch.length > 0) {
            try {
              // Try each matched JSON object until one works
              for (const match of jsonMatch) {
                try {
                  jsonData = JSON.parse(match);
                  if (jsonData && (jsonData.response || jsonData.title)) {
                    break; // Found valid data
                  }
                } catch {
                  continue; // Try the next match
                }
              }
            } catch {
              // If all individual matches fail, try the first one anyway
              jsonData = { response: jsonMatch[0] };
            }
          }

          if (!jsonData) {
            throw new Error("No valid JSON found in response");
          }
        }

        // Now handle the response data - which could be JSON or text
        if (jsonData.response) {
          const responseText = jsonData.response;

          // Try to extract JSON from the response text
          try {
            // Look for valid JSON objects in the response text
            const jsonMatches = responseText.match(/(\{[\s\S]*?\})/g);
            if (jsonMatches && jsonMatches.length > 0) {
              for (const match of jsonMatches) {
                try {
                  const parsed = JSON.parse(match);
                  if (parsed && parsed.title) {
                    summary = parsed;
                    break;
                  }
                } catch {
                  continue;
                }
              }
            }

            // If no JSON objects found or none had a title, try parsing the whole response
            if (!summary) {
              summary = JSON.parse(responseText);
            }
          } catch (parseError) {
            // Extract title/description using regex as fallback
            const title = responseText.match(/(?:title|Title)[:\s]+["']?([^"'\n]+)["']?/i)?.[1]?.trim() || 'Untitled Recipe';
            const description = responseText.replace(/(?:title|Title)[:\s]+["']?([^"'\n]+)["']?/i, '').trim();

            summary = {
              title,
              description: description || 'A delicious recipe created from cooking video.'
            };
          }
        } else if (jsonData.title) {
          // The outer JSON object might already be the summary
          summary = jsonData;
        } else {
          // Last resort fallback
          summary = {
            title: 'Untitled Recipe',
            description: 'Unable to parse recipe details from model response.'
          };
        }
      } catch (error) {
        console.error('DEBUG: Error parsing response:', error);
        return res.status(500).json({
          error: 'Failed to parse API response',
          details: error.message,
          rawResponse: rawText
        });
      }

      return res.json({ summary });
    } catch (error) {
      console.error('DEBUG: Ollama API request failed:', error.message);
      return res.status(500).json({
        error: 'Failed to process recipe',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Error in test-recipe-summary:', error);
    return res.status(500).json({
      error: 'Error generating recipe summary',
      details: error.message
    });
  }
});

// Add other API endpoints here

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
