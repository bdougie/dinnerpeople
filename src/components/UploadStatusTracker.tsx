import { CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';

interface ValidationStatus {
  apiKey: boolean | null;
  fileSize: boolean | null;
  fileType: boolean | null;
  thumbnail: boolean | null;
  frameExtraction: boolean | null;
  embeddings: boolean | null;
}

interface UploadStatusTrackerProps {
  isVisible: boolean;
  validationStatus: ValidationStatus;
  errorMessage?: string;
}

export function UploadStatusTracker({ isVisible, validationStatus, errorMessage }: UploadStatusTrackerProps) {
  if (!isVisible) return null;

  const statusItems = [
    {
      id: 'apiKey',
      label: 'OpenAI API Key',
      status: validationStatus.apiKey,
      info: 'Required for title generation and frame analysis'
    },
    {
      id: 'fileType',
      label: 'File Type',
      status: validationStatus.fileType,
      info: 'Must be a video file (MP4, MOV, AVI, etc.)'
    },
    {
      id: 'fileSize',
      label: 'File Size',
      status: validationStatus.fileSize,
      info: 'Must be less than 200MB'
    },
    {
      id: 'thumbnail',
      label: 'Thumbnail Generation',
      status: validationStatus.thumbnail,
      info: 'Used for preview and title generation'
    },
    {
      id: 'frameExtraction',
      label: 'Frame Extraction',
      status: validationStatus.frameExtraction,
      info: 'Extracts key frames from your video'
    },
    {
      id: 'embeddings',
      label: 'Embeddings Generation',
      status: validationStatus.embeddings,
      info: 'Enables semantic search for your recipe'
    }
  ];

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) {
      return <Info className="w-4 h-4 text-gray-400" />;
    } else if (status === true) {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status: boolean | null) => {
    if (status === null) {
      return 'Pending';
    } else if (status === true) {
      return 'Valid';
    } else {
      return 'Failed';
    }
  };

  const getStatusColor = (status: boolean | null) => {
    if (status === null) {
      return 'text-gray-500';
    } else if (status === true) {
      return 'text-green-600';
    } else {
      return 'text-red-600';
    }
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Upload Validation Status
      </h3>
      
      <div className="space-y-2">
        {statusItems.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <div className="mt-0.5">{getStatusIcon(validationStatus[item.id as keyof ValidationStatus])}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.label}</span>
                <span className={`text-xs ${getStatusColor(validationStatus[item.id as keyof ValidationStatus])}`}>
                  ({getStatusText(validationStatus[item.id as keyof ValidationStatus])})
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.info}</p>
            </div>
          </div>
        ))}
      </div>

      {errorMessage && (
        <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        <p>💡 Tip: If OpenAI API key validation fails, you can still upload videos but some features will be limited.</p>
      </div>
    </div>
  );
}