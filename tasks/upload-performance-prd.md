# Video Upload Performance Improvement PRD

## Problem Statement
Users are experiencing poor upload performance with large video files (up to 500MB). The current implementation blocks the UI during upload, provides minimal feedback, and doesn't optimize video files for our use case where only frames are needed.

## Goals
1. Reduce upload time by 80-90% through aggressive compression
2. Improve user experience with detailed progress feedback
3. Enable background uploads so users can continue using the app
4. Reduce server bandwidth costs

## Success Metrics
- Average upload time reduced from 5+ minutes to <1 minute for typical videos
- 90% reduction in bandwidth usage
- User satisfaction score improvement (fewer upload-related complaints)
- 95% upload success rate (from current ~80%)

## User Stories

### As a recipe creator, I want to:
1. See detailed upload progress so I know my upload is working
2. Continue browsing the app while my video uploads
3. Upload videos quickly without worrying about file size
4. Retry failed uploads without starting over

## Technical Requirements

### Phase 1: Immediate UX Improvements
**Timeline: 1-2 days**

#### 1.1 Upload Progress Indicator
- Show real-time upload percentage
- Display upload speed (MB/s)
- Calculate and show estimated time remaining
- Show current/total file size
- Integrate progress into existing upload step UI

#### 1.2 Background Uploads
- Move upload process to background
- Add persistent status indicator in header
- Toast notifications for completion/errors
- Allow navigation during upload

#### 1.3 Error Handling
- Detect network interruptions
- Automatic retry mechanism (3 attempts)
- Clear error messages for size limits
- User-friendly error recovery options

### Phase 2: Compression & Optimization
**Timeline: 3-4 days**

#### 2.1 Client-Side Video Compression
- Integrate ffmpeg.wasm for browser-based compression
- Target output: 200MB maximum (based on large.mp4 test file at 164MB)
- Compression settings optimized for frame extraction:
  - Bitrate: 500-1000 kbps (vs original 5000-10000)
  - Resolution: Maintain minimum 720p for text readability
  - Format: H.264 MP4 for compatibility
  - Preserve original framerate
- Show compression progress with percentage
- Display before/after file sizes

#### 2.2 Chunked Uploads
- Split compressed files into 5MB chunks
- Upload 3-5 chunks concurrently
- Implement resumable uploads using Supabase
- Track chunk completion for resume capability

#### 2.3 Direct Uploads
- Generate signed URLs server-side
- Upload directly from browser to Supabase
- Eliminate server bottleneck
- Reduce server bandwidth costs

## Implementation Details

### Compression Algorithm
```javascript
// Target settings for frame extraction optimization
const compressionSettings = {
  codec: 'libx264',
  bitrate: '750k', // Aggressive compression
  preset: 'fast',  // Balance speed/quality
  crf: 28,         // Higher = more compression
  maxSize: 200 * 1024 * 1024, // 200MB limit
  // Maintain resolution for frame clarity
  scale: video.height > 720 ? '720:-2' : undefined
};
```

### Progress Tracking
```javascript
// Combined progress for compression + upload
const totalProgress = (compressionProgress * 0.3) + (uploadProgress * 0.7);
```

### File Size Reduction Estimates
- Original: 500MB video (5 min, 1080p, 10Mbps)
- Compressed: 50-100MB (80-90% reduction)
- Upload time: 5+ minutes → 30-60 seconds

## UI/UX Changes

### Upload Progress Component
```
┌─────────────────────────────────────┐
│ Uploading Recipe Video              │
│                                     │
│ [████████████░░░░░░░] 65%          │
│                                     │
│ Speed: 2.5 MB/s                     │
│ Time remaining: 45 seconds          │
│ 65 MB of 100 MB                    │
│                                     │
│ [Continue in background]            │
└─────────────────────────────────────┘
```

### Compression Progress
```
┌─────────────────────────────────────┐
│ Optimizing video for upload         │
│                                     │
│ [██████░░░░░░░░░░░░░] 30%          │
│                                     │
│ Original: 450 MB                    │
│ Compressed: ~90 MB (estimate)       │
│                                     │
│ This one-time process will make     │
│ your upload much faster!            │
└─────────────────────────────────────┘
```

## Testing Requirements
1. Test with various video formats (MP4, MOV, AVI)
2. Test compression quality on recipe videos
3. Verify frame extraction still produces readable images
4. Test upload resume after network interruption
5. Performance testing on mobile devices
6. Browser compatibility (Chrome, Safari, Firefox)

## Rollback Plan
- Feature flag for compression (fallback to original upload)
- Keep original upload flow as backup
- Monitor error rates and disable if >5% failure

## Future Enhancements
- Multiple file upload queue
- Drag-and-drop anywhere on page
- Smart frame extraction during compression
- WebRTC for real-time progress updates