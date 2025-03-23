import { supabase } from './supabase';

const OLLAMA_BASE_URL = 'http://localhost:11434';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface OllamaImageRequest {
  model: string;
  prompt: string;
  images: string[];
  stream: boolean;
}

class OllamaAPI {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = OLLAMA_BASE_URL, model: string = 'llama2-vision') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  private isLocalEnvironment(): boolean {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('local-credentialless.webcontainer-api.io')
    );
  }

  private async generateImageCompletion(prompt: string, imageUrls: string[]): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          images: imageUrls,
          stream: false,
        } as OllamaImageRequest),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json() as OllamaResponse;
      return data.response;
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      throw error;
    }
  }

  async analyzeFrame(imageUrl: string): Promise<string> {
    if (!this.isLocalEnvironment()) {
      throw new Error('Ollama can only be used in local development environment');
    }

    const prompt = `You are a culinary expert. Analyze this cooking image and provide a detailed description of what you see.
    Focus on:
    1. Ingredients visible in the frame
    2. Cooking techniques being demonstrated
    3. Stage of the cooking process
    4. Any special equipment or tools being used
    5. Important details about temperature, timing, or technique
    
    Keep the description clear, concise, and informative. Format your response in a natural, flowing paragraph.`;

    try {
      // Convert image URL to base64 if it's a local blob URL
      let imageData = imageUrl;
      if (imageUrl.startsWith('blob:')) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        imageData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      return await this.generateImageCompletion(prompt, [imageData]);
    } catch (error) {
      console.error('Error analyzing frame:', error);
      throw error;
    }
  }

  async processVideoFrames(videoId: string, frames: { timestamp: number, imageUrl: string }[]) {
    if (!this.isLocalEnvironment()) {
      throw new Error('Ollama can only be used in local development environment');
    }

    const descriptions: { timestamp: number, description: string }[] = [];

    // Process frames sequentially
    for (const frame of frames) {
      try {
        const description = await this.analyzeFrame(frame.imageUrl);
        descriptions.push({
          timestamp: frame.timestamp,
          description
        });

        // Store each frame description
        await supabase
          .from('frame_descriptions')
          .insert({
            recipe_id: videoId,
            timestamp: frame.timestamp,
            description,
            image_url: frame.imageUrl
          });

      } catch (error) {
        console.error(`Error processing frame at ${frame.timestamp}:`, error);
        
        // Update processing status if there's an error
        await supabase
          .from('processing_queue')
          .update({ 
            status: 'failed',
            error: `Failed to process frame at ${frame.timestamp}: ${error.message}`
          })
          .eq('recipe_id', videoId);
          
        throw error;
      }
    }

    // Update processing status to completed
    await supabase
      .from('processing_queue')
      .update({ status: 'completed' })
      .eq('recipe_id', videoId);

    return descriptions;
  }

  async generateRecipeSummary(videoId: string): Promise<{ title: string; description: string; ingredients: string[] }> {
    if (!this.isLocalEnvironment()) {
      throw new Error('Ollama can only be used in local development environment');
    }

    try {
      // Get all frame descriptions for this recipe
      const { data: frames, error } = await supabase
        .from('frame_descriptions')
        .select('description')
        .eq('recipe_id', videoId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const descriptions = frames.map(f => f.description).join('\n');

      const prompt = `Based on these step-by-step cooking descriptions, generate a recipe summary:

      ${descriptions}

      Provide the following in JSON format:
      1. A catchy title for the recipe
      2. A brief, engaging description
      3. A list of all ingredients mentioned

      Format your response as valid JSON with these keys: title, description, ingredients`;

      const response = await this.generateImageCompletion(prompt, []);
      
      try {
        // Try to parse the response as JSON
        const parsed = JSON.parse(response);
        return {
          title: parsed.title || 'Untitled Recipe',
          description: parsed.description || 'No description available',
          ingredients: parsed.ingredients || []
        };
      } catch (e) {
        console.error('Failed to parse Ollama response as JSON:', e);
        return {
          title: 'Untitled Recipe',
          description: response,
          ingredients: []
        };
      }
    } catch (error) {
      console.error('Error generating recipe summary:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const ollama = new OllamaAPI('http://localhost:11434', 'llama2-vision');