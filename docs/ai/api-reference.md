# AI Service API Reference

## Overview

The AI service provides a unified interface for all AI operations, automatically routing between Ollama (local) and OpenAI (production) based on the environment.

## Import

```typescript
import { ai } from '@/lib/ai';
```

## Methods

### analyzeFrame

Analyzes a single video frame and returns a description.

```typescript
async analyzeFrame(
  imageUrl: string, 
  customPrompt?: string
): Promise<string>
```

**Parameters:**
- `imageUrl`: URL of the image to analyze
- `customPrompt`: Optional custom prompt (defaults to food analysis)

**Returns:** Text description of the frame

**Example:**
```typescript
const description = await ai.analyzeFrame(
  'https://example.com/frame.jpg'
);
// Returns: "A chef is slicing tomatoes on a cutting board"
```

### storeFrameWithEmbedding

Stores a frame description with its embedding vector.

```typescript
async storeFrameWithEmbedding(
  recipeId: string,
  timestamp: number,
  description: string,
  imageUrl: string
): Promise<void>
```

**Parameters:**
- `recipeId`: ID of the recipe
- `timestamp`: Frame timestamp in seconds
- `description`: Text description of the frame
- `imageUrl`: URL of the frame image

**Example:**
```typescript
await ai.storeFrameWithEmbedding(
  'recipe-123',
  30,
  'Chopping vegetables',
  'https://example.com/frame.jpg'
);
```

### processVideoFrames

Processes multiple video frames in sequence.

```typescript
async processVideoFrames(
  videoId: string,
  frames: Array<{
    timestamp: number;
    imageUrl: string;
  }>
): Promise<void>
```

**Parameters:**
- `videoId`: ID of the video/recipe
- `frames`: Array of frame objects with timestamps and URLs

**Example:**
```typescript
await ai.processVideoFrames('video-123', [
  { timestamp: 10, imageUrl: 'https://example.com/frame1.jpg' },
  { timestamp: 20, imageUrl: 'https://example.com/frame2.jpg' }
]);
```

### updateRecipeWithSummary

Generates and updates a recipe with AI-generated title and description.

```typescript
async updateRecipeWithSummary(
  recipeId: string
): Promise<void>
```

**Parameters:**
- `recipeId`: ID of the recipe to update

**Example:**
```typescript
await ai.updateRecipeWithSummary('recipe-123');
```

### generateRecipeSummaryWithCustomPrompt

Generates a recipe summary with a custom prompt.

```typescript
async generateRecipeSummaryWithCustomPrompt(
  cookingSteps: string,
  customPrompt: string
): Promise<RecipeSummary>
```

**Parameters:**
- `cookingSteps`: Description of cooking steps
- `customPrompt`: Custom prompt template

**Returns:**
```typescript
interface RecipeSummary {
  title: string;
  description: string;
  ingredients?: string[];
}
```

**Example:**
```typescript
const summary = await ai.generateRecipeSummaryWithCustomPrompt(
  'Step 1: Boil water\nStep 2: Add pasta',
  'Create a title for this recipe: {steps}'
);
```

## Environment Detection

The service automatically detects the environment:

```typescript
// Local environments (uses Ollama)
- localhost
- 127.0.0.1
- *.local-credentialless.webcontainer-api.io

// Production (uses OpenAI)
- All other domains
```

## Error Handling

All methods include error handling with appropriate fallbacks:

```typescript
try {
  const result = await ai.analyzeFrame(imageUrl);
} catch (error) {
  // Errors are logged but won't crash the app
  // Methods return sensible defaults
}
```

## Common Patterns

### Processing a Video

```typescript
// 1. Extract frames from video
const frames = extractFrames(videoFile);

// 2. Process frames with AI
await ai.processVideoFrames(recipeId, frames);

// 3. Generate recipe summary
await ai.updateRecipeWithSummary(recipeId);
```

### Custom Analysis

```typescript
// Social media detection
const result = await ai.analyzeFrame(
  imageUrl,
  'Detect any social media handles in this image'
);

// Ingredient identification
const ingredients = await ai.analyzeFrame(
  imageUrl,
  'List all visible ingredients in this image'
);
```

## Performance Considerations

### Ollama (Local)
- First model load is slow (~30s)
- Subsequent calls are faster
- Limited by local hardware
- No rate limits

### OpenAI (Production)
- Consistent fast responses
- Rate limits apply
- Costs per API call
- Requires internet connection

## Testing

Use the provided mocks for testing:

```typescript
import { vi } from 'vitest';
import { createOpenAIMock } from '@/test/mocks/openai.mock';

vi.mock('openai', () => ({
  default: vi.fn(() => createOpenAIMock())
}));
```