import React, { useState, useCallback, useEffect } from 'react';
import { Upload as UploadIcon, Loader2, X as CloseIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadVideo } from '../lib/storage';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';

interface UploadPreview {
  file: File;
  thumbnailUrl: string;
}

interface ProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: 'waiting' | 'current' | 'completed' | 'failed';
}

export default function Upload() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attribution, setAttribution] = useState({
    socialHandle: '',
    sourceUrl: '',
  });
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const navigate = useNavigate();

  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { id: 'upload', label: 'Uploading video', status: 'waiting' },
    { id: 'frames', label: 'Processing frames', status: 'waiting' },
    { id: 'analysis', label: 'Analyzing content', status: 'waiting' }
  ]);

  useEffect(() => {
    if (isUploading) {
      setProcessingSteps(steps => steps.map(step => ({
        ...step,
        status: step.id === 'upload' ? 'current' : 'waiting'
      })));
    } else if (processingStatus?.status === 'processing') {
      setProcessingSteps(steps => steps.map(step => ({
        ...step,
        status: step.id === 'upload' ? 'completed' : 
                step.id === 'frames' ? 'current' : 'waiting'
      })));
    } else if (processingStatus?.status === 'completed') {
      setProcessingSteps(steps => steps.map(step => ({
        ...step,
        status: 'completed'
      })));
    } else if (processingStatus?.status === 'failed') {
      setProcessingSteps(steps => steps.map(step => ({
        ...step,
        status: step.id === 'upload' ? 'completed' : 
                step.id === processingSteps.find(s => s.status === 'current')?.id ? 'failed' : 
                step.status === 'completed' ? 'completed' : 'waiting'
      })));
    }
  }, [isUploading, processingStatus]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    if (recipeId) {
      supabase
        .from('processing_queue')
        .select('status, error')
        .eq('recipe_id', recipeId)
        .single()
        .then(({ data, error: queryError }) => {
          if (!queryError && data) {
            setProcessingStatus({
              status: data.status,
              error: data.error
            });
          }
        });

      channel = supabase
        .channel(`processing_${recipeId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'processing_queue',
            filter: `recipe_id=eq.${recipeId}`
          },
          (payload) => {
            setProcessingStatus({
              status: payload.new.status,
              error: payload.new.error
            });

            if (payload.new.status === 'completed') {
              toast.success('Video processing completed!');
            } else if (payload.new.status === 'failed') {
              toast.error(`Processing failed: ${payload.new.error}`);
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [recipeId]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(e.type === 'dragenter' || e.type === 'dragover');
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
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (files?.length) {
      await handleFiles(Array.from(files));
    }
  }, []);

  const generateThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      };

      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        }
      };

      video.onerror = () => {
        reject(new Error('Error loading video'));
      };

      video.src = URL.createObjectURL(file);
      video.currentTime = 1;
    });
  };

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    
    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setError('File size must be less than 500MB');
      return;
    }

    try {
      const thumbnailUrl = await generateThumbnail(file);
      setPreview({ file, thumbnailUrl });
      
      setIsUploading(true);
      const result = await uploadVideo(file);
      setRecipeId(result.recipeId);
      setIsUploading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to process video');
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!recipeId) return;

    try {
      const { error: updateError } = await supabase
        .from('recipes')
        .update({
          title,
          description,
          attribution
        })
        .eq('id', recipeId);

      if (updateError) throw updateError;
      
      navigate(`/my-recipes/${recipeId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save recipe details');
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setTitle('');
    setDescription('');
    setError(null);
    setRecipeId(null);
    setProcessingStatus(null);
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
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                        ${step.status === 'waiting' ? 'bg-white/10' :
                          step.status === 'current' ? 'bg-orange-500/20' :
                          step.status === 'completed' ? 'bg-green-500/20' :
                          'bg-red-500/20'}`}
                      >
                        {step.status === 'waiting' ? (
                          <span className="w-3 h-3 bg-white/30 rounded-full" />
                        ) : step.status === 'current' ? (
                          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                        ) : step.status === 'completed' ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-red-500" />
                        )}
                      </div>
                      <div className="flex-grow">
                        <p className="text-lg font-medium text-white">{step.label}</p>
                      </div>
                    </div>
                    {index < processingSteps.length - 1 && (
                      <div className="absolute left-5 top-10 bottom-0 w-[1px] bg-white/10" />
                    )}
                  </div>
                ))}
              </div>

              {processingStatus?.status === 'failed' && (
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
          {processingStatus?.status === 'completed' ? (
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
                    <input
                      type="text"
                      placeholder="@username"
                      className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-black dark:text-white focus:border-black dark:focus:border-white focus:ring-0"
                      value={attribution.socialHandle}
                      onChange={(e) => setAttribution(prev => ({ ...prev, socialHandle: e.target.value }))}
                    />
                    <input
                      type="url"
                      placeholder="Original video URL"
                      className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-black dark:text-white focus:border-black dark:focus:border-white focus:ring-0"
                      value={attribution.sourceUrl}
                      onChange={(e) => setAttribution(prev => ({ ...prev, sourceUrl: e.target.value }))}
                    />
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
              ? 'border-orange-500 bg-orange-50/5'
              : 'border-gray-200 dark:border-dark-300'
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            <UploadIcon
              size={48}
              className={isDragging ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}
            />
            <p className="mt-4 text-lg tracking-wider text-black dark:text-white text-center">
              Drag and drop your video here, or{' '}
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
              Supported formats: MP4, MOV, AVI (max 500MB)
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