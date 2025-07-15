# DinnerPeople Video Upload PRD

## Product Overview

DinnerPeople is a recipe sharing platform that uses AI to automatically generate recipes from cooking videos. Users upload videos of their cooking process, and the system extracts frames, analyzes them using computer vision, and generates comprehensive recipes with ingredients and instructions.

## User Story

As a user, I would like to upload a recipe video that captures metadata and describes the video using screencaps of the video. Using embeddings in Supabase (pgvector), I can generate a summary/instructions and recipe list. This experience should be fast and work in the background like Instagram uploads, not preventing the user from editing metadata or browsing.

## Core Features

### 1. Video Upload & Processing
- **Drag-and-drop video upload interface**
- **Background processing** - Users can continue browsing while video processes
- **Progress tracking** - Real-time updates on processing status
- **Multiple format support** - MP4, MOV, WebM, etc.

### 2. Frame Extraction & Analysis
- **Automatic frame extraction** every 5 seconds
- **AI-powered frame analysis** using OpenAI Vision API
- **Ingredient detection** from video frames
- **Cooking technique identification**
- **Social media handle detection** for attribution

### 3. Recipe Generation
- **Automatic recipe title generation**
- **Ingredient list with quantities**
- **Step-by-step instructions**
- **Cooking time estimation**
- **Serving size calculation**

### 4. Vector Search & Discovery
- **Semantic search** using pgvector embeddings
- **Similar recipe recommendations**
- **Ingredient-based search**
- **Technique-based filtering**

## Technical Architecture

### Frontend (React + TypeScript)
- **Upload component** with drag-and-drop
- **Progress tracking** with Zustand state management
- **Real-time updates** via Supabase subscriptions
- **Responsive design** with Tailwind CSS

### Backend Services
- **Express.js server** for API endpoints
- **OpenAI integration** for vision and text processing
- **Ollama support** (disabled by default, can be enabled via flag)
- **Background job processing** with queue system

### Database (Supabase/PostgreSQL)
- **recipes** - Main recipe data
- **video_frames** - Extracted frames with embeddings
- **frame_descriptions** - AI-generated descriptions
- **processing_queue** - Background job tracking
- **pgvector** - Vector similarity search

### Storage (Supabase Storage)
- **videos bucket** - Original video files
- **thumbnails bucket** - Video thumbnails
- **frames bucket** - Extracted frame images

## Processing Pipeline

1. **Upload** - Video uploaded to Supabase storage
2. **Queue** - Job added to processing queue
3. **Extract** - FFmpeg extracts frames at 5-second intervals
4. **Analyze** - OpenAI Vision API analyzes each frame
5. **Embed** - Generate embeddings for frame descriptions
6. **Generate** - Create recipe from aggregated frame data
7. **Index** - Store embeddings for search
8. **Notify** - Update UI with completed recipe

## Performance Requirements

- **Upload speed** - Limited only by user's internet connection
- **Processing time** - < 30 30 seconds for 3-minute video (max 3 minutes)
- **Background processing** - Non-blocking UI
- **Real-time updates** - < 1 second latency
- **Search response** - < 500ms for vector search

## Security & Privacy

- **Row Level Security (RLS)** on all tables
- **Authenticated uploads only**
- **Private recipe option**
- **Content moderation** for uploaded videos
- **GDPR compliance** for user data

## Success Metrics

- **Upload success rate** > 95%
- **Processing completion rate** > 90%
- **Average processing time** < 2 minutes
- **User engagement** - Users browse while uploading
- **Recipe quality** - Accurate ingredient and instruction extraction

## Future Enhancements

1. **Multi-language support** for international recipes
2. **Nutrition information** calculation
3. **Video editing** - Trim and highlight key moments
4. **Collaborative recipes** - Multiple contributors
5. **Mobile app** with native video capture
6. **Export formats** - PDF, Markdown, JSON
7. **Integration with meal planning apps**
8. **Voice narration transcription**

## Development Phases

### Phase 1: Core Functionality (Current)
- Basic upload and processing
- Frame extraction and analysis
- Recipe generation
- Simple search

### Phase 2: Enhanced UX
- Progress notifications
- Batch uploads
- Recipe editing
- Advanced search filters

### Phase 3: Social Features
- User profiles
- Recipe collections
- Comments and ratings
- Sharing functionality

### Phase 4: Advanced AI
- Improved recipe quality
- Cooking technique tutorials
- Ingredient substitutions
- Dietary adaptations