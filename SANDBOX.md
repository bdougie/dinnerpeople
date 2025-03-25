# AI Testing Sandbox

This document provides instructions for using the AI Testing Sandbox feature to experiment with AI prompts and debug AI capabilities.

## Overview

The AI Testing Sandbox allows you to:

- Test frame analysis on individual video frames
- Test recipe summarization based on frame descriptions
- Test social media handle detection in frames
- Modify system prompts and see the results immediately

## Setup Instructions

### Prerequisites

1. Ensure you have the following:
   - A functioning DinnerPeople development environment
   - Supabase local instance running (or connection to a development Supabase project)
   - API keys configured in your environment

2. For local Ollama testing:
   - Install Ollama from [ollama.ai](https://ollama.ai)
   - Pull required models:
     ```bash
     ollama pull llama3
     ollama pull llama3.2-vision:11b # for vision capabilities
     ollama pull nomic-embed-text # for embeddings
     ```
   - Ensure Ollama is running locally on port 11434

### Environment Configuration

Make sure your `.env` file contains:

```
VITE_OPENAI_API_KEY=your_openai_key_here
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Accessing the Sandbox

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the sandbox page:
   ```
   http://localhost:5173/admin/sandbox
   ```

## Using the Sandbox

### Testing with Recently Uploaded Videos

The sandbox automatically loads your most recently uploaded video and its extracted frames. If you need to test with a new video:

1. Upload a video through the regular app interface
2. Return to the sandbox page and click "Retry Loading" if necessary

### Testing Frame Analysis

1. Select a frame from the dropdown menu
2. Modify the Frame Analysis prompt in the left panel if desired
3. Click "Test Frame Analysis"
4. View the AI's response in the results area

### Testing Recipe Summarization

1. Ensure a video with frames is loaded
2. Modify the Recipe Summary prompt in the middle panel if desired
3. Click "Test Recipe Summary"
4. View the JSON output in the results area

### Testing Social Media Detection

1. Select a frame from the dropdown menu (preferably one with social media handles)
2. Modify the Social Media Detection prompt in the right panel if desired
3. Click "Test Social Detection"
4. View extracted social media handles in the results area

## Prompt Guidelines

### Frame Analysis Prompts

- Keep prompts clear and specific
- Include instructions about what aspects of the food to focus on
- Example: "Analyze this image and identify the cooking technique being used..."

### Recipe Summary Prompts

- Always include the `{steps}` placeholder for frame descriptions
- Request specific formatting in the prompt
- Example: "Based on the following steps, create a recipe title and description..."

### Social Media Detection Prompts

- Include clear formatting instructions
- Specify exactly what to look for (handles, usernames, etc.)
- Example: "Find any @username or channel name visible in this image..."

## Troubleshooting

### No Videos Loading

- Ensure you've uploaded at least one video
- Check Supabase connection
- Verify the database has recipe entries with video_url values

### AI Analysis Not Working

- Check console for errors
- Verify API keys are correct
- For local Ollama testing, ensure Ollama is running:
  ```bash
  curl http://localhost:11434/api/tags
  ```

### Frame Results Not Showing

- Make sure frames were properly extracted (check video_frames table)
- Verify image URLs are accessible
- Try testing with a different frame

## API Endpoint Information

The sandbox uses these API endpoints that you can also call directly:

- `/api/admin/test-frame-analysis` - Test frame analysis
- `/api/admin/test-recipe-summary` - Test recipe summarization
- `/api/admin/test-social-detection` - Test social media detection

Each endpoint accepts POST requests with the appropriate parameters.
