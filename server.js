import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { TEXT_MODEL, IMAGE_MODEL, EMBED_MODEL } from './src/lib/constants.js';

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
    const { imageUrl, prompt, model } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Use provided model or fallback to default
    const modelToUse = model || IMAGE_MODEL;

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
        model: modelToUse,
        prompt: prompt || "What's in this image?",
        images: [base64Image],
        stream: false
      })
    });

    const data = await ollamaResponse.json();
    const analysis = data.response;
    return res.json({ analysis, modelUsed: modelToUse });
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
    const { frames, prompt, model, streamResponse } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({ error: 'Frame data is required' });
    }

    // Use provided model or fallback to default TEXT_MODEL
    const modelToUse = model || TEXT_MODEL;

    console.log('DEBUG: Received frames:', frames.length);
    console.log(`DEBUG: Using model: ${modelToUse}`);

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
          model: modelToUse,
          prompt: formattedPrompt,
          system: 'You are a culinary expert. IMPORTANT: Your response MUST be valid JSON with a "title" and "description" field. Example: {"title": "Recipe Name", "description": "Recipe description"}',
          format: 'json'
        })
      });

      if (!ollamaResponse.ok) {
        throw new Error(`HTTP error! status: ${ollamaResponse.status}`);
      }

      // Get raw text first
      const rawText = await ollamaResponse.text();
      console.log('DEBUG: Raw API response (first 500 chars):', rawText.substring(0, 500));
      console.log('DEBUG: Response content type:', typeof rawText);

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
          console.log('DEBUG: Using jsonData.response path');
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
          console.log('DEBUG: Using jsonData.title path');
          // The outer JSON object might already be the summary
          summary = jsonData;
        } else {
          console.log('DEBUG: Using last resort fallback path');
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

      return res.json({ summary, modelUsed: modelToUse });
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

// Add the social media detection route
app.post('/api/admin/test-social-detection', async (req, res) => {
  try {
    const { imageUrl, prompt, model } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Use provided model or fallback to default vision model
    const modelToUse = model || IMAGE_MODEL;

    // Fetch the image data
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Call Ollama API for social media detection with specialized prompt
    const defaultPrompt = "Examine this image and identify any social media handles, usernames, or profiles that are shown. If you find any, respond with SOCIAL:platform:username. For example, if you see an Instagram handle, respond with SOCIAL:instagram:username. If no social media identifiers are present, respond with SOCIAL:none.";
    
    const ollamaResponse = await fetch(`${OLLAMA_API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelToUse,
        prompt: prompt || defaultPrompt,
        images: [base64Image],
        stream: false
      })
    });

    const data = await ollamaResponse.json();
    const analysis = data.response;
    
    // Extract social handles if present
    let socialHandles = 'No social handles detected';
    if (analysis.includes('SOCIAL:') && !analysis.includes('SOCIAL:none')) {
      const handleMatch = analysis.match(/SOCIAL:([^:]+):(.+)/);
      if (handleMatch && handleMatch.length >= 3) {
        const platform = handleMatch[1].trim();
        const username = handleMatch[2].trim();
        socialHandles = `${platform}:${username}`;
      }
    }
    
    return res.json({ 
      analysis, 
      socialHandles, 
      modelUsed: modelToUse 
    });
  } catch (error) {
    console.error('Error in social media detection:', error);
    return res.status(500).json({ 
      error: 'Error analyzing for social media',
      details: error.message 
    });
  }
});

// Update the embedding endpoint
app.post('/api/some-embedding-endpoint', async (req, res) => {
  try {
    const { text, model } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Use provided model or fallback to default
    const modelToUse = model || EMBED_MODEL;

    const ollamaResponse = await fetch(`${OLLAMA_API_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelToUse,
        prompt: text,
      })
    });

    if (!ollamaResponse.ok) {
      throw new Error(`HTTP error! status: ${ollamaResponse.status}`);
    }

    const embeddingData = await ollamaResponse.json();
    return res.json({ embedding: embeddingData, modelUsed: modelToUse });
  } catch (error) {
    console.error('Error in embedding endpoint:', error);
    return res.status(500).json({
      error: 'Error generating embedding',
      details: error.message
    });
  }
});

