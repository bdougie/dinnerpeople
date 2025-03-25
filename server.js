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

// Add other API endpoints here

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
