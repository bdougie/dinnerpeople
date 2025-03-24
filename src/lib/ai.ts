import { ollama } from './ollama';
import * as openai from './openai';
import type { RecipeSummary } from './prompt-utils';

/**
 * Service that routes AI requests to either Ollama (in local development)
 * or OpenAI (in production) based on the environment.
 */
class AIService {
  private isLocalEnvironment(): boolean {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('local-credentialless.webcontainer-api.io')
    );
  }

  async analyzeFrame(imageUrl: string): Promise<string> {
    // Use Ollama for local development, OpenAI for production
    return this.isLocalEnvironment() 
      ? ollama.analyzeFrame(imageUrl)
      : openai.analyzeFrame(imageUrl);
  }

  async storeFrameWithEmbedding(
    recipeId: string, 
    timestamp: number,
    description: string,
    imageUrl: string
  ): Promise<void> {
    // Always use OpenAI for embeddings, even in local environment
    // This is because we need consistent embeddings for vector search
    return openai.storeFrameWithEmbedding(recipeId, timestamp, description, imageUrl);
  }

  async updateRecipeWithSummary(recipeId: string): Promise<void> {
    // Use Ollama for local development, OpenAI for production
    return this.isLocalEnvironment()
      ? ollama.updateRecipeWithSummary(recipeId)
      : openai.updateRecipeWithSummary(recipeId);
  }

  async processVideoFrames(videoId: string, frames: { timestamp: number, imageUrl: string }[]): Promise<void> {
    for (const frame of frames) {
      try {
        // Get frame description using appropriate service
        console.log(`[DEBUG] Analyzing frame at ${frame.timestamp}s`);
        const description = await this.analyzeFrame(frame.imageUrl);
        
        // Store frame with embedding using OpenAI
        console.log(`[DEBUG] Storing frame with embedding - timestamp: ${frame.timestamp}s`);
        await this.storeFrameWithEmbedding(
          videoId,
          frame.timestamp,
          description,
          frame.imageUrl
        );
        
        console.log(`[DEBUG] Successfully processed frame at ${frame.timestamp}s`);
      } catch (error) {
        console.error(`[DEBUG] Error processing frame at ${frame.timestamp}s:`, error);
        // Continue with other frames even if one fails
      }
    }
  }
}

export const ai = new AIService();