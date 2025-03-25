import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

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
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');

    // Call Ollama API for image analysis
    const ollamaResponse = await axios.post(`${OLLAMA_API_URL}/generate`, {
      model: "llama3.2-vision:11b",
      prompt: prompt || "What's in this image?",
      images: [base64Image],
      stream: false // Ensure we get a complete response, not streamed
    });

    const analysis = ollamaResponse.data.response;
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
    const { recipeId, prompt } = req.body;
    
    if (!recipeId) {
      return res.status(400).json({ error: 'Recipe ID is required' });
    }
    
    // Get frame descriptions from Supabase
    const { data: frames, error } = await supabase
      .from('video_frames')
      .select('timestamp, description')
      .eq('recipe_id', recipeId)
      .order('timestamp', { ascending: true });
      
    if (error) throw error;
    
    // Format cooking steps from the frame descriptions
    const cookingSteps = frames
      .map(frame => `[${Math.floor(frame.timestamp / 60)}:${String(Math.floor(frame.timestamp % 60)).padStart(2, '0')}] ${frame.description}`)
      .join('\n\n');
    
    // Replace the steps placeholder in the custom prompt
    const formattedPrompt = prompt.replace('{steps}', cookingSteps);
    
    // Call Ollama API for recipe summary
    const ollamaResponse = await axios.post(`${OLLAMA_API_URL}/generate`, {
      model: "llama3.2-vision:11b", // Using the same model as in ollama.ts
      prompt: formattedPrompt,
      system: 'You are a culinary expert specializing in creating engaging and accurate recipe titles and descriptions.',
      format: 'json'
    });
    
    try {
      // Parse the response from Ollama
      const responseText = ollamaResponse.data.response;
      let summary;
      
      try {
        // Try to parse as JSON
        summary = JSON.parse(responseText);
      } catch (parseError) {
        // Fallback if not valid JSON
        console.error('Failed to parse Ollama response as JSON:', parseError);
        
        // Extract title if possible
        let title = 'Untitled Recipe';
        if (responseText.includes('title') || responseText.includes('Title')) {
          const titleMatch = responseText.match(/(?:title|Title)[:\s]+["']?([^"'\n]+)["']?/i);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
          }
        }
        
        // Create fallback summary
        summary = {
          title: title,
          description: 'A delicious recipe created from cooking video. ' + 
                      responseText.substring(0, 100).replace(/["{}\[\]]/g, '') + '...'
        };
      }
      
      return res.json({ summary });
    } catch (error) {
      console.error('Error parsing recipe summary:', error);
      return res.status(500).json({ 
        error: 'Error processing recipe summary',
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
