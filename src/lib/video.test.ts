import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to ensure mocks are defined before module initialization
const { mockGetUser, mockStorageUpload, mockGetPublicUrl, mockFromRecipes } = vi.hoisted(() => {
  return {
    mockGetUser: vi.fn(),
    mockStorageUpload: vi.fn(),
    mockGetPublicUrl: vi.fn(),
    mockFromRecipes: vi.fn()
  };
});

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser
    },
    storage: {
      from: vi.fn(() => ({
        upload: mockStorageUpload,
        getPublicUrl: mockGetPublicUrl
      }))
    },
    from: vi.fn((table: string) => {
      if (table === 'recipes') {
        return mockFromRecipes();
      }
      return {};
    })
  }
}));

import { uploadFrames } from './video';

describe('Video Frame Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    });

    mockFromRecipes.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { user_id: 'test-user-id' },
            error: null
          }))
        }))
      }))
    });

    mockStorageUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/frame.jpg' }
    });
  });

  describe('extractFrames', () => {
    it.skip('should handle video loading errors gracefully', async () => {
      // Skip this test in jsdom environment as it requires canvas support
      // This functionality is tested in e2e tests with real browser environment
    });

    it.skip('should extract frames at specified intervals', async () => {
      // Skip this test in jsdom environment as it requires canvas support
      // This functionality is tested in e2e tests with real browser environment
    });
  });

  describe('uploadFrames', () => {
    it('should continue processing even if individual frame uploads fail', async () => {
      const frames = [
        { timestamp: 0, blob: new Blob(['frame1'], { type: 'image/jpeg' }) },
        { timestamp: 5, blob: new Blob(['frame2'], { type: 'image/jpeg' }) },
        { timestamp: 10, blob: new Blob(['frame3'], { type: 'image/jpeg' }) }
      ];

      // Make second frame upload fail
      mockStorageUpload
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: new Error('Upload failed') })
        .mockResolvedValueOnce({ error: null });

      const result = await uploadFrames(frames, 'recipe-123');

      // Should have uploaded 2 frames successfully (first and third)
      expect(result).toHaveLength(2);
      expect(result[0]?.timestamp).toBe(0);
      expect(result[1]?.timestamp).toBe(10);
      
      // Verify all uploads were attempted
      expect(mockStorageUpload).toHaveBeenCalledTimes(3);
    });

    it('should throw error if user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null
      });

      const frames = [
        { timestamp: 0, blob: new Blob(['frame1'], { type: 'image/jpeg' }) }
      ];

      await expect(uploadFrames(frames, 'recipe-123')).rejects.toThrow('User not authenticated');
    });

    it('should throw error if user does not own the recipe', async () => {
      mockFromRecipes.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { user_id: 'different-user-id' },
              error: null
            }))
          }))
        }))
      });

      const frames = [
        { timestamp: 0, blob: new Blob(['frame1'], { type: 'image/jpeg' }) }
      ];

      await expect(uploadFrames(frames, 'recipe-123')).rejects.toThrow('Not authorized to upload frames for this recipe');
    });

    it('should handle recipe lookup errors', async () => {
      mockFromRecipes.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: new Error('Recipe not found')
            }))
          }))
        }))
      });

      const frames = [
        { timestamp: 0, blob: new Blob(['frame1'], { type: 'image/jpeg' }) }
      ];

      await expect(uploadFrames(frames, 'recipe-123')).rejects.toThrow('Not authorized to upload frames for this recipe');
    });

    it('should include user_id in storage path for proper permissions', async () => {
      const frames = [
        { timestamp: 0, blob: new Blob(['frame1'], { type: 'image/jpeg' }) }
      ];

      await uploadFrames(frames, 'recipe-123');

      expect(mockStorageUpload).toHaveBeenCalledWith(
        'test-user-id/recipe-123/0.jpg',
        expect.any(Blob)
      );
    });

    it('should return empty array if all uploads fail', async () => {
      const frames = [
        { timestamp: 0, blob: new Blob(['frame1'], { type: 'image/jpeg' }) },
        { timestamp: 5, blob: new Blob(['frame2'], { type: 'image/jpeg' }) }
      ];

      // Make all uploads fail
      mockStorageUpload.mockImplementation(() => Promise.resolve({ error: new Error('Upload failed') }));

      const result = await uploadFrames(frames, 'recipe-123');

      expect(result).toHaveLength(0);
      expect(mockStorageUpload).toHaveBeenCalledTimes(2);
    });

    it('should generate correct public URLs for uploaded frames', async () => {
      const frames = [
        { timestamp: 0, blob: new Blob(['frame1'], { type: 'image/jpeg' }) }
      ];

      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/test-user-id/recipe-123/0.jpg' }
      });

      const result = await uploadFrames(frames, 'recipe-123');

      expect(result[0]).toEqual({
        timestamp: 0,
        imageUrl: 'https://example.com/test-user-id/recipe-123/0.jpg'
      });
    });
  });
});