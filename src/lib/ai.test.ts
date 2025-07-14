import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOpenAIMock } from '../test/mocks/openai.mock';

// Mock the openai module
vi.mock('openai', () => ({
  default: vi.fn(() => createOpenAIMock())
}));

// Mock supabase
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: { user_id: 'test-user' }, error: null }))
        }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => ({ data: { user: { id: 'test-user' } } }))
    }
  },
  formatAttribution: vi.fn((handle, url) => ({ handle, url }))
}));

describe('AI Service Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Force production mode for these tests
    Object.defineProperty(window, 'location', {
      value: { hostname: 'production.com' },
      writable: true
    });
  });

  describe('OpenAI workflow', () => {
    it('should analyze a frame using OpenAI', async () => {
      const { ai } = await import('./ai');
      
      const result = await ai.analyzeFrame('https://example.com/image.jpg');
      
      expect(result).toBe('A chef is chopping vegetables on a cutting board.');
    });

    it('should generate embeddings and store frame', async () => {
      const { ai } = await import('./ai');
      
      await ai.storeFrameWithEmbedding(
        'recipe-123',
        30,
        'Chopping vegetables',
        'https://example.com/frame.jpg'
      );
      
      // Verify supabase was called
      const { supabase } = await import('./supabase');
      expect(supabase.from).toHaveBeenCalledWith('video_frames');
    });

    it('should process multiple video frames', async () => {
      const { ai } = await import('./ai');
      
      const frames = [
        { timestamp: 10, imageUrl: 'https://example.com/frame1.jpg' },
        { timestamp: 20, imageUrl: 'https://example.com/frame2.jpg' }
      ];
      
      await ai.processVideoFrames('video-123', frames);
      
      // Should process both frames
      const { supabase } = await import('./supabase');
      expect(supabase.from).toHaveBeenCalledTimes(2);
    });

    it('should generate recipe summary with custom prompt', async () => {
      const { ai } = await import('./ai');
      
      const result = await ai.generateRecipeSummaryWithCustomPrompt(
        'Step 1: Chop vegetables\nStep 2: Stir fry',
        'Generate a recipe summary for: {steps}'
      );
      
      expect(result.title).toBe('Vegetable Stir Fry');
      expect(result.description).toBe('A quick and healthy vegetable stir fry with fresh ingredients.');
    });
  });

  describe('Local environment detection', () => {
    it('should use Ollama in local environment', async () => {
      // Set localhost
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost' },
        writable: true
      });
      
      // Set environment variable to enable Ollama
      vi.stubEnv('VITE_USE_OLLAMA', 'true');
      
      // Mock ollama before importing
      vi.doMock('./ollama', () => ({
        ollama: {
          analyzeFrame: vi.fn().mockResolvedValue('Ollama response')
        }
      }));
      
      // Need to re-import to get fresh instance
      vi.resetModules();
      const { ai } = await import('./ai');
      
      const result = await ai.analyzeFrame('https://example.com/image.jpg');
      
      // Should use Ollama in local env
      expect(result).toBe('Ollama response');
      
      // Clean up
      vi.unstubAllEnvs();
    });
  });
});