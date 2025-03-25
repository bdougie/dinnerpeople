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
  async analyzeFrame(imageUrl: string, customPrompt?: string): Promise<string> {
    if (!this.isLocalEnvironment()) {
      throw new Error('Ollama can only be used in local development environment');
    }

    try {
      // Use the custom prompt if provided, otherwise use the default
      const prompt = customPrompt || PromptUtils.PROMPTS.FRAME_ANALYSIS;
      
      console.log('[DEBUG] Analyzing frame with text-only prompt');
      return await this.generateCompletion(prompt);
    } catch (error) {
      console.error('[DEBUG] Error analyzing frame with Ollama:', error);
      // Return a placeholder response if analysis fails
      return `Unable to provide more details due to processing limitations. ${imageUrl}`;
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
   * Generate embeddings using Ollama with nomic-embed-text model
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isLocalEnvironment()) {
      throw new Error('Ollama can only be used in local development environment');
    }

    try {
      console.log('[DEBUG] Generating embedding with nomic-embed-text');
      
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: text,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[DEBUG] Ollama embedding error: ${errText}`);
        
        if (errText.includes("model") && errText.includes("not found")) {
          console.error(`[DEBUG] Model 'nomic-embed-text' not found. Please run: ollama pull nomic-embed-text`);
          throw new Error(`Ollama model 'nomic-embed-text' not found. Please run: ollama pull nomic-embed-text`);
        }
        
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('[DEBUG] Error generating embedding with Ollama:', error);
      throw error;
    }
  }

  /**
   * Store frame with embedding using Ollama's nomic-embed-text
   */
  async storeFrameWithEmbedding(
    recipeId: string,
    timestamp: number,
    description: string,
    imageUrl: string
  ): Promise<void> {
    if (!this.isLocalEnvironment()) {
      throw new Error('Ollama can only be used in local development environment');
    }

    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(description);
      let paddedEmbedding = this.padEmbedding(embedding, 1536);
      
      // Fall back to direct insertion without RPC
      const { error: insertError } = await supabase.from('video_frames').insert({
        recipe_id: recipeId,
        timestamp,
        description,
        image_url: imageUrl,
        // Store embedding as string-formatted vector - this matches PostgreSQL's expected format
        embedding: `[${paddedEmbedding.join(',')}]` 
      });

      if (insertError) throw insertError;
      console.log(`[DEBUG] Successfully stored frame at ${timestamp}s`);
    } catch (error) {
      console.error('[DEBUG] Error storing frame with embedding:', error);
      throw error;
    }
  }

  /**
   * Pad or truncate an embedding to the desired length
   */
  private padEmbedding(embedding: number[], targetLength: number): number[] {
    if (embedding.length === targetLength) {
      return embedding;
    }
    
    if (embedding.length > targetLength) {
      // Truncate if longer
      return embedding.slice(0, targetLength);
    }
    
    // Pad with zeros if shorter
    const result = [...embedding];
    while (result.length < targetLength) {
      result.push(0);
    }
    
    return result;
  }

  /**
   * Generate recipe summary based on cooking steps
   */
  async generateRecipeSummary(cookingSteps: string): Promise<PromptUtils.RecipeSummary> {
    if (!this.isLocalEnvironment()) {
      throw new Error('Ollama can only be used in local development environment');
    }

    try {
      // Modify prompt to be more explicit about JSON format requirement
      const prompt = `${PromptUtils.PROMPTS.RECIPE_SUMMARY.replace('{steps}', cookingSteps)}
      
IMPORTANT: Your response MUST be in valid JSON format with only 'title' and 'description' fields.
Example: {"title": "Recipe Title", "description": "Recipe description text"}`;
      
      // Standard text completion for recipe summary
      const response = await this.generateCompletion(prompt);
      
      try {
        // Try to parse response as JSON
        return PromptUtils.parseRecipeSummaryResponse(response);
      } catch (parseError) {
        console.error('[DEBUG] Failed to parse Ollama response as JSON:', parseError);
        console.log('[DEBUG] Raw response:', response);
        
        // Fallback: Extract a title from the response if possible
        let title = 'Untitled Recipe';
        if (response.includes('title') || response.includes('Title')) {
          const titleMatch = response.match(/(?:title|Title)[:\s]+["']?([^"'\n]+)["']?/i);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
          }
        }
        
        // Create fallback summary object
        return {
          title: title,
          description: 'A delicious recipe created from cooking video. ' + 
                      response.substring(0, 100).replace(/["{}\[\]]/g, '') + '...'
        };
      }
    } catch (error) {
      console.error('[DEBUG] Error generating recipe summary with Ollama:', error);
      return {
        title: 'Untitled Recipe',
        description: `Unable to generate a summary for this recipe due to processing limitations.`
      };
    }
  }

  /**
   * Complete recipe summarization with Ollama
   */
  async updateRecipeWithSummary(recipeId: string): Promise<void> {
    try {
      // Get existing recipe data to ensure we're not losing information
      const { data: existingRecipe, error: fetchError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Generate the recipe summary
      const summary = await this.generateRecipeSummary(
        existingRecipe.cooking_steps || ''
      );
      
      // Update only fields we know exist in the schema
      const { error: updateError } = await supabase
        .from('recipes')
        .update({
          title: summary.title,
          description: summary.description,
          // Remove reference to ai_generated column
          updated_at: new Date().toISOString()
        })
        .eq('id', recipeId);
        
      if (updateError) throw updateError;
      
      console.log(`[DEBUG] Updated recipe ${recipeId} with AI-generated summary`);
    } catch (error) {
      console.error('[DEBUG] Error updating recipe with summary:', error);
      throw error;
    }
  }
}

/**
 * Generate a recipe summary with a custom prompt for local testing
 */
export async function generateRecipeSummaryWithCustomPrompt(
  cookingSteps: string,
  customPrompt: string
): Promise<PromptUtils.RecipeSummary> {
  try {
    if (!window.location.hostname.includes('localhost') && 
        !window.location.hostname.includes('127.0.0.1') &&
        !window.location.hostname.includes('local-credentialless.webcontainer-api.io')) {
      throw new Error('Ollama can only be used in local development environment');
    }
    
    // Replace the steps placeholder in the custom prompt
    const formattedPrompt = customPrompt.replace('{steps}', cookingSteps);
    
    // Use Ollama locally to generate a summary with the custom prompt
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt: formattedPrompt,
        system: 'You are a culinary expert specializing in creating engaging and accurate recipe titles and descriptions.',
        format: 'json'
      })
    });
    
    const data = await response.json();
    return PromptUtils.parseRecipeSummaryResponse(data.response);
  } catch (error) {
    console.error('Error generating recipe summary with Ollama:', error);
    return {
      title: 'Error Generating Recipe',
      description: 'There was an error processing this recipe with the custom prompt in Ollama.'
    };
  }
}

// Create and export a singleton instance
// Use regular llama3 model which is more widely available
export const ollama = new OllamaAPI('http://localhost:11434', 'llama3.2-vision:11b');