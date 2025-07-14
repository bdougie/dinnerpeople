# DinnerPeople Testing Guide

This guide explains how to test each component of the video upload workflow in isolation.

## Prerequisites

1. **Environment Variables**
   Create a `.env` file in the project root with:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   VITE_USE_OLLAMA=false
   ```

2. **Dependencies**
   - Node.js 18+
   - FFmpeg installed (`brew install ffmpeg` on macOS)
   - All npm packages installed (`npm install`)

3. **Test Media**
   - A sample video file (MP4 format recommended)
   - Or use a publicly accessible image URL for AI analysis tests

## Test Scripts

### 1. Video Upload Test
Tests uploading videos to Supabase Storage.

```bash
cd scripts/test
node test-upload.js /path/to/your/video.mp4
```

**Expected Output:**
- ✅ Video uploaded successfully
- 🔗 Public URL displayed
- 📋 List of files in bucket
- ✅ Download verification
- 🗑️ Cleanup confirmation

**Common Issues:**
- Storage bucket not configured → Check Supabase dashboard
- RLS policies blocking upload → Review bucket policies
- File too large → Check Supabase storage limits

### 2. Frame Extraction Test
Tests extracting frames from video at 5-second intervals.

```bash
cd scripts/test
node test-frame-extraction.js /path/to/your/video.mp4
```

**Expected Output:**
- ✅ FFmpeg installed confirmation
- 📸 Number of extracted frames
- ✅ Frames uploaded to storage
- 🔗 Frame URLs listed
- 🧹 Cleanup confirmation

**Common Issues:**
- FFmpeg not installed → Install via package manager
- Temporary directory permissions → Check write permissions
- Frame upload failures → Check frames bucket configuration

### 3. AI Analysis Test
Tests OpenAI Vision API for analyzing cooking frames.

```bash
cd scripts/test
# Single image
node test-ai-analysis.js https://example.com/cooking-image.jpg

# Multiple images
node test-ai-analysis.js https://example.com/image1.jpg https://example.com/image2.jpg
```

**Expected Output:**
- 📋 Basic cooking analysis
- 🥗 Ingredient detection
- 👨‍🍳 Cooking technique identification
- 📱 Social media handle detection
- 💰 Token usage and cost estimate

**Common Issues:**
- Invalid API key → Check VITE_OPENAI_API_KEY
- Image URL not accessible → Use public URLs
- Rate limiting → Add delays between requests

### 4. Embeddings Test
Tests pgvector embedding storage and similarity search.

```bash
cd scripts/test
node test-embeddings.js
```

**Expected Output:**
- ✅ Embeddings generated for descriptions
- ✅ Embeddings stored in database
- 🔍 Vector similarity search results
- 📈 Embedding aggregation test
- 🗑️ Cleanup confirmation

**Common Issues:**
- match_frames function missing → Run the SQL migration provided
- Embedding dimension mismatch → Check OpenAI model consistency
- Search returning no results → Adjust similarity threshold

### 5. Recipe Generation Test
Tests generating recipes from frame descriptions.

```bash
cd scripts/test
node test-recipe-generation.js
```

**Expected Output:**
- ✅ Generated recipe with title, ingredients, instructions
- ✅ Database storage and retrieval
- 🏷️ Social media attribution extraction
- 💰 Token usage estimation
- 🗑️ Cleanup confirmation

**Common Issues:**
- JSON parsing errors → Check OpenAI response format
- Missing database tables → Run migrations
- Token limit exceeded → Reduce frame count or description length

## Integration Testing

### Full Workflow Test

1. **Start the application:**
   ```bash
   npm start
   ```

2. **Upload a video:**
   - Navigate to http://localhost:5173/upload
   - Drag and drop a cooking video
   - Monitor the console for processing logs

3. **Verify each stage:**
   - Upload progress bar
   - Processing queue status
   - Frame extraction completion
   - AI analysis results
   - Recipe generation
   - Final recipe display

### Database Verification

Check data in Supabase dashboard:
- `recipes` table - Recipe metadata
- `video_frames` table - Embeddings stored
- `frame_descriptions` table - AI descriptions
- `processing_queue` table - Job status

### Storage Verification

Check Supabase Storage buckets:
- `videos` - Original uploads
- `thumbnails` - Video thumbnails
- `frames` - Extracted frames

## Performance Testing

### Measure Processing Time
```bash
time node test-frame-extraction.js /path/to/5-minute-video.mp4
```

Target: < 30 seconds for frame extraction

### Concurrent Uploads
Test multiple uploads simultaneously to verify:
- Queue handling
- Resource management
- Database connection pooling

## Troubleshooting

### Debug Mode
Enable detailed logging:
```javascript
// In test scripts, add:
console.log('[DEBUG]', 'Your debug message');
```

### Common Error Messages

1. **"Storage bucket not found"**
   - Create buckets in Supabase dashboard
   - Set public access for frames and thumbnails

2. **"Embedding dimension mismatch"**
   - Ensure consistent OpenAI model usage
   - Check vector column dimension in database

3. **"Rate limit exceeded"**
   - Add delays between API calls
   - Implement exponential backoff

4. **"FFmpeg command failed"**
   - Verify FFmpeg installation
   - Check video codec compatibility
   - Ensure sufficient disk space

### Health Checks

1. **API Connectivity:**
   ```bash
   curl $VITE_SUPABASE_URL/rest/v1/
   ```

2. **OpenAI API:**
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $VITE_OPENAI_API_KEY"
   ```

3. **Storage Access:**
   Test public URL access for uploaded files

## Best Practices

1. **Test in isolation** - Run individual tests before integration
2. **Use small files** - Start with short videos (< 1 minute)
3. **Monitor costs** - Track OpenAI API usage
4. **Clean up test data** - Scripts include cleanup steps
5. **Check logs** - Both client and server logs
6. **Incremental testing** - Test each stage before moving to next

## Next Steps

After successful testing:
1. Run the full application with `npm start`
2. Upload a real cooking video
3. Verify the complete workflow
4. Check the generated recipe quality
5. Test search functionality
6. Share results with team