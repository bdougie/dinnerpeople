import { supabase } from './supabase';
import { generateEmbedding } from './openai';

export interface SimilarFrame {
  id: string;
  recipe_id: string;
  timestamp: number;
  description: string;
  image_url: string;
  similarity: number;
}

/**
 * Search for frames similar to the provided query text
 */
export async function searchSimilarFrames(query: string, limit: number = 5): Promise<SimilarFrame[]> {
  try {
    // Generate embedding for the search query
    const embedding = await generateEmbedding(query);
    
    // Search for similar frames using cosine similarity
    const { data, error } = await supabase.rpc('search_frames', {
      query_embedding: embedding,
      similarity_threshold: 0.5,
      match_count: limit
    });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching similar frames:', error);
    throw error;
  }
}
