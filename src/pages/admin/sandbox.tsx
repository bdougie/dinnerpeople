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

  // Add a state for the correct video URL column name
  const [videoUrlColumn, setVideoUrlColumn] = useState<string | null>(null);
  // Add state to track column discovery errors
  const [columnDiscoveryError, setColumnDiscoveryError] = useState<
    string | null
  >(null);

  // Add state for debugging storage
  const [storageDebug, setStorageDebug] = useState<{
    files: any[];
    paths: string[];
    loading: boolean;
  }>({
    files: [],
    paths: [],
    loading: false,
  });

  // Add state for bucket ID
  const [bucketId, setBucketId] = useState<string>(
    "bfd7be67-4135-47c6-af37-70e50630bb10"
  );
  const [bucketIdInput, setBucketIdInput] = useState<string>(
    "bfd7be67-4135-47c6-af37-70e50630bb10"
  );

  useEffect(() => {
    // First discover the correct column name, then fetch the video
    discoverVideoUrlColumn().then((column) => {
      if (column) {
        console.log(
          "Column discovered, now fetching video with column:",
          column
        );
        fetchLatestVideo();
      }
    });
  }, []);

  // Enhanced debugging useEffect
  useEffect(() => {
    const debugVideos = async () => {
      // Wait for column discovery
      if (!videoUrlColumn) {
        console.log("No video URL column found yet, skipping debug");
        return;
      }

      console.log("Debugging videos issue with column:", videoUrlColumn);

      // 1. Check storage for videos with expanded debugging
      setStorageDebug((prev) => ({ ...prev, loading: true }));

      const { data: storageFiles } = await supabase.storage
        .from("videos")
        .list();
      console.log("Storage videos at root level:", storageFiles);

      // Store all found files for debugging
      const allPaths: string[] = [];
      const allFiles: any[] = [];

      if (storageFiles && storageFiles.length > 0) {
        // Add root level files
        storageFiles.forEach((file) => {
          if (!file.metadata?.is_dir) {
            allFiles.push(file);
            allPaths.push(file.name);
          }
        });

        // Recursively check subdirectories
        for (const item of storageFiles) {
          if (item.metadata?.is_dir) {
            console.log(`Checking directory: ${item.name}`);
            const { data: subFiles } = await supabase.storage
              .from("videos")
              .list(item.name);

            console.log(`Files in ${item.name}:`, subFiles);

            if (subFiles) {
              subFiles.forEach((subFile) => {
                allFiles.push(subFile);
                allPaths.push(`${item.name}/${subFile.name}`);
              });

              // Check one level deeper if needed
              for (const subItem of subFiles) {
                if (subItem.metadata?.is_dir) {
                  const { data: subSubFiles } = await supabase.storage
                    .from("videos")
                    .list(`${item.name}/${subItem.name}`);

                  console.log(
                    `Files in ${item.name}/${subItem.name}:`,
                    subSubFiles
                  );

                  if (subSubFiles) {
                    subSubFiles.forEach((subSubFile) => {
                      allFiles.push(subSubFile);
                      allPaths.push(
                        `${item.name}/${subItem.name}/${subSubFile.name}`
                      );
                    });
                  }
                }
              }
            }
          }
        }
      }

      setStorageDebug({
        files: allFiles,
        paths: allPaths,
        loading: false,
      });

      try {
        // 2. Check recipes table using the discovered column name
        const { data: recipes, error } = await supabase
          .from("recipes")
          .select(`id, ${videoUrlColumn}, created_at, title`);

        if (error) {
          console.error("Error checking recipes:", error);
          // If we get a column error, try another approach
          if (error.code === "42703") {
            console.log("Column doesn't exist, trying to rediscover...");
            discoverVideoUrlColumn(true); // Force rediscovery
            return;
          }
          throw error;
        }

        console.log("Recipes in database:", recipes);

        // 3. If recipes exist but don't have video URL, update them
        if (
          storageFiles?.length &&
          (!recipes?.length || !recipes[0]?.[videoUrlColumn])
        ) {
          console.log(
            "Found videos in storage but not in recipes table. Creating links..."
          );

          // For each video in storage, ensure a recipe record exists
          for (const file of storageFiles) {
            // Get the public URL
            const { data: urlData } = supabase.storage
              .from("videos")
              .getPublicUrl(file.name);

            // Create or update a recipe record
            const recipeData: any = {
              title: `Video: ${file.name}`,
              user_id: (await supabase.auth.getUser()).data.user?.id, // Make sure user_id is set
              created_at: new Date().toISOString(),
            };
            recipeData[videoUrlColumn] = urlData.publicUrl;

            const { error: upsertError } = await supabase
              .from("recipes")
              .upsert(recipeData);
            if (upsertError) {
              console.error("Error upserting recipe:", upsertError);
            }
          }

          // Now try loading again
          fetchLatestVideo();
        }
      } catch (err) {
        console.error("Error in debugVideos:", err);
      }
    };

    if (videoUrlColumn) {
      debugVideos();
    }
  }, [videoUrlColumn]);

  // New function to discover the correct column name for video URLs
  const discoverVideoUrlColumn = async (forceRediscover = false) => {
    if (videoUrlColumn && !forceRediscover) {
      console.log("Already have videoUrlColumn:", videoUrlColumn);
      return videoUrlColumn;
    }

    try {
      setColumnDiscoveryError(null);
      console.log("Starting column discovery process");

      // First, check table structure with introspection
      const { data: columnsData, error: columnsError } = await supabase.rpc(
        "get_table_columns",
        { table_name: "recipes" }
      );

      if (!columnsError && columnsData) {
        console.log("Table columns from RPC:", columnsData);
        // Look for video URL column in the returned columns
        const columns = columnsData.map((col: any) => col.column_name);
        // Rest of discovery logic...
      } else {
        console.log("RPC not available, using alternative method");
      }

      // Query a single row just to see column names
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .limit(1);

      if (error) {
        console.error("Error fetching sample row:", error);
        throw error;
      }

      // Check common column names for video URL
      const possibleColumns = [
        "video_url",
        "url",
        "video_uri",
        "uri",
        "video",
        "media_url",
        "video_path",
        "media",
        "media_path",
        "thumbnail_url", // Sometimes this contains the video path
      ];
      const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

      console.log("Available columns in recipes table:", columns);

      // Find the first matching column name
      const videoColumn = possibleColumns.find((col) => columns.includes(col));

      if (videoColumn) {
        console.log(`Found video URL column: ${videoColumn}`);
        setVideoUrlColumn(videoColumn);
        return videoColumn;
      } else if (columns.length > 0) {
        // If we have columns but none match expected names, try to find anything URL-like
        const urlLikeColumn = columns.find(
          (col) =>
            col.toLowerCase().includes("url") ||
            col.toLowerCase().includes("uri") ||
            col.toLowerCase().includes("link") ||
            col.toLowerCase().includes("path")
        );

        if (urlLikeColumn) {
          console.log(`Found URL-like column: ${urlLikeColumn}`);
          setVideoUrlColumn(urlLikeColumn);
          return urlLikeColumn;
        }

        // Create migration script suggestion
        const migrationScript = `
-- Add missing video_url column to recipes table
ALTER TABLE recipes ADD COLUMN video_url text;`;
        console.log(
          "No video URL column found. Consider running this migration:"
        );
        console.log(migrationScript);

        // Fallback to a hardcoded column name as last resort
        console.warn("Using 'url' as fallback column name");
        setVideoUrlColumn("url");
        setColumnDiscoveryError(
          "No suitable video URL column found in recipes table."
        );
        return "url";
      } else {
        console.error("No columns found in recipes table or table is empty");
        setVideoUrlColumn("url"); // Fallback
        setColumnDiscoveryError(
          "No columns found in recipes table or table is empty"
        );
        return "url";
      }
    } catch (error) {
      console.error("Error discovering columns:", error);
      // Fallback to a default
      setVideoUrlColumn("url");
      setColumnDiscoveryError(`Error discovering columns: ${error.message}`);
      return "url";
    }
  };

  // Helper function to format storage URLs correctly with bucket ID
  const formatStorageUrl = (url: string): string => {
    // If it's already a full URL, check if it has the bucket ID and add if missing
    if (url.startsWith("http")) {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");

      // Check if the URL already has the bucket ID path segment
      if (pathParts.includes(bucketId)) {
        return url;
      }

      // Find where the "videos" part is in the path
      const videosIndex = pathParts.findIndex((part) => part === "videos");
      if (videosIndex >= 0 && videosIndex < pathParts.length - 1) {
        // Insert bucket ID after "videos" if it's not already there
        if (pathParts[videosIndex + 1] !== bucketId) {
          pathParts.splice(videosIndex + 1, 0, bucketId);
          urlObj.pathname = pathParts.join("/");
          return urlObj.toString();
        }
      }
      return url;
    }

    // If it's a storage key/path
    if (url.includes("/")) {
      // Get the project URL from the supabase client
      const projectUrl = supabase.supabaseUrl;

      // Check if the path already has the bucket ID
      if (url.includes(bucketId)) {
        return `${projectUrl}/storage/v1/object/public/videos/${url}`;
      }

      // Add bucket ID to the path
      return `${projectUrl}/storage/v1/object/public/videos/${bucketId}/${url}`;
    }

    // If it's just a file name, assume it's in the videos bucket under the bucket ID
    return `${supabase.supabaseUrl}/storage/v1/object/public/videos/${bucketId}/${url}`;
  };

  // Function specifically for finding video files in storage
  const findVideoInStorage = async (
    recipeId: string
  ): Promise<string | null> => {
    console.log(`Looking for video files for recipe ${recipeId}`);

    // First check if video exists under bucket ID with recipe ID
    try {
      const { data: urlData } = supabase.storage
        .from("videos")
        .getPublicUrl(`${bucketId}/${recipeId}.mp4`);

      const checkUrl = urlData.publicUrl;
      console.log(`Checking path with bucket ID: ${checkUrl}`);

      // Try to verify if URL exists
      const response = await fetch(checkUrl, { method: "HEAD" });
      if (response.ok) {
        console.log(`Found valid video at ${checkUrl}`);
        return checkUrl;
      }
    } catch (e) {
      console.log("Error checking bucket path:", e);
    }

    // Check with direct recipe ID (without bucket ID) as fallback
    try {
      const { data: urlData } = supabase.storage
        .from("videos")
        .getPublicUrl(`${recipeId}.mp4`);

      const checkUrl = urlData.publicUrl;
      console.log(`Checking direct recipe ID path: ${checkUrl}`);

      // Try to verify if URL exists
      const response = await fetch(checkUrl, { method: "HEAD" });
      if (response.ok) {
        console.log(`Found valid video at ${checkUrl}`);
        // Format to ensure bucket ID is included
        return formatStorageUrl(checkUrl);
      }
    } catch (e) {
      console.log("Error checking direct recipe path:", e);
    }

    // Try to list all files in the bucket/folder with recipe ID
    try {
      const { data: files } = await supabase.storage
        .from("videos")
        .list(recipeId);

      console.log(`Files in recipe folder ${recipeId}:`, files);

      if (files && files.length > 0) {
        // Look for mp4 files first
        const videoFile = files.find(
          (f) =>
            f.name.toLowerCase().endsWith(".mp4") ||
            f.name.toLowerCase().endsWith(".mov") ||
            f.name.toLowerCase().endsWith(".webm")
        );

        if (videoFile) {
          const { data: urlData } = supabase.storage
            .from("videos")
            .getPublicUrl(`${recipeId}/${videoFile.name}`);

          console.log(`Found video file: ${urlData.publicUrl}`);
          return urlData.publicUrl;
        } else {
          // If no video file found, check subdirectories
          for (const item of files) {
            if (item.metadata?.is_dir) {
              const { data: subFiles } = await supabase.storage
                .from("videos")
                .list(`${recipeId}/${item.name}`);

              if (subFiles) {
                const subVideoFile = subFiles.find(
                  (f) =>
                    f.name.toLowerCase().endsWith(".mp4") ||
                    f.name.toLowerCase().endsWith(".mov") ||
                    f.name.toLowerCase().endsWith(".webm")
                );

                if (subVideoFile) {
                  const { data: urlData } = supabase.storage
                    .from("videos")
                    .getPublicUrl(
                      `${recipeId}/${item.name}/${subVideoFile.name}`
                    );

                  console.log(`Found video in subfolder: ${urlData.publicUrl}`);
                  return urlData.publicUrl;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.log("Error listing files in recipe folder:", e);
    }

    // Last resort - check all storage files for matching recipe ID in the path
    try {
      const { data: allFiles } = await supabase.storage.from("videos").list();

      if (allFiles) {
        for (const file of allFiles) {
          if (
            file.name.includes(recipeId) &&
            (file.name.toLowerCase().endsWith(".mp4") ||
              file.name.toLowerCase().endsWith(".mov") ||
              file.name.toLowerCase().endsWith(".webm"))
          ) {
            const { data: urlData } = supabase.storage
              .from("videos")
              .getPublicUrl(file.name);

            console.log(
              `Found video containing recipe ID: ${urlData.publicUrl}`
            );
            return urlData.publicUrl;
          }
        }
      }
    } catch (e) {
      console.log("Error searching all files:", e);
    }

    return null;
  };

  const fetchLatestVideo = async () => {
    // Don't proceed if we don't know the column name yet
    if (!videoUrlColumn) {
      console.log("No videoUrlColumn set, can't fetch video");
      return;
    }

    setIsLoadingVideo(true);
    try {
      console.log(`Fetching latest video using column: ${videoUrlColumn}`);

      // Get the most recently created recipe
      const { data: recipes, error: recipeError } = await supabase
        .from("recipes")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      if (recipeError) {
        console.error("Error fetching recipes:", recipeError);
        throw recipeError;
      }

      if (!recipes || recipes.length === 0) {
        console.log("No recipes found");
        return;
      }

      // Now get the specific recipe with the video URL column
      const { data: recipeWithUrl, error: urlError } = await supabase
        .from("recipes")
        .select(`id, ${videoUrlColumn}, created_at`)
        .eq("id", recipes[0].id)
        .single();

      if (urlError) {
        console.error("Error fetching recipe with URL:", urlError);
        throw urlError;
      }

      // If no video URL is found in the database, try to get it from storage
      let videoUrl = recipeWithUrl[videoUrlColumn];
      console.log(`URL from database: ${videoUrl}`);

      // If no URL found or URL seems incomplete, try to find it in storage
      if (!videoUrl || !videoUrl.includes(".mp4")) {
        console.log("URL missing or incomplete, attempting to find in storage");
        const storageUrl = await findVideoInStorage(recipeWithUrl.id);

        if (storageUrl) {
          videoUrl = storageUrl;
          console.log("Found URL in storage:", videoUrl);

          // Optionally update the recipe with the correct URL
          try {
            const updateData: any = {};
            updateData[videoUrlColumn] = videoUrl;

            const { error: updateError } = await supabase
              .from("recipes")
              .update(updateData)
              .eq("id", recipeWithUrl.id);

            if (updateError) {
              console.error(
                "Error updating recipe with correct URL:",
                updateError
              );
            } else {
              console.log("Updated recipe with correct video URL");
            }
          } catch (e) {
            console.error("Error updating recipe:", e);
          }
        }
      } else {
        // Ensure the URL is properly formatted
        videoUrl = formatStorageUrl(videoUrl);
      }

      setLatestVideo({
        id: recipeWithUrl.id,
        url: videoUrl || "No URL available", // Handle null values
      });

      // Get the frames for this video
      const { data: videoFrames, error: framesError } = await supabase
        .from("video_frames")
        .select("id, image_url, timestamp")
        .eq("recipe_id", recipeWithUrl.id)
        .order("timestamp", { ascending: true });

      if (framesError) {
        console.error("Error fetching frames:", framesError);
        throw framesError;
      }

      setFrames(videoFrames || []);
    } catch (error) {
      console.error("Error fetching latest video:", error);
    } finally {
      setIsLoadingVideo(false);
    }
  };

  // Debug function to manually check a specific path
  const checkSpecificPath = async (path: string) => {
    try {
      const { data: urlData } = supabase.storage
        .from("videos")
        .getPublicUrl(path);

      window.open(urlData.publicUrl, "_blank");
    } catch (e) {
      console.error("Error checking path:", e);
      alert(`Error checking path: ${e.message}`);
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

      {/* Add bucket ID configuration */}
      <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded">
        <div className="flex items-center">
          <label className="font-medium mr-2">Bucket ID:</label>
          <input
            type="text"
            value={bucketIdInput}
            onChange={(e) => setBucketIdInput(e.target.value)}
            className="flex-1 p-1 border rounded"
            placeholder="Enter bucket ID"
          />
          <button
            onClick={() => {
              setBucketId(bucketIdInput);
              fetchLatestVideo(); // Refresh with new bucket ID
            }}
            className="ml-2 px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            Update
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Current: {bucketId || "Not set"}
        </p>
      </div>

      {columnDiscoveryError && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
          <p>
            <strong>Column Discovery Warning:</strong> {columnDiscoveryError}
          </p>
          <p className="text-sm mt-1">
            This might cause issues with video loading.
          </p>
        </div>
      )}

      {isLoadingVideo ? (
        <p>Loading latest video...</p>
      ) : !latestVideo ? (
        <>
          <p className="text-red-500">
            No videos found. Please upload a video first.
          </p>
          <div className="mt-4 space-y-2">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={fetchLatestVideo}
            >
              Retry Loading
            </button>
            <button
              className="ml-2 px-4 py-2 bg-gray-500 text-white rounded"
              onClick={() => discoverVideoUrlColumn(true)}
            >
              Re-discover Column
            </button>
          </div>
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
              {latestVideo.url ? (
                <>
                  <a
                    href={latestVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline ml-1"
                  >
                    {latestVideo.url.length > 60
                      ? latestVideo.url.substring(0, 60) + "..."
                      : latestVideo.url}
                  </a>
                  <button
                    onClick={() => {
                      // Try reformatting the URL with current bucket ID
                      const reformattedUrl = formatStorageUrl(latestVideo.url);
                      setLatestVideo({
                        ...latestVideo,
                        url: reformattedUrl,
                      });
                    }}
                    className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded"
                  >
                    Fix URL
                  </button>
                </>
              ) : (
                <span className="text-red-500 ml-1">No URL available</span>
              )}
            </p>
            <div className="mt-4">
              <strong>Video Preview:</strong>
              {latestVideo.url ? (
                <div className="mt-2">
                  <video
                    src={latestVideo.url}
                    controls
                    className="max-w-full h-auto"
                    style={{ maxHeight: "300px" }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <p className="text-red-500 mt-1">
                  No video available to preview
                </p>
              )}
            </div>

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

      {/* Storage Debugging Section */}
      {storageDebug.files.length > 0 && (
        <div className="mt-8 p-4 border rounded bg-gray-100">
          <h2 className="text-xl font-semibold mb-2">Storage Debug</h2>
          <p>{storageDebug.paths.length} files found in storage</p>
          <div className="mt-2 max-h-64 overflow-auto">
            <ul className="list-disc pl-5">
              {storageDebug.paths.map((path, i) => (
                <li key={i} className="text-sm">
                  {path}{" "}
                  <button
                    onClick={() => checkSpecificPath(path)}
                    className="text-blue-500 text-xs"
                  >
                    Check
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSandbox;
