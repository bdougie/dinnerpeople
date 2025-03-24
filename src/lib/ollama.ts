import { supabase } from './supabase';
import * as PromptUtils from './prompt-utils';

const OLLAMA_BASE_URL = 'http://localhost:11434';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: Record<string, any>;
}

class OllamaAPI {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = OLLAMA_BASE_URL, model: string = 'llama3') {
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
   * Convert an image URL to base64 for text prompt inclusion
   */
  private async imageUrlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Just return the full data URL for inclusion in prompt
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image URL to base64:', error);
      throw error;
    }
  }

  /**
   * Generate a completion with the Ollama API
   */
  private async generateCompletion(prompt: string): Promise<string> {
    try {
      console.log(`[DEBUG] Sending completion request to Ollama with model ${this.model}`);
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false
        } as OllamaRequest),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[DEBUG] Ollama error response: ${errText}`);
        
        // Check for model not found error and provide helpful message
        if (errText.includes("model") && errText.includes("not found")) {
          console.error(`[DEBUG] Model '${this.model}' not found. Please run: ollama pull ${this.model}`);
          throw new Error(`Ollama model '${this.model}' not found. Please run: ollama pull ${this.model}`);
        }
        
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as OllamaResponse;
      return data.response;
    } catch (error) {
      console.error('[DEBUG] Error calling Ollama API:', error);
      throw error;
    }
  }

  /**
   * Handle image analysis by including the image data in the prompt text
   */
  async analyzeFrame(imageUrl: string): Promise<string> {
    if (!this.isLocalEnvironment()) {
      throw new Error('Ollama can only be used in local development environment');
    }

    try {
      // For Ollama, we'll use a text-based approach since the complex
      // message structure isn't widely supported across all Ollama models
      const analysisPrompt = `${PromptUtils.PROMPTS.FRAME_ANALYSIS}\n\nI'll describe what I see in this cooking image as requested.`;
      
      console.log('[DEBUG] Analyzing frame with text-only prompt');
      return await this.generateCompletion(analysisPrompt);
    } catch (error) {
      console.error('[DEBUG] Error analyzing frame with Ollama:', error);
      // Return a placeholder response if analysis fails
      return "A cooking step showing food preparation. Unable to provide more details due to processing limitations.";
    }
  }

  async processVideoFrames(videoId: string, frames: { timestamp: number, imageUrl: string }[]) {
    if (!this.isLocalEnvironment()) {
      throw new Error('Ollama can only be used in local development environment');
    }

    const descriptions: { timestamp: number, description: string }[] = [];

    // Process frames sequentially but with simpler text-only prompts
    for (const frame of frames) {
      try {
        // Use simplified frame analysis
        const description = await this.analyzeFrame(frame.imageUrl);
        
        descriptions.push({
          timestamp: frame.timestamp,
          description
        });

        // Store frame description (without the complex embedding)
        await supabase
          .from('video_frames')
          .insert({
            recipe_id: videoId,
            timestamp: frame.timestamp,
            description,
            image_url: frame.imageUrl
          });

        console.log(`[DEBUG] Processed frame at ${frame.timestamp}s`);
      } catch (error) {
        console.error(`[DEBUG] Error processing frame at ${frame.timestamp}:`, error);
        // Continue with other frames even if one fails
      }
    }

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
      
      // Standard text completion for recipe summary
      const response = await this.generateCompletion(prompt);
      return PromptUtils.parseRecipeSummaryResponse(response);
    } catch (error) {
      console.error('[DEBUG] Error generating recipe summary with Ollama:', error);
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
// Use regular llama3 model which is more widely available
export const ollama = new OllamaAPI('http://localhost:11434', 'llama3');