import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { PROMPTS } from "../../lib/prompt-utils";
import { generateEmbedding } from "../../lib/openai";
import { initializeSearchFunctions } from "../../lib/search";
import { ollama } from "../../lib/ollama";

interface VideoInfo {
  id: string;
  url: string;
  title: string;
  created_at: string;
}

interface FrameInfo {
  id: string;
  image_url: string;
  timestamp: number;
  description?: string;
}

interface OllamaModels {
  text: string[];
  vision: string[];
  embedding: string[];
  all: string[];
  recommended: {
    text: string;
    vision: string;
    embedding: string;
  };
  warning?: string;
}

const AdminSandbox: React.FC = () => {
  // State for videos and frames
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [frames, setFrames] = useState<FrameInfo[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState<string>("");

  // Prompt states
  const [framePrompt, setFramePrompt] = useState(PROMPTS.FRAME_ANALYSIS);
  const [recipePrompt, setRecipePrompt] = useState(PROMPTS.RECIPE_SUMMARY);
  const [socialPrompt, setSocialPrompt] = useState(
    PROMPTS.SOCIAL_MEDIA_DETECTION
  );

  // Results states
  const [frameResult, setFrameResult] = useState("");
  const [recipeResult, setRecipeResult] = useState("");
  const [socialResult, setSocialResult] = useState("");

  // Loading states
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isLoadingFrames, setIsLoadingFrames] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [isTestingFrame, setIsTestingFrame] = useState(false);
  const [isTestingRecipe, setIsTestingRecipe] = useState(false);
  const [isTestingSocial, setIsTestingSocial] = useState(false);
  const [isFixingUrls, setIsFixingUrls] = useState(false);
  const [fixResults, setFixResults] = useState("");

  // Add state for available models
  const [availableModels, setAvailableModels] = useState<OllamaModels | null>(
    null
  );
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Add state for selected models
  const [selectedTextModel, setSelectedTextModel] = useState("");
  const [selectedVisionModel, setSelectedVisionModel] = useState("");
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState("");

  // Add state for social media detection sandbox
  const [imageUrl, setImageUrl] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [socialDetectionResult, setSocialDetectionResult] = useState<{
    rawResponse: string;
    socialHandles: string[];
  } | null>(null);
  const [socialDetectionError, setSocialDetectionError] = useState<
    string | null
  >(null);

  // Load videos and models on component mount
  useEffect(() => {
    fetchRecentVideos();
    fetchAvailableModels();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load frames when a video is selected
  useEffect(() => {
    if (selectedVideoId) {
      fetchFramesForVideo(selectedVideoId);
    } else {
      setFrames([]);
    }
  }, [selectedVideoId]);

  const fetchRecentVideos = async () => {
    setIsLoadingVideos(true);
    try {
      // Get the 5 most recently created videos with their URLs
      const { data, error } = await supabase
        .from("recipes")
        .select("id, title, created_at, video_url")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const videos: VideoInfo[] = data.map((recipe) => ({
        id: recipe.id,
        title: recipe.title || `Recipe ${recipe.id.slice(0, 8)}`,
        url: recipe.video_url || "",
        created_at: recipe.created_at,
      }));

      setVideos(videos);

      // Auto-select the first video if available
      if (videos.length > 0 && !selectedVideoId) {
        setSelectedVideoId(videos[0].id);
      }
    } catch (error) {
      console.error("Error fetching recent videos:", error);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const fetchFramesForVideo = async (videoId: string) => {
    setIsLoadingFrames(true);
    try {
      // Get all frames for the selected video
      const { data, error } = await supabase
        .from("video_frames")
        .select("id, image_url, timestamp, description")
        .eq("recipe_id", videoId)
        .order("timestamp", { ascending: true });

      if (error) throw error;

      setFrames(data || []);

      // Auto-select the first frame if available
      if (data && data.length > 0) {
        setSelectedFrameId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching frames:", error);
    } finally {
      setIsLoadingFrames(false);
    }
  };

  const fetchAvailableModels = async () => {
    setIsLoadingModels(true);
    try {
      console.log("Fetching available Ollama models...");

      // Add a timeout for the fetch call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch("/api/admin/ollama-models", {
          signal: controller.signal,
        });

        clearTimeout(timeoutId); // Clear timeout on successful fetch

        // If we get an error status but can still parse the response, we'll use that
        const models = await response.json();

        // If there's a warning from the server, display it
        if (models.warning) {
          console.warn(`Warning from Ollama models API: ${models.warning}`);
        }

        setAvailableModels(models);

        // Set selected models to recommended ones
        if (models.recommended) {
          setSelectedTextModel(models.recommended.text);
          setSelectedVisionModel(models.recommended.vision);
          setSelectedEmbeddingModel(models.recommended.embedding);
        }
      } catch (fetchError) {
        console.error("Error fetching Ollama models:", fetchError);
        throw fetchError; // Re-throw to handle in the outer catch block
      }
    } catch (error) {
      console.error("Failed to get available models:", error);

      // Set fallback models
      const fallbackModels = {
        text: ["tinyllama", "llama3", "mistral"],
        vision: ["llama3.2-vision:11b"],
        embedding: ["nomic-embed-text"],
        all: [
          "tinyllama",
          "llama3",
          "mistral",
          "llama3.2-vision:11b",
          "nomic-embed-text",
        ],
        recommended: {
          text: "tinyllama",
          vision: "llama3.2-vision:11b",
          embedding: "nomic-embed-text",
        },
        warning: "Could not connect to model API. Using fallback models.",
      };

      setAvailableModels(fallbackModels);
      setSelectedTextModel(fallbackModels.recommended.text);
      setSelectedVisionModel(fallbackModels.recommended.vision);
      setSelectedEmbeddingModel(fallbackModels.recommended.embedding);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const getSelectedFrame = () => {
    return frames.find((frame) => frame.id === selectedFrameId);
  };

  const getSelectedVideo = () => {
    return videos.find((video) => video.id === selectedVideoId);
  };

  const testFrameAnalysis = async () => {
    const selectedFrame = getSelectedFrame();
    if (!selectedFrame) return;

    setIsTestingFrame(true);
    try {
      const response = await fetch("/api/admin/test-frame-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: selectedFrame.image_url,
          prompt: framePrompt,
          model: selectedVisionModel, // Use selected vision model
        }),
      });

      const result = await response.json();
      setFrameResult(result.analysis || "No result returned");
    } catch (error) {
      console.error("Error testing frame analysis:", error);
      if (error instanceof Error) {
        setFrameResult(`Error: ${error.message}`);
      } else {
        setFrameResult(`Error: ${String(error)}`);
      }
    } finally {
      setIsTestingFrame(false);
    }
  };

  const testRecipeSummary = async () => {
    if (!selectedVideoId || frames.length === 0) return;

    setIsTestingRecipe(true);
    try {
      const response = await fetch("/api/admin/test-recipe-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frames: frames.map((frame) => ({
            timestamp: frame.timestamp,
            description: frame.description || "No description available",
          })),
          prompt: recipePrompt,
          streamResponse: true, // Add option to request streaming response
          model: selectedTextModel, // Use selected text model
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Server responded with ${response.status}: ${errorText}`
        );
      }

      const result = await response.json();
      setRecipeResult(JSON.stringify(result.summary, null, 2));
    } catch (error) {
      console.error("Error testing recipe summary:", error);

      // Improve error display with better error extraction
      let errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Extract structured error data if available
      try {
        if (errorMessage.includes("{") && errorMessage.includes("}")) {
          const match = errorMessage.match(/\{.*\}/s);
          if (match) {
            const errorObj = JSON.parse(match[0]);
            errorMessage = `Error: ${errorObj.error || errorMessage}\n\n${
              errorObj.details || ""
            }`;

            // Add a hint about streaming responses if relevant
            if (
              errorObj.details?.includes("Unexpected non-whitespace character")
            ) {
              errorMessage +=
                "\n\nHint: The server may be failing to handle streaming responses. Try:\n" +
                "1. Using the 'llama3' model instead of other models\n" +
                "2. Implementing a streaming response handler on the server side\n" +
                "3. Setting response headers correctly for streaming";
            }
          }
        }
      } catch {
        // Silently continue if we can't parse the error details
      }

      setRecipeResult(
        `${errorMessage}\n\nCheck server logs for full response.`
      );
    } finally {
      setIsTestingRecipe(false);
    }
  };

  const testSocialDetection = async () => {
    const selectedFrame = getSelectedFrame();
    if (!selectedFrame) return;

    setIsTestingSocial(true);
    try {
      const response = await fetch("/api/admin/test-social-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: selectedFrame.image_url,
          prompt: socialPrompt,
          model: selectedVisionModel, // Use selected vision model
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Server responded with ${response.status}: ${errorText}`
        );
      }

      const result = await response.json();
      setSocialResult(result.socialHandles || "No social handles detected");
    } catch (error) {
      console.error("Error testing social detection:", error);
      if (error instanceof Error) {
        setSocialResult(`Error: ${error.message}`);
      } else {
        setSocialResult(`Error: ${String(error)}`);
      }
    } finally {
      setIsTestingSocial(false);
    }
  };

  const handleDetectSocialHandles = async () => {
    setSocialDetectionError(null);
    setSocialDetectionResult(null);

    try {
      const detectionResult = await ollama.detectSocialHandlesWithCustomPrompt(
        imageUrl,
        customPrompt
      );
      setSocialDetectionResult(detectionResult);
    } catch (err) {
      setSocialDetectionError(
        err instanceof Error ? err.message : "An error occurred while detecting social handles."
      );
    }
  };

  // Add a fix for streaming response handling issues
  const fixStreamingIssue = async () => {
    setIsFixingUrls(true);
    setFixResults("Working on it...");
    try {
      const response = await fetch("/api/admin/fix-streaming-issue", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();
      setFixResults(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Error fixing streaming issue:", error);
      if (error instanceof Error) {
        setFixResults(`Error: ${error.message}`);
      } else {
        setFixResults(`Error: ${String(error)}`);
      }
    } finally {
      setIsFixingUrls(false);
    }
  };

  async function searchSimilarRecipes(query: string) {
    try {
      // First, generate embedding
      const embedding = await generateEmbedding(query);

      // Try calling the function with the correct name (search_recipes instead of match_recipes)
      const { data, error } = await supabase.rpc("search_recipes", {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 10,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Recipe search error:", error);
      // Fallback to simpler search if function doesn't exist
      try {
        const { data, error } = await supabase
          .from("recipes")
          .select("id, title, description, thumbnail_url")
          .textSearch("title", query)
          .limit(10);

        if (error) throw error;
        return data.map((recipe) => ({
          ...recipe,
          similarity: 1.0, // Mock similarity for display
        }));
      } catch (fallbackError) {
        console.error("Fallback search error:", fallbackError);
        return [];
      }
    }
  }

  async function searchSimilarFrames(query: string) {
    try {
      // First, generate embedding
      const embedding = await generateEmbedding(query);

      // Try calling the function with the correct name (search_frames instead of match_frames)
      const { data, error } = await supabase.rpc("search_frames", {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 10,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Frame search error:", error);
      // Fallback to simpler search if function doesn't exist
      try {
        const { data, error } = await supabase
          .from("video_frames")
          .select("id, recipe_id, timestamp, description, image_url")
          .textSearch("description", query)
          .limit(10);

        if (error) throw error;
        return data.map((frame) => ({
          ...frame,
          similarity: 1.0, // Mock similarity for display
        }));
      } catch (fallbackError) {
        console.error("Fallback search error:", fallbackError);
        return [];
      }
    }
  }

  function SemanticSearchTester() {
    const [query, setQuery] = useState("");
    const [recipeResults, setRecipeResults] = useState<Array<{
      id: string;
      title: string;
      description?: string;
      thumbnail_url?: string;
      similarity: number;
    }>>([]);
    const [frameResults, setFrameResults] = useState<Array<{
      id: string;
      recipe_id: string;
      timestamp: number;
      description?: string;
      image_url?: string;
      similarity: number;
    }>>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isInitializing, setIsInitializing] = useState(false);
    const [initMessage, setInitMessage] = useState("");

    const handleSearch = async () => {
      if (!query.trim()) {
        setError("Please enter a search query");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [recipes, frames] = await Promise.all([
          searchSimilarRecipes(query),
          searchSimilarFrames(query),
        ]);
        setRecipeResults(recipes);
        setFrameResults(frames);
      } catch (err) {
        console.error("Search error:", err);
        if (err instanceof Error) {
          setError(`Search failed: ${err.message}`);
        } else {
          setError(`Search failed: ${String(err)}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    const handleInitFunctions = async () => {
      setIsInitializing(true);
      setInitMessage("");

      try {
        const result = await initializeSearchFunctions();
        setInitMessage(result.message);
      } catch (err) {
        console.error("Error initializing functions:", err);
        if (err instanceof Error) {
          setInitMessage(`Error: ${err.message}`);
        } else {
          setInitMessage(`Error: ${String(err)}`);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    return (
      <div className="p-6 border rounded-lg bg-white shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Semantic Search Testing</h2>
          <button
            onClick={handleInitFunctions}
            disabled={isInitializing}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            {isInitializing ? "Initializing..." : "Initialize Search Functions"}
          </button>
        </div>

        {initMessage && (
          <div
            className={`mb-4 p-3 rounded text-sm ${
              initMessage.includes("Error")
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {initMessage}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-3 py-2 border rounded"
            placeholder="Try: 'spicy chicken dinner' or 'chocolate dessert'"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">
              Recipe Results ({recipeResults.length})
            </h3>
            {recipeResults.length > 0 ? (
              <div className="bg-gray-50 p-3 rounded overflow-auto max-h-96">
                {recipeResults.map((recipe, i) => (
                  <div key={i} className="mb-3 p-2 border-b">
                    <div className="font-medium">{recipe.title}</div>
                    <div className="text-sm text-gray-600">
                      {recipe.description?.substring(0, 100)}...
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Similarity: {(recipe.similarity * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 italic">No recipe results</div>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2">
              Frame Results ({frameResults.length})
            </h3>
            {frameResults.length > 0 ? (
              <div className="bg-gray-50 p-3 rounded overflow-auto max-h-96">
                {frameResults.map((frame, i) => (
                  <div key={i} className="mb-3 p-2 border-b flex">
                    {frame.image_url && (
                      <div className="mr-3">
                        <img
                          src={frame.image_url}
                          alt="Frame"
                          className="w-16 h-16 object-cover rounded"
                        />
                      </div>
                    )}
                    <div>
                      <div className="text-sm">{frame.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Timestamp: {frame.timestamp}s | Similarity:{" "}
                        {(frame.similarity * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 italic">No frame results</div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold mb-2">Raw Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-60">
              {JSON.stringify(recipeResults, null, 2)}
            </pre>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-60">
              {JSON.stringify(frameResults, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  const ModelSelector = () => {
    if (isLoadingModels) {
      return <div className="text-center p-4">Loading available models...</div>;
    }

    if (!availableModels) {
      return (
        <div className="text-center p-4 text-yellow-600">
          Unable to load Ollama models. Using default models instead.
        </div>
      );
    }

    return (
      <div>
        {availableModels.warning && (
          <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded text-sm">
            Warning: {availableModels.warning}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Text Model</h3>
            <select
              value={selectedTextModel}
              onChange={(e) => setSelectedTextModel(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {availableModels.text.length > 0 ? (
                availableModels.text.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))
              ) : (
                <option value="">No text models available</option>
              )}
            </select>
            <p className="text-xs text-gray-600 mt-1">
              Used for recipe summaries and text generation
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Vision Model</h3>
            <select
              value={selectedVisionModel}
              onChange={(e) => setSelectedVisionModel(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {availableModels.vision.length > 0 ? (
                availableModels.vision.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))
              ) : (
                <option value="">No vision models available</option>
              )}
            </select>
            <p className="text-xs text-gray-600 mt-1">
              Used for frame analysis and image processing
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Embedding Model</h3>
            <select
              value={selectedEmbeddingModel}
              onChange={(e) => setSelectedEmbeddingModel(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {availableModels.embedding.length > 0 ? (
                availableModels.embedding.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))
              ) : (
                <option value="">No embedding models available</option>
              )}
            </select>
            <p className="text-xs text-gray-600 mt-1">
              Used for semantic search functionality
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Prompt Testing Sandbox</h1>

      {/* Admin Tools Panel */}
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-semibold mb-2">Admin Tools</h2>
        <div className="flex gap-4">
          <button
            onClick={fetchRecentVideos}
            className="px-3 py-1 bg-blue-500 text-white rounded"
          >
            Refresh Videos
          </button>
          <button
            onClick={fetchAvailableModels}
            className="px-3 py-1 bg-green-500 text-white rounded"
          >
            Refresh Models
          </button>
          <button
            onClick={fixStreamingIssue}
            disabled={isFixingUrls}
            className="px-3 py-1 bg-yellow-500 text-white rounded disabled:bg-gray-400"
          >
            {isFixingUrls ? "Working..." : "Fix Streaming Response Issues"}
          </button>
        </div>
        {fixResults && (
          <div className="mt-4 p-3 bg-gray-100 rounded overflow-auto max-h-48">
            <pre className="text-xs">{fixResults}</pre>
          </div>
        )}
      </div>

      {/* Model Selection Panel */}
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-semibold mb-2">Ollama Model Selection</h2>
        <ModelSelector />
      </div>

      {/* Video Selection Panel */}
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-semibold mb-2">Select Video</h2>

        {isLoadingVideos ? (
          <p>Loading videos...</p>
        ) : videos.length === 0 ? (
          <div>
            <p className="text-red-500">No videos found</p>
            <button
              onClick={fetchRecentVideos}
              className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
            >
              Refresh Videos
            </button>
          </div>
        ) : (
          <div>
            <select
              value={selectedVideoId}
              onChange={(e) => setSelectedVideoId(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a video</option>
              {videos.map((video) => (
                <option key={video.id} value={video.id}>
                  {video.title} (
                  {new Date(video.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>

            {getSelectedVideo()?.url && (
              <div className="mt-4">
                <video
                  src={getSelectedVideo()?.url}
                  controls
                  className="max-w-full h-auto"
                  style={{ maxHeight: "300px" }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Frame Selection Panel */}
      {selectedVideoId && frames.length > 0 && (
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Select Frame</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <select
                value={selectedFrameId}
                onChange={(e) => setSelectedFrameId(e.target.value)}
                className="w-full p-2 border rounded mb-2"
              >
                <option value="">Select a frame</option>
                {frames.map((frame) => (
                  <option key={frame.id} value={frame.id}>
                    Frame at {frame.timestamp}s (ID: {frame.id.slice(0, 8)})
                  </option>
                ))}
              </select>
              {selectedFrameId && (
                <div className="text-sm text-gray-600">
                  <p>Frame ID: {selectedFrameId}</p>
                  <p>Timestamp: {getSelectedFrame()?.timestamp}s</p>
                  <p className="mt-2">
                    <span className="font-semibold">Description:</span>
                    <br />
                    {getSelectedFrame()?.description ||
                      "No description available"}
                  </p>
                </div>
              )}
            </div>
            <div>
              {getSelectedFrame() && (
                <div>
                  <p className="text-sm font-semibold mb-2">Frame Preview:</p>
                  <img
                    src={getSelectedFrame()?.image_url}
                    alt={`Frame at ${getSelectedFrame()?.timestamp}s`}
                    className="max-w-full h-auto rounded border"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Test Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* Frame Analysis Panel */}
        <div className="border rounded p-4">
          <h2 className="text-lg font-semibold mb-2">Frame Analysis</h2>
          <textarea
            value={framePrompt}
            onChange={(e) => setFramePrompt(e.target.value)}
            className="w-full h-48 p-2 border rounded font-mono text-sm"
          />
          <button
            onClick={testFrameAnalysis}
            disabled={isTestingFrame || !selectedFrameId}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
          >
            {isTestingFrame ? "Testing..." : "Test Frame Analysis"}
          </button>

          <h3 className="mt-4 font-semibold">Result:</h3>
          <div className="mt-2 p-3 bg-gray-100 rounded min-h-20 whitespace-pre-wrap">
            {frameResult || "Run test to see results"}
          </div>
        </div>

        {/* Recipe Summary Panel */}
        <div className="border rounded p-4">
          <h2 className="text-lg font-semibold mb-2">Recipe Summary</h2>
          <textarea
            value={recipePrompt}
            onChange={(e) => setRecipePrompt(e.target.value)}
            className="w-full h-48 p-2 border rounded font-mono text-sm"
          />
          <button
            onClick={testRecipeSummary}
            disabled={isTestingRecipe || !selectedVideoId}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
          >
            {isTestingRecipe ? "Testing..." : "Test Recipe Summary"}
          </button>

          <h3 className="mt-4 font-semibold">Result:</h3>
          <div className="mt-2 p-3 bg-gray-100 rounded min-h-20 whitespace-pre-wrap">
            {recipeResult || "Run test to see results"}
          </div>
        </div>

        {/* Social Media Detection Panel */}
        <div className="border rounded p-4">
          <h2 className="text-lg font-semibold mb-2">Social Media Detection</h2>
          <textarea
            value={socialPrompt}
            onChange={(e) => setSocialPrompt(e.target.value)}
            className="w-full h-48 p-2 border rounded font-mono text-sm"
          />
          <button
            onClick={testSocialDetection}
            disabled={isTestingSocial || !selectedFrameId}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
          >
            {isTestingSocial ? "Testing..." : "Test Social Detection"}
          </button>

          <h3 className="mt-4 font-semibold">Result:</h3>
          <div className="mt-2 p-3 bg-gray-100 rounded min-h-20 whitespace-pre-wrap">
            {socialResult || "Run test to see results"}
          </div>
        </div>
      </div>

      {/* Social Media Detection Sandbox */}
      <div className="mt-6 p-6 border rounded-lg bg-white shadow-sm">
        <h1 className="text-2xl font-bold">Social Media Detection Sandbox</h1>
        <div>
          <label className="block text-sm font-medium">Image URL</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Enter image URL"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">
            Custom Prompt (Optional)
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Enter a custom prompt or leave blank for default"
          />
        </div>
        <button
          onClick={handleDetectSocialHandles}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Detect Social Handles
        </button>
        {socialDetectionError && (
          <p className="text-red-500">{socialDetectionError}</p>
        )}
        {socialDetectionResult && (
          <div className="mt-4">
            <h2 className="text-lg font-bold">Detection Result</h2>
            <p>
              <strong>Raw Response:</strong> {socialDetectionResult.rawResponse}
            </p>
            <p>
              <strong>Social Handles:</strong>{" "}
              {socialDetectionResult.socialHandles.join(", ") ||
                "None detected"}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <SemanticSearchTester />
      </div>
    </div>
  );
};

export default AdminSandbox;
