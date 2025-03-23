import { ollama } from './ollama';
import { openai } from './openai';

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

  async processVideoFrames(videoId: string, frames: { timestamp: number, imageUrl: string }[]) {
    // Use Ollama for local development, OpenAI for production
    return this.isLocalEnvironment()
      ? ollama.processVideoFrames(videoId, frames)
      : openai.processVideoFrames(videoId, frames);
  }
}

export const ai = new AIService();