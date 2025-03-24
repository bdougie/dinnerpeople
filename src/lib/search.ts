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

export interface SimilarRecipe {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  user_id: string;
  similarity: number;
}

/**
 * Search for recipes similar to the provided query text
 */
export async function searchSimilarRecipes(query: string, limit: number = 5): Promise<SimilarRecipe[]> {
  try {
    // Generate embedding for the search query
    const embedding = await generateEmbedding(query);
    
    // Search for similar recipes using cosine similarity
    const { data, error } = await supabase.rpc('search_recipes', {
      query_embedding: embedding,
      similarity_threshold: 0.5,
      match_count: limit
    });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching similar recipes:', error);
    throw error;
  }
}

/**
 * Update a recipe's summary embedding for improved search
 */
export async function updateRecipeSummaryEmbedding(recipeId: string): Promise<void> {
  try {
    // Get recipe details
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('title, description')
      .eq('id', recipeId)
      .single();
      
    if (recipeError) throw recipeError;
    
    // Create a summary text combining title and description
    const summaryText = `${recipe.title}. ${recipe.description}`;
    
    // Generate embedding for the summary
    const embedding = await generateEmbedding(summaryText);
    
    // Update the recipe with the summary embedding
    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        recipe_summary: embedding
      })
      .eq('id', recipeId);
      
    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error updating recipe summary embedding:', error);
    throw error;
  }
}
