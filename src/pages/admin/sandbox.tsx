import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { PROMPTS } from "../../lib/prompt-utils";

interface VideoInfo {
  id: string;
  url: string;
}

interface FrameInfo {
  id: string;
  image_url: string;
  timestamp: number;
}

const AdminSandbox: React.FC = () => {
  // State for the most recent video and frames
  const [latestVideo, setLatestVideo] = useState<VideoInfo | null>(null);
  const [frames, setFrames] = useState<FrameInfo[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);

  // System prompts (editable copies)
  const [framePrompt, setFramePrompt] = useState(PROMPTS.FRAME_ANALYSIS);
  const [recipePrompt, setRecipePrompt] = useState(PROMPTS.RECIPE_SUMMARY);
  const [socialPrompt, setSocialPrompt] = useState(
    PROMPTS.SOCIAL_MEDIA_DETECTION
  );

  // Results
  const [frameResult, setFrameResult] = useState("");
  const [recipeResult, setRecipeResult] = useState("");
  const [socialResult, setSocialResult] = useState("");

  // Loading states
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [isTestingFrame, setIsTestingFrame] = useState(false);
  const [isTestingRecipe, setIsTestingRecipe] = useState(false);
  const [isTestingSocial, setIsTestingSocial] = useState(false);

  useEffect(() => {
    fetchLatestVideo();
  }, []);

  const fetchLatestVideo = async () => {
    setIsLoadingVideo(true);
    try {
      // Get the most recently created recipe
      const { data: recipes, error: recipeError } = await supabase
        .from("recipes")
        .select("id, video_url, created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      if (recipeError) throw recipeError;
      if (!recipes || recipes.length === 0) return;

      setLatestVideo({
        id: recipes[0].id,
        url: recipes[0].video_url,
      });

      // Get the frames for this video
      const { data: videoFrames, error: framesError } = await supabase
        .from("video_frames")
        .select("id, image_url, timestamp")
        .eq("recipe_id", recipes[0].id)
        .order("timestamp", { ascending: true });

      if (framesError) throw framesError;
      setFrames(videoFrames || []);
    } catch (error) {
      console.error("Error fetching latest video:", error);
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const testFrameAnalysis = async () => {
    if (!frames.length || selectedFrameIndex >= frames.length) return;

    setIsTestingFrame(true);
    try {
      const response = await fetch("/api/admin/test-frame-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: frames[selectedFrameIndex].image_url,
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
    if (!latestVideo) return;

    setIsTestingRecipe(true);
    try {
      const response = await fetch("/api/admin/test-recipe-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: latestVideo.id,
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
    if (!frames.length || selectedFrameIndex >= frames.length) return;

    setIsTestingSocial(true);
    try {
      const response = await fetch("/api/admin/test-social-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: frames[selectedFrameIndex].image_url,
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

      {isLoadingVideo ? (
        <p>Loading latest video...</p>
      ) : !latestVideo ? (
        <>
          <p className="text-red-500">
            No videos found. Please upload a video first.
          </p>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={fetchLatestVideo}
          >
            Retry Loading
          </button>
        </>
      ) : (
        <>
          <div className="mb-6 p-4 border rounded bg-gray-50">
            <h2 className="text-xl font-semibold mb-2">Latest Video</h2>
            <p>
              <strong>Recipe ID:</strong> {latestVideo.id}
            </p>
            <p className="mb-2">
              <strong>Video URL:</strong>
              <a
                href={latestVideo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                {latestVideo.url}
              </a>
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">
              Frames ({frames.length})
            </h3>
            {frames.length > 0 ? (
              <div>
                <label htmlFor="frame-select">Select Frame:</label>
                <select
                  id="frame-select"
                  value={selectedFrameIndex}
                  onChange={(e) =>
                    setSelectedFrameIndex(Number(e.target.value))
                  }
                  className="ml-2 p-1 border rounded"
                >
                  {frames.map((frame, i) => (
                    <option key={frame.id} value={i}>
                      Frame {i + 1} (timestamp: {frame.timestamp}s)
                    </option>
                  ))}
                </select>

                {frames[selectedFrameIndex] && (
                  <div className="mt-3">
                    <img
                      src={frames[selectedFrameIndex].image_url}
                      alt={`Frame ${selectedFrameIndex + 1}`}
                      className="max-w-full h-auto max-h-64 mt-2"
                    />
                    <a
                      href={frames[selectedFrameIndex].image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline text-sm"
                    >
                      Open image in new tab
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p>No frames found for this video.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Frame Analysis Tester */}
            <div className="border rounded p-4">
              <h2 className="text-lg font-semibold mb-2">
                Frame Analysis Prompt
              </h2>
              <textarea
                value={framePrompt}
                onChange={(e) => setFramePrompt(e.target.value)}
                className="w-full h-48 p-2 border rounded font-mono text-sm"
              />
              <button
                onClick={testFrameAnalysis}
                disabled={isTestingFrame || frames.length === 0}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
              >
                {isTestingFrame ? "Testing..." : "Test Frame Analysis"}
              </button>

              <h3 className="mt-4 font-semibold">Result:</h3>
              <div className="mt-2 p-3 bg-gray-100 rounded min-h-20 whitespace-pre-wrap">
                {frameResult || "Run test to see results"}
              </div>
            </div>

            {/* Recipe Summary Tester */}
            <div className="border rounded p-4">
              <h2 className="text-lg font-semibold mb-2">
                Recipe Summary Prompt
              </h2>
              <textarea
                value={recipePrompt}
                onChange={(e) => setRecipePrompt(e.target.value)}
                className="w-full h-48 p-2 border rounded font-mono text-sm"
              />
              <button
                onClick={testRecipeSummary}
                disabled={isTestingRecipe || !latestVideo}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
              >
                {isTestingRecipe ? "Testing..." : "Test Recipe Summary"}
              </button>

              <h3 className="mt-4 font-semibold">Result:</h3>
              <div className="mt-2 p-3 bg-gray-100 rounded min-h-20 whitespace-pre-wrap">
                {recipeResult || "Run test to see results"}
              </div>
            </div>

            {/* Social Media Tester */}
            <div className="border rounded p-4">
              <h2 className="text-lg font-semibold mb-2">
                Social Media Detection Prompt
              </h2>
              <textarea
                value={socialPrompt}
                onChange={(e) => setSocialPrompt(e.target.value)}
                className="w-full h-48 p-2 border rounded font-mono text-sm"
              />
              <button
                onClick={testSocialDetection}
                disabled={isTestingSocial || frames.length === 0}
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
        </>
      )}
    </div>
  );
};

export default AdminSandbox;
