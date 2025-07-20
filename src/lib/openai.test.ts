import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Use vi.hoisted to ensure mocks are defined before module initialization
const { mockEmbeddingsCreate, mockChatCreate } = vi.hoisted(() => {
  return {
    mockEmbeddingsCreate: vi.fn(),
    mockChatCreate: vi.fn()
  };
});

vi.mock('openai', () => ({
  default: vi.fn(() => ({
    embeddings: {
      create: mockEmbeddingsCreate
    },
    chat: {
      completions: {
        create: mockChatCreate
      }
    }
  }))
}));

// Mock supabase for frame storage
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null }))
    }))
  }
}));

import { generateEmbedding, generateVideoTitle, processVideoFrames } from './openai';

describe('OpenAI Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Set OpenAI API key for tests
    vi.stubEnv('VITE_OPENAI_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('generateEmbedding', () => {
    it('should generate 1536-dimensional embeddings using text-embedding-3-small model', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingsCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }]
      });

      const result = await generateEmbedding('Test recipe content');

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'Test recipe content',
        dimensions: 1536
      });
      expect(result).toHaveLength(1536);
      expect(result).toEqual(mockEmbedding);
    });

    it('should return null when API key is not configured', async () => {
      vi.stubEnv('VITE_OPENAI_API_KEY', '');
      
      const result = await generateEmbedding('Test content');

      expect(result).toEqual([]);
      expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockEmbeddingsCreate.mockRejectedValueOnce(new Error('API Error'));

      const result = await generateEmbedding('Test content');

      expect(result).toEqual([]);
    });
  });

  describe('generateVideoTitle', () => {
    it('should generate title from thumbnail using vision API', async () => {
      mockChatCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Delicious Pasta Recipe'
          }
        }]
      });

      const result = await generateVideoTitle('https://example.com/thumbnail.jpg');

      expect(mockChatCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'text' }),
              expect.objectContaining({ 
                type: 'image_url',
                image_url: { url: 'https://example.com/thumbnail.jpg' }
              })
            ])
          })
        ]),
        max_tokens: 50
      });
      expect(result).toBe('Delicious Pasta Recipe');
    });

    it('should return fallback title when API key is missing', async () => {
      vi.stubEnv('VITE_OPENAI_API_KEY', '');

      const result = await generateVideoTitle('https://example.com/thumbnail.jpg');

      expect(result).toMatch(/^Untitled Recipe/);
      expect(mockChatCreate).not.toHaveBeenCalled();
    });

    it('should return fallback title on API error', async () => {
      mockChatCreate.mockRejectedValueOnce(new Error('API Error'));

      const result = await generateVideoTitle('https://example.com/thumbnail.jpg');

      expect(result).toMatch(/^Untitled Recipe/);
    });
  });

  describe('processVideoFrames', () => {
    it('should process frames in batches of 3 with rate limiting', async () => {
      const frames = [
        { timestamp: 10, imageUrl: 'https://example.com/frame1.jpg' },
        { timestamp: 20, imageUrl: 'https://example.com/frame2.jpg' },
        { timestamp: 30, imageUrl: 'https://example.com/frame3.jpg' },
        { timestamp: 40, imageUrl: 'https://example.com/frame4.jpg' },
        { timestamp: 50, imageUrl: 'https://example.com/frame5.jpg' }
      ];

      mockChatCreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Frame 1 description' } }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Frame 2 description' } }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Frame 3 description' } }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Frame 4 description' } }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Frame 5 description' } }]
        });

      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }]
      });

      const startTime = Date.now();
      const results = await processVideoFrames('recipe-123', frames);
      const endTime = Date.now();

      // Should have processed all frames
      expect(results).toHaveLength(5);
      expect(results[0]).toEqual({
        timestamp: 10,
        description: 'Frame 1 description'
      });

      // Should respect rate limiting (at least 1 second between batches)
      // 5 frames = 2 batches, so at least 1 second delay
      expect(endTime - startTime).toBeGreaterThanOrEqual(900); // Allow some margin

      // Verify API was called 5 times for descriptions
      expect(mockChatCreate).toHaveBeenCalledTimes(5);
      // Verify embeddings were generated for all frames
      expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(5);
    });

    it('should continue processing even if individual frames fail', async () => {
      const frames = [
        { timestamp: 10, imageUrl: 'https://example.com/frame1.jpg' },
        { timestamp: 20, imageUrl: 'https://example.com/frame2.jpg' },
        { timestamp: 30, imageUrl: 'https://example.com/frame3.jpg' }
      ];

      // First frame succeeds, second fails, third succeeds
      mockChatCreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Frame 1 description' } }]
        })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Frame 3 description' } }]
        });

      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }]
      });

      const results = await processVideoFrames('recipe-123', frames);

      // Should have all 3 results (including failed one)
      expect(results).toHaveLength(3);
      expect(results[0]?.timestamp).toBe(10);
      expect(results[1]?.timestamp).toBe(20);
      expect(results[1]?.description).toBe('Frame processing failed');
      expect(results[2]?.timestamp).toBe(30);
    });

    it('should handle empty frames array', async () => {
      const results = await processVideoFrames('recipe-123', []);

      expect(results).toHaveLength(0);
      expect(mockChatCreate).not.toHaveBeenCalled();
      expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
    });

    it('should process frames with default description when API key is missing', async () => {
      vi.stubEnv('VITE_OPENAI_API_KEY', '');

      const frames = [
        { timestamp: 10, imageUrl: 'https://example.com/frame1.jpg' }
      ];

      const results = await processVideoFrames('recipe-123', frames);

      // Should still process frames but with default description
      expect(results).toHaveLength(1);
      expect(results[0]?.description).toContain('Frame analysis unavailable');
      expect(mockChatCreate).not.toHaveBeenCalled();
    });
  });
});