// Improve endpoint to fetch available Ollama models
app.get('/api/admin/ollama-models', async (req, res) => {
  try {
    console.log('DEBUG: Fetching available Ollama models');
    
    // Create fallback models object in case of failure
    const fallbackModels = {
      text: [TEXT_MODEL, 'llama3', 'mistral', 'gemma'],
      vision: [IMAGE_MODEL, 'llama3.2-vision:11b', 'llava'],
      embedding: [EMBED_MODEL, 'nomic-embed-text'],
      all: [TEXT_MODEL, IMAGE_MODEL, EMBED_MODEL, 'llama3', 'mistral', 'gemma', 'llama3.2-vision:11b', 'llava'],
      recommended: {
        text: TEXT_MODEL,
        vision: IMAGE_MODEL,
        embedding: EMBED_MODEL
      }
    };
    
    try {
      // Use a simpler fetch approach without AbortSignal.timeout which might not be supported
      // Add a timeout with Promise.race instead
      const fetchPromise = fetch(`${OLLAMA_API_URL}/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 5000)
      );
      
      // Race between the fetch and the timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        console.warn(`Ollama API returned status ${response.status}`);
        // Return fallback models with a warning
        return res.json({
          ...fallbackModels,
          warning: `Ollama API returned status ${response.status}. Using fallback model list.`
        });
      }

      const data = await response.json();
      
      // Extract model names and categorize them
      const models = data.models || [];
      
      if (models.length === 0) {
        console.warn('No models returned from Ollama API');
        return res.json({
          ...fallbackModels,
          warning: 'No models found in Ollama. Using fallback model list.'
        });
      }
      
      // Categorize models by type
      const categorizedModels = {
        text: models.filter(model => 
          !model.name.includes('vision') && 
          !model.name.includes('embed')).map(m => m.name),
        vision: models.filter(model => 
          model.name.includes('vision')).map(m => m.name),
        embedding: models.filter(model => 
          model.name.includes('embed')).map(m => m.name),
        all: models.map(m => m.name),
        // Recommend models based on currently configured ones
        recommended: {
          text: TEXT_MODEL,
          vision: IMAGE_MODEL,
          embedding: EMBED_MODEL
        }
      };
      
      // If any category is empty, add the default model to it
      if (categorizedModels.text.length === 0) {
        categorizedModels.text = [TEXT_MODEL];
      }
      
      if (categorizedModels.vision.length === 0) {
        categorizedModels.vision = [IMAGE_MODEL];
      }
      
      if (categorizedModels.embedding.length === 0) {
        categorizedModels.embedding = [EMBED_MODEL];
      }
      
      return res.json(categorizedModels);
    } catch (fetchError) {
      console.error('Error fetching from Ollama:', fetchError);
      return res.json({
        ...fallbackModels,
        warning: `Error connecting to Ollama: ${fetchError.message}. Using fallback model list.`
      });
    }
  } catch (error) {
    console.error('Error in ollama-models endpoint:', error);
    
    // Even if there's an unexpected error, return the fallback models with a 200 status
    // to prevent client-side errors
    return res.status(200).json({
      text: [TEXT_MODEL, 'llama3', 'mistral', 'gemma'],
      vision: [IMAGE_MODEL, 'llama3.2-vision:11b', 'llava'],
      embedding: [EMBED_MODEL, 'nomic-embed-text'],
      all: [TEXT_MODEL, IMAGE_MODEL, EMBED_MODEL, 'llama3', 'mistral', 'gemma', 'llama3.2-vision:11b', 'llava'],
      recommended: {
        text: TEXT_MODEL,
        vision: IMAGE_MODEL,
        embedding: EMBED_MODEL
      },
      warning: `Server error: ${error.message}. Using fallback model list.`
    });
  }
});

// Add other API endpoints here

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
