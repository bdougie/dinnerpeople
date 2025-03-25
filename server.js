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
        model: "llama3.2-vision:11b",
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
    
    // Before making the Ollama API call
    console.log('DEBUG: Preparing to call Ollama API');
    console.log('DEBUG: Prompt template:', prompt);
    console.log('DEBUG: Formatted prompt:', formattedPrompt);
    console.log('DEBUG: Cooking steps length:', cookingSteps?.length || 0);

    // Enhanced Ollama API call with proper error handling
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
        // Try to extract valid JSON from the response
        let jsonData;
        try {
          // First attempt: direct parsing
          jsonData = JSON.parse(rawText);
        } catch (parseError) {
          // Second attempt: try to find JSON object in the response
          const jsonMatch = rawText.match(/(\{.*\})/s);
          if (jsonMatch) {
            jsonData = JSON.parse(jsonMatch[0]);
          } else {
            throw parseError; // Rethrow if no JSON found
          }
        }
        
        const responseText = jsonData.response;
        
        // Try to parse the response content as JSON
        try {
          summary = JSON.parse(responseText);
        } catch {
          // If parsing fails, create a summary from the raw text
          const title = responseText.match(/(?:title|Title)[:\s]+["']?([^"'\n]+)["']?/i)?.[1]?.trim() || 'Untitled Recipe';
          const description = responseText.replace(/(?:title|Title)[:\s]+["']?([^"'\n]+)["']?/i, '').trim();
          
          summary = {
            title,
            description: description || 'A delicious recipe created from cooking video.'
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
      
      if (!error.response) {
        console.error('DEBUG: Error message:', error.message);
      }
      
      console.error('DEBUG: Error stack:', error.stack);
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
