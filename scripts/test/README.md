# DinnerPeople Testing Sandbox

This directory contains isolated test scripts to validate each component of the video upload workflow.

## Quick Start

1. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase and OpenAI credentials
   ```

2. **Run tests in order:**
   ```bash
   # Test 1: Upload functionality
   node test-upload.js /path/to/video.mp4
   
   # Test 2: Frame extraction
   node test-frame-extraction.js /path/to/video.mp4
   
   # Test 3: AI vision analysis
   node test-ai-analysis.js https://example.com/cooking-image.jpg
   
   # Test 4: Embeddings and vector search
   node test-embeddings.js
   
   # Test 5: Recipe generation
   node test-recipe-generation.js
   ```

3. **Start the full application:**
   ```bash
   npm start
   ```

## Files

- `test-upload.js` - Tests video upload to Supabase storage
- `test-frame-extraction.js` - Tests FFmpeg frame extraction
- `test-ai-analysis.js` - Tests OpenAI Vision API
- `test-embeddings.js` - Tests pgvector embedding storage
- `test-recipe-generation.js` - Tests recipe summary generation
- `PRD.md` - Product requirements document
- `TESTING.md` - Detailed testing guide

## Important Notes

- **OpenAI is now the default** - Ollama is disabled via `VITE_USE_OLLAMA=false`
- **FFmpeg required** - Install with `brew install ffmpeg` (macOS)
- **Costs apply** - OpenAI API usage is billed per token
- **Test data cleanup** - Scripts automatically clean up test data

## Workflow Overview

```
Video Upload → Frame Extraction → AI Analysis → Embeddings → Recipe Generation
     ↓              ↓                ↓              ↓              ↓
  Storage        FFmpeg          Vision API     pgvector      GPT-4-mini
```

## Next Steps

1. Run each test script to validate your setup
2. Check the generated outputs
3. Review any errors in the console
4. Once all tests pass, try the full workflow in the app

For detailed instructions, see `TESTING.md`.