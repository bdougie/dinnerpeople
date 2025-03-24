import OpenAI from 'openai';
import { supabase } from './supabase';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, API calls should be made from backend
});

export async function analyzeFrame(imageUrl: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe this cooking step in detail, focusing on the ingredients, techniques, and any important details visible in the frame. Keep it concise but informative."
            },
            {
              type: "image_url",
              image_url: imageUrl
            }
          ]
        }
      ],
      max_tokens: 150
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error analyzing frame:', error);
    throw error;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float"
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

export async function storeFrameWithEmbedding(
  recipeId: string, 
  timestamp: number,
  description: string,
  imageUrl: string
): Promise<void> {
  try {
    // Generate embedding for the description
    const embedding = await generateEmbedding(description);
    
    // Store in database with embedding
    const { error } = await supabase
      .from('video_frames')
      .insert({
        recipe_id: recipeId,
        timestamp,
        description,
        image_url: imageUrl,
        embedding
      });
      
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error storing frame with embedding:', error);
    throw error;
  }
}

export async function processVideoFrames(videoId: string, frames: { timestamp: number, imageUrl: string }[]) {
  const descriptions: { timestamp: number, description: string }[] = [];

  // Process frames sequentially to avoid rate limits
  for (const frame of frames) {
    try {
      const description = await analyzeFrame(frame.imageUrl);
      descriptions.push({
        timestamp: frame.timestamp,
        description
      });

      // Store each frame description as we get it
      await storeFrameWithEmbedding(videoId, frame.timestamp, description, frame.imageUrl);

    } catch (error) {
      console.error(`Error processing frame at ${frame.timestamp}:`, error);
    }
  }

  return descriptions;
}