# DinnerPeople Testing Sandbox

This directory contains isolated test scripts to validate each component of the video upload workflow.

## Quick Start

1. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase and OpenAI credentials
   ```

2. **Set up test directories:**
   ```bash
   node scripts/test/setup-test-env.js
   ```

3. **Run tests in order (from project root):**
   ```bash
   # Test 1: Upload functionality
   node scripts/test/test-upload.js upload-test/small.MP4
   
   # Test 2: Frame extraction
   node scripts/test/test-frame-extraction.js upload-test/small.MP4
   
   # Test 3: AI vision analysis
   node scripts/test/test-ai-analysis.js https://example.com/cooking-image.jpg
   
   # Test 4: Embeddings and vector search
   node scripts/test/test-embeddings.js
   
   # Test 5: Recipe generation
   node scripts/test/test-recipe-generation.js
   ```
   
   Or navigate to the test directory first:
   ```bash
   cd scripts/test
   node test-upload.js ../../upload-test/small.MP4
   ```

4. **Start the full application:**
   ```bash
   npm start
   ```

## Files

- `setup-test-env.js` - Sets up the upload-test directory structure
- `test-upload.js` - Tests video upload to Supabase storage
- `test-frame-extraction.js` - Tests FFmpeg frame extraction
- `test-ai-analysis.js` - Tests OpenAI Vision API
- `test-embeddings.js` - Tests pgvector embedding storage
- `test-recipe-generation.js` - Tests recipe summary generation
- `TESTING.md` - Detailed testing guide

## Important Notes

- **OpenAI is now the default** - Ollama is disabled via `VITE_USE_OLLAMA=false`
- **FFmpeg required** - Install with `brew install ffmpeg` (macOS)
- **Costs apply** - OpenAI API usage is billed per token
- **Test data cleanup** - Scripts automatically clean up test data
- **Test files** - All temporary files are stored in `/upload-test` directory

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