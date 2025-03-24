import { supabase } from './supabase';
import * as PromptUtils from './prompt-utils';

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
  images?: string[];
  system?: string;
  stream?: boolean;
}

class OllamaAPI {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = OLLAMA_BASE_URL, model: string = 'llama3-vision') {
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

  /**
   * Convert an image URL to base64 for Ollama
   */
  private async imageUrlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Remove prefix (e.g., "data:image/jpeg;base64,") to get just the base64 data
          const base64Only = base64data.split(',')[1];
          resolve(base64Only);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image URL to base64:', error);
      throw error;
    }
  }

  private async generateTextCompletion(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3',  // Use llama3 for text-only completions
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json() as OllamaResponse;
      return data.response;
    } catch (error) {
      console.error('Error calling Ollama API for text:', error);
      throw error;
    }
  }

  private async generateImageCompletion(prompt: string, imageUrls: string[]): Promise<string> {
    try {
      // For text-only prompts, use the text completion function
      if (!imageUrls || imageUrls.length === 0) {
        return this.generateTextCompletion(prompt);
      }

      // Convert image URLs to base64 for Ollama
      const base64Images = await Promise.all(
        imageUrls.map(url => this.imageUrlToBase64(url))
      );

      console.log(`[DEBUG] Sending ${base64Images.length} images to Ollama`);
      
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                ...base64Images.map(base64 => ({
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64}` }
                }))
              ]
            }
          ],
          stream: false
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[DEBUG] Ollama error response:`, errText);
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message?.content || '';
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      
      // Fallback to text-only if image processing fails
      console.log('[DEBUG] Falling back to text-only completion');
      try {
        return await this.generateTextCompletion(
          `${prompt}\n\nNote: I couldn't process the image, but please try to answer based on this text.`
        );
      } catch (fallbackError) {
        throw error; // Throw the original error if fallback also fails
      }
    }
  }

  async analyzeFrame(imageUrl: string): Promise<string> {
    if (!this.isLocalEnvironment()) {
      throw new Error('Ollama can only be used in local development environment');
    }

    try {
      const prompt = PromptUtils.PROMPTS.FRAME_ANALYSIS;
      return await this.generateImageCompletion(prompt, [imageUrl]);
    } catch (error) {
      console.error('[DEBUG] Error analyzing frame with Ollama:', error);
      // Return a placeholder response if analysis fails
      return "A cooking step showing food preparation. Unable to provide more details.";
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

  /**
   * Generate recipe summary based on cooking steps
   */
  async generateRecipeSummary(cookingSteps: string): Promise<PromptUtils.RecipeSummary> {
    if (!this.isLocalEnvironment()) {
      throw new Error('Ollama can only be used in local development environment');
    }

    try {
      const prompt = PromptUtils.PROMPTS.RECIPE_SUMMARY.replace('{steps}', cookingSteps);
      
      // No images for recipe summary, so using text-only completion
      const response = await this.generateImageCompletion(prompt, []);
      return PromptUtils.parseRecipeSummaryResponse(response);
    } catch (error) {
      console.error('Error generating recipe summary with Ollama:', error);
      return {
        title: 'Untitled Recipe',
        description: 'This recipe was created automatically from a cooking video.'
      };
    }
  }

  /**
   * Complete recipe summarization with Ollama
   */
  async updateRecipeWithSummary(recipeId: string): Promise<void> {
    return PromptUtils.summarizeAndUpdateRecipe(recipeId, this.generateRecipeSummary.bind(this));
  }
}

// Create and export a singleton instance
// Try to use llama3-vision or fall back to llama3 if vision model isn't available
export const ollama = new OllamaAPI('http://localhost:11434', 'llama3-vision');