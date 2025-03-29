import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Update API endpoint configuration (this would be for documentation purposes)
    const apiConfigUpdates = {
      message: "API Configuration Update Guide",
      steps: [
        "Set proper Content-Type headers for streaming responses",
        "Use Response.json() for JSON responses, and manual response writing for streams",
        "Ensure proper error handling for streaming responses"
      ]
    };

    // 2. Test connection to Ollama
    let ollamaStatus = "unknown";
    let availableModels = [];
    
    try {
      // First check connection with basic query
      const response = await fetch(process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'llama3',
          prompt: 'Return only the word "OK" if you can read this message.',
          stream: false
        }),
        timeout: 5000 // 5 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        ollamaStatus = data.response?.includes("OK") ? "connected" : "responding but not as expected";
        
        // Try to get list of available models
        try {
          const modelsResponse = await fetch(process.env.OLLAMA_API_URL || 'http://localhost:11434/api/tags', {
            method: 'GET',
            timeout: 5000
          });
          
          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            if (modelsData.models) {
              availableModels = modelsData.models.map(m => m.name);
            }
          }
        } catch (modelError) {
          console.error('Error fetching models:', modelError);
          // Continue execution even if models fetch fails
        }
      } else {
        ollamaStatus = `error: ${response.status}`;
      }
    } catch (error) {
      ollamaStatus = `connection error: ${error.message}`;
    }

    return res.status(200).json({
      success: true,
      message: "Streaming response diagnostics complete",
      ollamaConnectionStatus: ollamaStatus,
      availableModels: availableModels,
      modelRecommendations: {
        preferred: "llama3",
        alternatives: ["llama3:latest", "llama2"],
        note: "The llama3 model has shown better compatibility with streaming responses"
      },
      apiConfigUpdates,
      recommendations: [
        "1. Use the 'llama3' model for streaming responses",
        "2. For streaming, set response headers correctly and use response.write()",
        "3. Make sure to use proper JSON format for each streamed chunk",
        "4. When consuming streams in the frontend, use Response.body.getReader()",
        "5. Ensure OLLAMA_API_URL environment variable is set correctly"
      ]
    });

  } catch (error) {
    console.error('Error fixing streaming issue:', error);
    return res.status(500).json({ 
      error: 'Failed to fix streaming issue',
      details: error.message
    });
  }
}
