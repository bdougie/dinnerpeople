import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { PROMPTS } from "../../lib/prompt-utils";

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
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const [isTestingFrame, setIsTestingFrame] = useState(false);
  const [isTestingRecipe, setIsTestingRecipe] = useState(false);
  const [isTestingSocial, setIsTestingSocial] = useState(false);
  const [isFixingUrls, setIsFixingUrls] = useState(false);
  const [fixResults, setFixResults] = useState("");

  // Load videos on component mount
  useEffect(() => {
    fetchRecentVideos();
  }, []);

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
        }),
      });

      const result = await response.json();
      setFrameResult(result.analysis || "No result returned");
    } catch (error) {
      console.error("Error testing frame analysis:", error);
      setFrameResult(`Error: ${error.message}`);
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
        }),
      });

      const result = await response.json();
      setRecipeResult(JSON.stringify(result.summary, null, 2));
    } catch (error) {
      console.error("Error testing recipe summary:", error);
      setRecipeResult(`Error: ${error.message}`);
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
        }),
      });

      const result = await response.json();
      setSocialResult(result.socialHandles || "No social handles detected");
    } catch (error) {
      console.error("Error testing social detection:", error);
      setSocialResult(`Error: ${error.message}`);
    } finally {
      setIsTestingSocial(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Prompt Testing Sandbox</h1>

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
    </div>
  );
};

export default AdminSandbox;
