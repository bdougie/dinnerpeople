import React, { useState, useCallback, useEffect } from "react";
import {
  Upload as UploadIcon,
  Loader2,
  X as CloseIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { uploadVideo } from "../lib/storage";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import toast, { Toaster } from "react-hot-toast";
import { extractFrames } from "../lib/video";
import { ai } from "../lib/ai";
import { processSocialHandles } from "../lib/prompt-utils";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useUploadProgress, formatBytes, formatSpeed, formatTimeRemaining } from "../hooks/useUploadProgress";
import { subscribeToUploadProgress, type UploadProgressData } from "../lib/uploadWithRealtimeProgress";


interface UploadPreview {
  file: File;
  thumbnailUrl: string;
}

interface ProcessingStatus {
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: "waiting" | "current" | "completed" | "failed";
}

export default function Upload() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attribution, setAttribution] = useState({
    handle: "",
    original_url: "",
  });
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] =
    useState<ProcessingStatus | null>(null);
  const navigate = useNavigate();
  
  // Upload progress tracking
  const uploadProgress = useUploadProgress();
  const [uploadChannel, setUploadChannel] = useState<RealtimeChannel | null>(null);

  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { id: "upload", label: "Uploading video", status: "waiting" },
    { id: "frames", label: "Processing frames", status: "waiting" },
    { id: "analysis", label: "Analyzing content", status: "waiting" },
  ]);

  const [processingFrames, setProcessingFrames] = useState(false);
  const [frameProgress, setFrameProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (isUploading) {
      setProcessingSteps((steps) =>
        steps.map((step) => ({
          ...step,
          status: step.id === "upload" ? "current" : "waiting",
        }))
      );
    } else if (processingStatus?.status === "processing") {
      setProcessingSteps((steps) =>
        steps.map((step) => ({
          ...step,
          status:
            step.id === "upload"
              ? "completed"
              : step.id === "frames"
              ? "current"
              : "waiting",
        }))
      );
    } else if (processingStatus?.status === "completed") {
      setProcessingSteps((steps) =>
        steps.map((step) => ({
          ...step,
          status: "completed",
        }))
      );
    } else if (processingStatus?.status === "failed") {
      setProcessingSteps((steps) =>
        steps.map((step) => ({
          ...step,
          status:
            step.id === "upload"
              ? "completed"
              : step.id ===
                steps.find((s) => s.status === "current")?.id
              ? "failed"
              : step.status === "completed"
              ? "completed"
              : "waiting",
        }))
      );
    }
  }, [isUploading, processingStatus]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    if (recipeId) {
      console.log("[DEBUG] recipeId set, fetching processing status");

      supabase
        .from("processing_queue")
        .select("status, error")
        .eq("recipe_id", recipeId)
        .single()
        .then(({ data, error: queryError }) => {
          console.log("[DEBUG] Processing queue status query result:", {
            data,
            error: queryError,
          });
          if (!queryError && data) {
            console.log("[DEBUG] Setting processing status to:", data.status);
            setProcessingStatus({
              status: data.status,
              error: data.error,
            });
          } else {
            console.error(
              "[DEBUG] Error fetching processing status:",
              queryError
            );
          }
        });

      console.log(
        "[DEBUG] Setting up realtime subscription for processing updates"
      );
      channel = supabase
        .channel(`processing_${recipeId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "processing_queue",
            filter: `recipe_id=eq.${recipeId}`,
          },
          (payload) => {
            console.log("[DEBUG] Received realtime update:", payload);
            const newData = payload.new as { status?: string; error?: string };
            if (newData.status) {
              setProcessingStatus({
                status: newData.status as "pending" | "processing" | "completed" | "failed",
                error: newData.error,
              });
            }
            console.log(
              "[DEBUG] Updated processing status to:",
              newData.status
            );

            if (newData.status === "completed") {
              toast.success("Video processing completed!");
            } else if (newData.status === "failed") {
              toast.error(`Processing failed: ${newData.error}`);
            }
          }
        )
        .subscribe((status) => {
          console.log("[DEBUG] Subscription status:", status);
        });
    }

    return () => {
      if (channel) {
        console.log("[DEBUG] Cleaning up realtime subscription");
        supabase.removeChannel(channel);
      }
    };
  }, [recipeId]);

  useEffect(() => {
    if (
      processingStatus?.status === "processing" &&
      preview?.file &&
      recipeId &&
      !processingFrames
    ) {
      console.log(
        "[DEBUG] Processing status changed to processing, starting frame extraction"
      );
      processVideoFrames(preview.file, recipeId);
    }
  }, [processingStatus, preview, recipeId, processingFrames]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length) {
      await handleFiles(files);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const files = e.target.files;
      if (files?.length) {
        await handleFiles(Array.from(files));
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const generateThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      };

      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        }
      };

      video.onerror = () => {
        reject(new Error("Error loading video"));
      };

      video.src = URL.createObjectURL(file);
      video.currentTime = 1;
    });
  };

  const handleFiles = async (files: File[]) => {
    const file = files[0];

    if (!file) {
      setError("No file provided");
      return;
    }

    if (!file.type.startsWith("video/")) {
      setError("Please upload a video file");
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setError("File size must be less than 200MB");
      return;
    }

    try {
      console.log("[DEBUG] Starting thumbnail generation");
      const thumbnailUrl = await generateThumbnail(file);
      console.log("[DEBUG] Thumbnail generated successfully");

      setPreview({ file, thumbnailUrl });

      console.log("[DEBUG] Starting video upload to Supabase");
      setIsUploading(true);
      
      // Start upload progress tracking
      uploadProgress.startUpload(file.size);
      
      const result = await uploadVideo(file, thumbnailUrl); // Pass the thumbnail to the upload function
      console.log("[DEBUG] Upload completed, recipeId:", result.recipeId);
      setRecipeId(result.recipeId);
      console.log("[DEBUG] RecipeId state updated:", result.recipeId);
      
      // Subscribe to upload progress updates
      const channel = subscribeToUploadProgress(result.recipeId, (data: UploadProgressData) => {
        uploadProgress.updateProgress(data.bytes_uploaded);
        
        if (data.status === 'completed') {
          uploadProgress.completeUpload();
        } else if (data.status === 'failed') {
          uploadProgress.resetProgress();
          setError(data.error || 'Upload failed');
        }
      });
      setUploadChannel(channel);

      // Set initial processing status from upload result to avoid waiting for realtime updates
      if (result.processingStatus) {
        console.log(
          "[DEBUG] Setting initial processing status from upload result:",
          result.processingStatus
        );
        setProcessingStatus({
          status: result.processingStatus as
            | "pending"
            | "processing"
            | "completed"
            | "failed",
        });
      }

      setIsUploading(false);
      console.log("[DEBUG] Upload state set to false");
    } catch (err) {
      console.error("[DEBUG] Upload error:", err);

      const errorMsg = err instanceof Error ? err.message : "Failed to process video";
      
      // Check for payload too large error
      if (
        errorMsg.includes("payload too large") ||
        errorMsg.includes("request entity too large") ||
        errorMsg.includes("413") ||
        errorMsg.includes("size limit")
      ) {
        const errorMessage =
          "Your video file is too large for upload. Please compress or resize it to a smaller file size.";
        setError(errorMessage);
        toast.error(errorMessage, {
          duration: 6000,
          icon: "⚠️",
        });
      } else {
        setError(errorMsg);
        toast.error(errorMsg);
      }

      setIsUploading(false);
    }
  };

  const processVideoFrames = async (videoFile: File, recipeId: string) => {
    try {
      setProcessingFrames(true);
      console.log("[DEBUG] Starting frame extraction");

      // Get current user to verify permissions
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("User not authenticated");
      }

      // Verify the recipe belongs to the current user
      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .select("user_id")
        .eq("id", recipeId)
        .single();

      if (recipeError) {
        console.error("[DEBUG] Error verifying recipe ownership:", recipeError);
        throw new Error("Could not verify recipe ownership");
      }

      if (recipeData.user_id !== userData.user.id) {
        throw new Error("Not authorized to process this recipe");
      }

      // Extract frames from the video
      const frames = await extractFrames(videoFile);
      console.log(`[DEBUG] Extracted ${frames.length} frames from video`);
      setFrameProgress({ current: 0, total: frames.length });

      // Upload frames to Supabase
      console.log("[DEBUG] Starting frame uploads");
      const uploadedFrames = [];

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        if (!frame) continue;

        // Upload individual frame
        const path = `${userData.user.id}/${recipeId}/${frame.timestamp}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("frames")
          .upload(path, frame.blob);

        if (uploadError) {
          console.error(`[DEBUG] Error uploading frame ${i}:`, uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("frames")
          .getPublicUrl(path);

        uploadedFrames.push({
          timestamp: frame.timestamp,
          imageUrl: urlData.publicUrl,
        });

        // Update progress
        setFrameProgress((prev) => ({
          ...prev,
          current: i + 1,
        }));
      }

      console.log(
        `[DEBUG] Successfully uploaded ${uploadedFrames.length} frames`
      );

      // Update processing steps to show "analysis" as current
      setProcessingSteps((steps) =>
        steps.map((step) => ({
          ...step,
          status:
            step.id === "upload"
              ? "completed"
              : step.id === "frames"
              ? "completed"
              : step.id === "analysis"
              ? "current"
              : "waiting",
        }))
      );

      console.log("[DEBUG] Processing frames and generating descriptions");
      // Process frames using the environment-appropriate AI service
      await ai.processVideoFrames(recipeId, uploadedFrames);

      console.log(
        "[DEBUG] Frame processing complete, generating recipe summary"
      );

      // Generate recipe title and description based on processed frames
      try {
        await ai.updateRecipeWithSummary(recipeId);
        console.log("[DEBUG] Recipe summary generated and updated");
      } catch (summaryError) {
        console.error("[DEBUG] Error generating recipe summary:", summaryError);
        // Continue even if summary generation fails
      }

      // Extract and process social handles
      try {
        const socialHandles = await processSocialHandles(
          recipeId,
          // Fix: Bind the method to the ai instance or use an arrow function
          (imageUrl, customPrompt) => ai.analyzeFrame(imageUrl, customPrompt)
        );
        console.log(
          "[DEBUG] Social handles extracted and processed:",
          socialHandles
        );
      } catch (socialError) {
        console.error("[DEBUG] Error processing social handles:", socialError);
        // Continue even if social handle extraction fails
      }

      // Update processing status to completed
      const { error: updateError } = await supabase
        .from("processing_queue")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("recipe_id", recipeId);

      if (updateError) {
        console.error("[DEBUG] Error updating processing status:", updateError);
        throw updateError;
      }

      // Update the processing status in the UI
      setProcessingStatus({
        status: "completed",
      });

      toast.success("Video processing completed successfully!");

      // Fetch the generated title and description to update the UI
      const { data: updatedRecipeData } = await supabase
        .from("recipes")
        .select("title, description, attribution")
        .eq("id", recipeId)
        .single();

      if (updatedRecipeData) {
        setTitle(updatedRecipeData.title);
        setDescription(updatedRecipeData.description);
        // Only set attribution if it exists
        if (updatedRecipeData.attribution) {
          setAttribution({
            handle: updatedRecipeData.attribution.handle || "",
            original_url: updatedRecipeData.attribution.original_url || "",
          });
        }
      }
    } catch (err) {
      console.error("[DEBUG] Error processing frames:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Error processing video frames: ${errorMsg}`);

      // Update processing status to failed
      try {
        await supabase
          .from("processing_queue")
          .update({
            status: "failed",
            error: `Frame processing failed: ${errorMsg}`,
          })
          .eq("recipe_id", recipeId);

        // Update UI status
        setProcessingStatus({
          status: "failed",
          error: `Frame processing failed: ${errorMsg}`,
        });
      } catch (updateErr) {
        console.error("[DEBUG] Error updating failure status:", updateErr);
      }
    } finally {
      setProcessingFrames(false);
    }
  };

  // Add a useEffect that will check processing status periodically if realtime updates fail
  useEffect(() => {
    let interval: number | undefined;

    // If we have a recipeId but no processing status or still in pending state,
    // set up a polling mechanism as a fallback
    if (
      recipeId &&
      (!processingStatus || processingStatus.status === "pending")
    ) {
      console.log("[DEBUG] Setting up fallback polling for processing status");

      interval = window.setInterval(() => {
        console.log("[DEBUG] Polling for processing status");
        supabase
          .from("processing_queue")
          .select("status, error")
          .eq("recipe_id", recipeId)
          .single()
          .then(({ data, error }) => {
            if (!error && data && data.status !== processingStatus?.status) {
              console.log("[DEBUG] Polling found updated status:", data.status);
              setProcessingStatus({
                status: data.status,
                error: data.error,
              });

              // If we got a completed or failed status, we can stop polling
              if (data.status === "completed" || data.status === "failed") {
                if (interval) {
                  clearInterval(interval);
                }
              }
            }
          });
      }, 3000); // Check every 3 seconds
    }

    // If we have processingStatus and it's not pending, we can stop polling
    if (processingStatus && processingStatus.status !== "pending" && interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [recipeId, processingStatus]);

  const handleSave = async () => {
    if (!recipeId) return;

    // Validate URLs
    const socialUrl = attribution.handle.trim();
    const videoUrl = attribution.original_url.trim();

    // Basic URL validation
    const urlPattern =
      /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/;

    if (socialUrl && !urlPattern.test(socialUrl)) {
      setError(
        "Please enter a valid social media URL (e.g., https://www.instagram.com/username/)"
      );
      return;
    }

    if (videoUrl && !urlPattern.test(videoUrl)) {
      setError("Please enter a valid video URL");
      return;
    }

    try {
      const formattedAttribution = {
        handle: socialUrl,
        original_url: videoUrl,
      };

      const { error: updateError } = await supabase
        .from("recipes")
        .update({
          title,
          description,
          attribution: formattedAttribution,
        })
        .eq("id", recipeId);

      if (updateError) throw updateError;

      navigate(`/my-recipes/${recipeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recipe details");
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setTitle("");
    setDescription("");
    setError(null);
    setRecipeId(null);
    setProcessingStatus(null);
    uploadProgress.resetProgress();
    
    // Clean up upload channel
    if (uploadChannel) {
      supabase.removeChannel(uploadChannel);
      setUploadChannel(null);
    }
  };

  const renderProcessingStatus = () => {
    return (
      <div className="bg-white dark:bg-dark-100 rounded-lg overflow-hidden">
        <div className="aspect-[9/12] relative">
          <img
            src={preview?.thumbnailUrl}
            alt="Video thumbnail"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="w-full max-w-md p-6">
              <div className="space-y-6">
                {processingSteps.map((step, index) => (
                  <div key={step.id} className="relative">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                        ${
                          step.status === "waiting"
                            ? "bg-white/10"
                            : step.status === "current"
                            ? "bg-orange-500/20"
                            : step.status === "completed"
                            ? "bg-green-500/20"
                            : "bg-red-500/20"
                        }`}
                      >
                        {step.status === "waiting" ? (
                          <span className="w-3 h-3 bg-white/30 rounded-full" />
                        ) : step.status === "current" ? (
                          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                        ) : step.status === "completed" ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-red-500" />
                        )}
                      </div>
                      <div className="flex-grow">
                        <p className="text-lg font-medium text-white">
                          {step.label}
                          {step.id === "frames" &&
                            processingFrames &&
                            frameProgress.total > 0 && (
                              <span className="ml-2 text-sm font-normal">
                                ({frameProgress.current}/{frameProgress.total})
                              </span>
                            )}
                        </p>

                        {/* Add progress bar and details for upload step */}
                        {step.id === "upload" && step.status === "current" && (
                          <>
                            <div className="mt-2 space-y-1">
                              <div className="flex justify-between text-sm text-white/80">
                                <span>{formatBytes(uploadProgress.progress.bytesUploaded)} of {formatBytes(uploadProgress.progress.totalBytes)}</span>
                                <span>{uploadProgress.progress.percentage.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-white/10 rounded-full h-2">
                                <div
                                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${uploadProgress.progress.percentage}%`,
                                  }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-white/60">
                                <span>{formatSpeed(uploadProgress.progress.speed)}</span>
                                <span>{formatTimeRemaining(uploadProgress.progress.timeRemaining)}</span>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Add progress bar for frames step */}
                        {step.id === "frames" &&
                          step.status === "current" &&
                          frameProgress.total > 0 && (
                            <div className="mt-1 w-full bg-white/10 rounded-full h-1.5">
                              <div
                                className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                                style={{
                                  width: `${
                                    (frameProgress.current /
                                      frameProgress.total) *
                                    100
                                  }%`,
                                }}
                              ></div>
                            </div>
                          )}
                      </div>
                    </div>
                    {index < processingSteps.length - 1 && (
                      <div className="absolute left-5 top-10 bottom-0 w-[1px] bg-white/10" />
                    )}
                  </div>
                ))}
              </div>

              {processingStatus?.status === "failed" && (
                <div className="mt-8 text-center">
                  <p className="text-red-400">{processingStatus.error}</p>
                  <button
                    onClick={clearPreview}
                    className="mt-4 px-6 py-2 text-sm font-medium tracking-wider uppercase text-white border border-white/20 hover:bg-white/10 transition-colors rounded-full"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Toaster position="top-center" />

      <div className="text-center space-y-2">
        <h1 className="text-3xl tracking-wider uppercase text-black dark:text-white">
          Share Your Recipe
        </h1>
        <p className="text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400">
          Upload a cooking video to share with the community
        </p>
      </div>

      {preview ? (
        <div className="space-y-6">
          {processingStatus?.status === "completed" ? (
            <div className="space-y-6">
              <div className="aspect-[9/12] relative">
                <img
                  src={preview.thumbnailUrl}
                  alt="Video thumbnail"
                  className="absolute inset-0 w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={clearPreview}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                >
                  <CloseIcon size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-2">
                    Recipe Title
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-black dark:text-white focus:border-black dark:focus:border-white focus:ring-0"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your recipe a name"
                  />
                </div>

                <div>
                  <label className="block text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-black dark:text-white focus:border-black dark:focus:border-white focus:ring-0"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your recipe"
                  />
                </div>

                <div>
                  <h3 className="text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-4">
                    Attribution (Optional)
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="social"
                        className="block text-sm text-gray-500 dark:text-gray-400 mb-1"
                      >
                        Social Media URL
                      </label>
                      <input
                        type="url"
                        id="social"
                        placeholder="https://www.instagram.com/username/"
                        className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-black dark:text-white focus:border-black dark:focus:border-white focus:ring-0"
                        value={attribution.handle}
                        onChange={(e) =>
                          setAttribution((prev) => ({
                            ...prev,
                            handle: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="videoUrl"
                        className="block text-sm text-gray-500 dark:text-gray-400 mb-1"
                      >
                        Original Video URL
                      </label>
                      <input
                        type="url"
                        id="videoUrl"
                        placeholder="https://www.example.com/original-video"
                        className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-black dark:text-white focus:border-black dark:focus:border-white focus:ring-0"
                        value={attribution.original_url}
                        onChange={(e) =>
                          setAttribution((prev) => ({
                            ...prev,
                            original_url: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={clearPreview}
                  className="px-6 py-2 text-sm tracking-wider uppercase text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!title.trim()}
                  className="px-6 py-2 text-sm tracking-wider uppercase border border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save Recipe
                </button>
              </div>
            </div>
          ) : (
            renderProcessingStatus()
          )}
        </div>
      ) : (
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`aspect-[9/12] relative border-2 border-dashed rounded-lg ${
            isDragging
              ? "border-orange-500 bg-orange-50/5"
              : "border-gray-200 dark:border-dark-300"
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            <UploadIcon
              size={48}
              className={
                isDragging
                  ? "text-orange-500"
                  : "text-gray-400 dark:text-gray-500"
              }
            />
            <p className="mt-4 text-lg tracking-wider text-black dark:text-white text-center">
              Drag and drop your video here, or{" "}
              <label className="text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 cursor-pointer">
                browse
                <input
                  type="file"
                  className="hidden"
                  accept="video/*"
                  onChange={handleFileSelect}
                />
              </label>
            </p>
            <p className="mt-2 text-sm tracking-wider text-gray-500 dark:text-gray-400">
              Supported formats: MP4, MOV, AVI (max 200MB)
            </p>
          </div>

          {error && (
            <div className="absolute bottom-6 left-0 right-0 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
