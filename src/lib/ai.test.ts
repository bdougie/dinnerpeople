import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOpenAIMock } from '../test/mocks/openai.mock';

// Mock the openai module
vi.mock('openai', () => ({
  default: vi.fn(() => createOpenAIMock())
}));

// Mock localEmbeddings to avoid ONNX runtime issues in tests
vi.mock('./localEmbeddings', () => ({
  generateEmbedding: vi.fn(() => Promise.resolve(new Array(384).fill(0.1))),
  generateBatchEmbeddings: vi.fn((texts) => Promise.resolve(texts.map(() => new Array(384).fill(0.1)))),
  preloadModel: vi.fn(() => Promise.resolve()),
  findSimilar: vi.fn(() => Promise.resolve([]))
}));

// Create mock functions that can be tracked
const mockInsert = vi.fn(() => ({ error: null }));
const mockFrom = vi.fn(() => ({
  insert: mockInsert,
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(() => ({ data: { user_id: 'test-user' }, error: null }))
    }))
  }))
}));

// Mock supabase
vi.mock('./supabase', () => ({
  supabase: {
    from: mockFrom,
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
      expect(mockFrom).toHaveBeenCalledWith('video_frames');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should process multiple video frames', async () => {
      const { ai } = await import('./ai');
      
      const frames = [
        { timestamp: 10, imageUrl: 'https://example.com/frame1.jpg' },
        { timestamp: 20, imageUrl: 'https://example.com/frame2.jpg' }
      ];
      
      await ai.processVideoFrames('video-123', frames);
      
      // Should process both frames (mockFrom is called once per frame)
      expect(mockFrom).toHaveBeenCalledWith('video_frames');
      expect(mockInsert).toHaveBeenCalledTimes(2);
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