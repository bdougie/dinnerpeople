import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useUploadsInProgress, useUploadContext } from '../contexts/UploadContext';
import { formatBytes, formatSpeed, formatTimeRemaining } from '../hooks/useUploadProgress';
import { useNavigate } from 'react-router-dom';

export function UploadStatusIndicator() {
  const uploadsInProgress = useUploadsInProgress();
  const { removeUpload, setActiveUpload } = useUploadContext();
  const navigate = useNavigate();

  if (uploadsInProgress.length === 0) {
    return null;
  }

  const handleClick = (recipeId: string) => {
    setActiveUpload(recipeId);
    navigate('/upload');
  };

  const handleDismiss = (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeUpload(recipeId);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 right-4 z-50 space-y-2"
      >
        {uploadsInProgress.map((upload) => (
          <motion.div
            key={upload.recipeId}
            layout
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            onClick={() => handleClick(upload.recipeId)}
            className="bg-white dark:bg-dark-100 rounded-lg shadow-lg p-4 cursor-pointer hover:shadow-xl transition-shadow min-w-[320px]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={`mt-1 ${getIconColor(upload.status)}`}>
                  {getStatusIcon(upload.status)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {upload.fileName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {getStatusText(upload.status)}
                  </p>
                  
                  {/* Progress bar */}
                  {(upload.status === 'uploading' || upload.status === 'compressing') && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>{upload.progress.percentage.toFixed(0)}%</span>
                        <span>{formatTimeRemaining(upload.progress.timeRemaining)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-dark-300 rounded-full h-1.5">
                        <div
                          className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${upload.progress.percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>
                          {formatBytes(upload.progress.bytesUploaded)} / {formatBytes(upload.progress.totalBytes)}
                        </span>
                        <span>{formatSpeed(upload.progress.speed)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={(e) => handleDismiss(upload.recipeId, e)}
                className="ml-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'compressing':
    case 'uploading':
      return <Upload size={20} className="animate-pulse" />;
    case 'processing':
      return <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />;
    case 'completed':
      return <CheckCircle size={20} />;
    case 'failed':
      return <AlertCircle size={20} />;
    default:
      return <Upload size={20} />;
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'compressing':
      return 'Optimizing video...';
    case 'uploading':
      return 'Uploading...';
    case 'processing':
      return 'Processing frames...';
    case 'completed':
      return 'Upload complete!';
    case 'failed':
      return 'Upload failed';
    default:
      return 'Preparing...';
  }
}

function getIconColor(status: string) {
  switch (status) {
    case 'completed':
      return 'text-green-500';
    case 'failed':
      return 'text-red-500';
    default:
      return 'text-orange-500';
  }
}