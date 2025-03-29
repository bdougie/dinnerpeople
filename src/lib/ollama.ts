import { supabase } from './supabase';
import * as PromptUtils from './prompt-utils';
import { TEXT_MODEL, IMAGE_MODEL, EMBED_MODEL } from './constants';

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

  constructor(baseUrl: string = OLLAMA_BASE_URL, model: string = IMAGE_MODEL) {
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
  private async generateCompletion(prompt: string, imageBase64?: string): Promise<string> {
    try {
      console.log(`[DEBUG] Sending completion request to Ollama with model ${this.model}`);
      
      const requestBody: any = {
        model: this.model,
        prompt,
        stream: false
      };

      // Add the image to the request if provided
      if (imageBase64) {
        // Extract the base64 data (remove data URL prefix if present)
        const base64Data = imageBase64.includes('base64,') 
          ? imageBase64.split('base64,')[1] 
          : imageBase64;
          
        requestBody.images = [base64Data];
      }
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
      
      // Convert image to base64
      console.log('[DEBUG] Converting image to base64 for analysis');
      const imageBase64 = await this.imageUrlToBase64(imageUrl);
      
      console.log('[DEBUG] Analyzing frame with image data');
      return await this.generateCompletion(prompt, imageBase64);
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

    console.log(`Retrieved ${descriptions.length} frame descriptions`);
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
      console.log(`[DEBUG] Generating embedding with ${EMBED_MODEL}`);
      
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: EMBED_MODEL,
          prompt: text,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[DEBUG] Ollama embedding error: ${errText}`);
        
        if (errText.includes("model") && errText.includes("not found")) {
          console.error(`[DEBUG] Model '${EMBED_MODEL}' not found. Please run: ollama pull ${EMBED_MODEL}`);
          throw new Error(`Ollama model '${EMBED_MODEL}' not found. Please run: ollama pull ${EMBED_MODEL}`);
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
      // Verify that the authenticated user owns the recipe
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('user_id')
        .eq('id', recipeId)
        .single();

      if (recipeError) {
        console.error('[DEBUG] Error verifying recipe ownership:', recipeError);
        throw new Error('Could not verify recipe ownership');
      }

      if (recipeData.user_id !== userData.user.id) {
        throw new Error('Not authorized to process this recipe');
      }

      // Generate embedding
      const embedding = await this.generateEmbedding(description);
      let paddedEmbedding = this.padEmbedding(embedding, 1536);

      // Insert frame after ownership verification
      const { error: insertError } = await supabase.from('video_frames').insert({
        recipe_id: recipeId,
        timestamp,
        description,
        image_url: imageUrl,
        embedding: `[${paddedEmbedding.join(',')}]` // Store embedding as string-formatted vector
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
      console.log(`Formatted cooking steps: ${cookingSteps.substring(0, 100)}...`);
      return {
        title: 'Untitled Recipe',
        description: `Unable to generate a summary for this recipe due to processing limitations.`
      };
    }
  }

  /**
   * Update recipe with AI-generated title and description
   */
  async updateRecipeWithSummary(recipeId: string): Promise<void> {
    return PromptUtils.summarizeAndUpdateRecipe(recipeId, this.generateRecipeSummary.bind(this));
  }

  /**
   * Generate a recipe summary with a custom prompt for local testing
   */
  async generateRecipeSummaryWithCustomPrompt(
    cookingSteps: string,
    customPrompt: string
  ): Promise<PromptUtils.RecipeSummary> {
    if (!this.isLocalEnvironment()) {
      throw new Error('Ollama can only be used in local development environment');
    }

    try {
      // Replace the steps placeholder in the custom prompt
      const formattedPrompt = customPrompt.replace('{steps}', cookingSteps);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: TEXT_MODEL, // Use the text model constant here
          prompt: formattedPrompt,
          system: 'You are a culinary expert specializing in creating engaging and accurate recipe titles and descriptions.',
          format: 'json'
        })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Ollama server returned an error:', response.status, text.substring(0, 200) + '...');
        throw new Error(`Ollama server error (${response.status}): Please check if Ollama is running on localhost:11434`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Ollama server returned non-JSON response:', text.substring(0, 200) + '...');
        throw new Error('Ollama server returned a non-JSON response');
      }

      const data = await response.json();
      return PromptUtils.parseRecipeSummaryResponse(data.response);
    } catch (error) {
      console.error('Error generating recipe summary with Ollama:', error);
      return {
        title: 'Error Generating Recipe',
        description: `There was an error processing this recipe: ${error.message}. Please ensure Ollama is running on localhost:11434.`
      };
    }
  }
}

// Create and export a singleton instance
// Use the image model constant
export const ollama = new OllamaAPI('http://localhost:11434', IMAGE_MODEL);