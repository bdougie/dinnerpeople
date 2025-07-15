import { supabase } from './supabase';
import { generateEmbedding } from './localEmbeddings';

// SQL to create the search_recipes function (renamed from match_recipes)
export const createMatchRecipesFunction = `
CREATE OR REPLACE FUNCTION search_recipes(
  query_embedding vector,
  match_threshold float,
  match_count int
) RETURNS TABLE (
  id uuid,
  title text,
  description text,
  thumbnail_url text,
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.title,
    r.description,
    r.thumbnail_url,
    1 - (r.embedding <=> query_embedding) as similarity
  FROM recipes r
  WHERE 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
`;

// SQL to create the search_frames function (renamed from match_frames)
export const createMatchFramesFunction = `
CREATE OR REPLACE FUNCTION search_frames(
  query_embedding vector,
  match_threshold float,
  match_count int
) RETURNS TABLE (
  id uuid,
  recipe_id uuid,
  description text,
  timestamp float,
  image_url text,
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    vf.id,
    vf.recipe_id,
    vf.description,
    vf.timestamp,
    vf.image_url,
    1 - (vf.embedding <=> query_embedding) as similarity
  FROM video_frames vf
  WHERE 1 - (vf.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
`;

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
    
    // Check if function exists first
    try {
      // Try direct RPC call with the correct function name
      const { data, error } = await supabase.rpc('search_frames', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: limit
      });
      
      if (error) throw error;
      return data || [];
    } catch (rpcError) {
      console.warn('RPC error, falling back to text search:', rpcError);
      
      // Fallback to text search
      const { data, error } = await supabase
        .from('video_frames')
        .select('id, recipe_id, description, timestamp, image_url')
        .textSearch('description', query)
        .limit(limit);
      
      if (error) throw error;
      
      // Add mock similarity scores
      return data.map(frame => ({
        ...frame,
        similarity: 0.8 // Mock similarity score
      }));
    }
  } catch (error) {
    console.error('Error searching similar frames:', error);
    return [];
  }
}

export interface SimilarRecipe {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  similarity: number;
}

/**
 * Search for recipes similar to the provided query text
 */
export async function searchSimilarRecipes(query: string, limit: number = 5): Promise<SimilarRecipe[]> {
  try {
    // Generate embedding for the search query
    const embedding = await generateEmbedding(query);
    
    // Check if function exists first
    try {
      // Try direct RPC call with the correct function name
      const { data, error } = await supabase.rpc('search_recipes', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: limit
      });
      
      if (error) throw error;
      return data || [];
    } catch (rpcError) {
      console.warn('RPC error, falling back to text search:', rpcError);
      
      // Fallback to text search
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, description, thumbnail_url')
        .textSearch('title', query)
        .limit(limit);
      
      if (error) throw error;
      
      // Add mock similarity scores
      return data.map(recipe => ({
        ...recipe,
        similarity: 0.8 // Mock similarity score
      }));
    }
  } catch (error) {
    console.error('Error searching similar recipes:', error);
    return [];
  }
}

/**
 * Update a recipe's summary embedding for improved search
 */
export async function updateRecipeSummaryEmbedding(recipeId: string): Promise<void> {
  try {
    // Get the recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('title, description')
      .eq('id', recipeId)
      .single();
    
    if (recipeError) throw recipeError;
    
    // Combine title and description for embedding
    const textToEmbed = `${recipe.title} ${recipe.description}`;
    
    // Generate embedding
    const embedding = await generateEmbedding(textToEmbed);
    
    // Update the recipe with embedding
    const { error: updateError } = await supabase
      .from('recipes')
      .update({ embedding })
      .eq('id', recipeId);
    
    if (updateError) throw updateError;
    
    console.log(`Updated embedding for recipe ${recipeId}`);
  } catch (error) {
    console.error('Error updating recipe embedding:', error);
    throw error;
  }
}

/**
 * Create database functions needed for semantic search
 * Run this from an admin page to set up search capabilities
 */
export async function initializeSearchFunctions(): Promise<{success: boolean, message: string}> {
  try {
    // Check if we have admin access
    const { data: hasAccess, error: accessError } = await supabase.rpc('check_is_admin');
    
    if (accessError || !hasAccess) {
      return {
        success: false,
        message: 'Only admin users can create database functions'
      };
    }
    
    // Create search_recipes function
    const { error: recipeError } = await supabase.rpc('run_sql', {
      sql: createMatchRecipesFunction
    });
    
    if (recipeError) {
      console.error('Error creating search_recipes function:', recipeError);
      return {
        success: false,
        message: `Failed to create search_recipes function: ${recipeError.message}`
      };
    }
    
    // Create search_frames function
    const { error: frameError } = await supabase.rpc('run_sql', {
      sql: createMatchFramesFunction
    });
    
    if (frameError) {
      console.error('Error creating search_frames function:', frameError);
      return {
        success: false,
        message: `Failed to create search_frames function: ${frameError.message}`
      };
    }
    
    return {
      success: true,
      message: 'Successfully created search functions'
    };
  } catch (error) {
    console.error('Error initializing search functions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      message: `Unexpected error: ${errorMessage}`
    };
  }
}
