import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Edit2, Loader2, Play } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface Recipe {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  status: string;
  created_at: string;
  user_id: string;
  attribution?: {
    handle?: string;
    original_url?: string;
  };
}

interface Frame {
  id: string;
  timestamp: number;
  description: string;
  image_url: string;
}

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRecipeDetails();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecipeDetails = async () => {
    if (!id) return;

    try {
      // Fetch recipe details
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

      if (recipeError) throw recipeError;
      if (!recipeData) throw new Error('Recipe not found');

      setRecipe(recipeData);

      // Fetch frames
      const { data: framesData, error: framesError } = await supabase
        .from('video_frames')
        .select('*')
        .eq('recipe_id', id)
        .order('timestamp', { ascending: true });

      if (framesError) throw framesError;
      setFrames(framesData || []);

    } catch (err) {
      console.error('Error fetching recipe:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const isOwner = user?.id === recipe?.user_id;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Recipe not found'}</p>
          <Link
            to="/my-recipes"
            className="text-blue-500 hover:underline"
          >
            Back to My Recipes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/my-recipes')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to My Recipes
        </button>
        
        {isOwner && (
          <button
            onClick={() => navigate(`/upload?edit=${id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Edit2 className="w-4 h-4" />
            Edit Recipe
          </button>
        )}
      </div>

      {/* Recipe Details */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Video/Thumbnail */}
        <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
          {showVideo && recipe.video_url ? (
            <video
              src={recipe.video_url}
              controls
              autoPlay
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <img
                src={recipe.thumbnail_url || '/placeholder.jpg'}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
              {recipe.video_url && (
                <button
                  onClick={() => setShowVideo(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors"
                >
                  <div className="bg-white/90 rounded-full p-4">
                    <Play className="w-8 h-8 text-gray-900" />
                  </div>
                </button>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{recipe.title}</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {recipe.description}
          </p>

          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <p>
              <span className="font-medium">Status:</span>{' '}
              <span className={`capitalize ${
                recipe.status === 'published' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {recipe.status}
              </span>
            </p>
            <p>
              <span className="font-medium">Created:</span>{' '}
              {new Date(recipe.created_at).toLocaleDateString()}
            </p>
            
            {recipe.attribution?.handle && (
              <p>
                <span className="font-medium">Source:</span>{' '}
                <a
                  href={recipe.attribution.handle}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {recipe.attribution.handle}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Frames */}
      {frames.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Recipe Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {frames.map((frame) => (
              <div key={frame.id} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow">
                <img
                  src={frame.image_url}
                  alt={`Step at ${frame.timestamp}s`}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <p className="text-sm text-gray-500 mb-2">
                    {Math.floor(frame.timestamp / 60)}:{String(Math.floor(frame.timestamp % 60)).padStart(2, '0')}
                  </p>
                  <p className="text-sm">{frame.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}