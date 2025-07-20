import { supabase } from './supabase';
import { generateEmbedding } from './openai';

export interface SampleFrame {
  timestamp: number;
  description: string;
  imageUrl: string;
}

export interface SampleRecipe {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  frames: SampleFrame[];
}

// Sample recipes with cooking frames
export const SAMPLE_RECIPES: SampleRecipe[] = [
  {
    id: 'sample-pasta-1',
    title: 'Classic Spaghetti Carbonara',
    description: 'A traditional Italian pasta dish with eggs, cheese, and pancetta. This creamy and delicious recipe is ready in just 20 minutes.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    frames: [
      {
        timestamp: 0,
        description: 'Boiling water in a large pot for the pasta',
        imageUrl: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=800&q=80'
      },
      {
        timestamp: 5,
        description: 'Cutting pancetta into small cubes on a wooden cutting board',
        imageUrl: 'https://images.unsplash.com/photo-1607156849825-90b68c5c6d48?w=800&q=80'
      },
      {
        timestamp: 10,
        description: 'Frying pancetta in a pan until crispy and golden',
        imageUrl: 'https://images.unsplash.com/photo-1528712306091-ed0763094c98?w=800&q=80'
      },
      {
        timestamp: 15,
        description: 'Mixing eggs and grated Parmesan cheese in a bowl',
        imageUrl: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&q=80'
      },
      {
        timestamp: 20,
        description: 'Tossing hot pasta with egg mixture and crispy pancetta',
        imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80'
      }
    ]
  },
  {
    id: 'sample-chicken-2',
    title: 'Honey Garlic Chicken Stir Fry',
    description: 'A quick and flavorful Asian-inspired dish with tender chicken, vegetables, and a sweet and savory sauce.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    frames: [
      {
        timestamp: 0,
        description: 'Slicing chicken breast into bite-sized pieces',
        imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&q=80'
      },
      {
        timestamp: 5,
        description: 'Chopping colorful bell peppers and onions',
        imageUrl: 'https://images.unsplash.com/photo-1601565415267-724db0e9b3de?w=800&q=80'
      },
      {
        timestamp: 10,
        description: 'Heating oil in a wok over high heat',
        imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80'
      },
      {
        timestamp: 15,
        description: 'Stir-frying chicken until golden brown',
        imageUrl: 'https://images.unsplash.com/photo-1567121938337-6e38f4e90abc?w=800&q=80'
      },
      {
        timestamp: 20,
        description: 'Adding honey garlic sauce and tossing everything together',
        imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80'
      }
    ]
  },
  {
    id: 'sample-dessert-3',
    title: 'Chocolate Lava Cake',
    description: 'An indulgent dessert with a warm, molten chocolate center. Perfect for special occasions or when you need a chocolate fix.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    frames: [
      {
        timestamp: 0,
        description: 'Melting dark chocolate and butter in a double boiler',
        imageUrl: 'https://images.unsplash.com/photo-1610450949065-1f2841536c88?w=800&q=80'
      },
      {
        timestamp: 5,
        description: 'Whisking eggs and sugar until light and fluffy',
        imageUrl: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=800&q=80'
      },
      {
        timestamp: 10,
        description: 'Folding melted chocolate into the egg mixture',
        imageUrl: 'https://images.unsplash.com/photo-1607257882338-70f7dd2ae344?w=800&q=80'
      },
      {
        timestamp: 15,
        description: 'Pouring batter into buttered ramekins',
        imageUrl: 'https://images.unsplash.com/photo-1586985289071-36f62f55ce44?w=800&q=80'
      },
      {
        timestamp: 20,
        description: 'Removing perfectly baked lava cakes with molten centers',
        imageUrl: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&q=80'
      }
    ]
  }
];

/**
 * Load sample data into the database for testing/demo purposes
 */
export async function loadSampleData(userId: string): Promise<{ success: boolean; message: string }> {
  
  try {
    // Check if user already has recipes
    const { data: existingRecipes, error: checkError } = await supabase
      .from('recipes')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
      
    if (checkError) {
      return { success: false, message: 'Failed to check existing recipes' };
    }
    
    if (existingRecipes && existingRecipes.length > 0) {
      return { success: true, message: 'User already has recipes' };
    }
    
    // Load each sample recipe
    let loadedCount = 0;
    for (const sampleRecipe of SAMPLE_RECIPES) {
      try {
        
        // Create recipe entry
        const { data: recipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            id: sampleRecipe.id,
            user_id: userId,
            title: sampleRecipe.title,
            description: sampleRecipe.description,
            thumbnail_url: sampleRecipe.thumbnailUrl,
            video_url: sampleRecipe.videoUrl,
            status: 'published',
            embedding: await generateEmbedding(`${sampleRecipe.title} ${sampleRecipe.description}`)
          })
          .select()
          .single();
          
        if (recipeError) {
          continue;
        }
        
        // Load frames for this recipe
        let frameCount = 0;
        for (const frame of sampleRecipe.frames) {
          try {
            const embedding = await generateEmbedding(frame.description);
            
            const { error: frameError } = await supabase
              .from('video_frames')
              .insert({
                recipe_id: recipe.id,
                timestamp: frame.timestamp,
                description: frame.description,
                image_url: frame.imageUrl,
                embedding: embedding.length > 0 ? embedding : null
              });
              
            if (frameError) {
            } else {
              frameCount++;
            }
          } catch (frameError) {
          }
        }
        
        loadedCount++;
        
      } catch (error) {
      }
    }
    
    return {
      success: true,
      message: `Successfully loaded ${loadedCount}/${SAMPLE_RECIPES.length} sample recipes`
    };
    
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check if sample data is loaded for a user
 */
export async function hasSampleData(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('id')
      .eq('user_id', userId)
      .in('id', SAMPLE_RECIPES.map(r => r.id))
      .limit(1);
      
    return !error && data && data.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Remove sample data for a user
 */
export async function removeSampleData(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Delete frames first (due to foreign key constraint)
    const sampleRecipeIds = SAMPLE_RECIPES.map(r => r.id);
    
    const { error: framesError } = await supabase
      .from('video_frames')
      .delete()
      .in('recipe_id', sampleRecipeIds);
      
    if (framesError) {
    }
    
    // Delete recipes
    const { error: recipesError } = await supabase
      .from('recipes')
      .delete()
      .eq('user_id', userId)
      .in('id', sampleRecipeIds);
      
    if (recipesError) {
      return { success: false, message: 'Failed to remove sample recipes' };
    }
    
    return { success: true, message: 'Sample data removed successfully' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}