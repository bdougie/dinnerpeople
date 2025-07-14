# Model Configuration Guide

## Overview

All AI models are centrally configured in `src/lib/constants.ts` for easy maintenance and experimentation.

## Configuration Structure

```typescript
// src/lib/constants.ts

// Ollama Models (Local Development)
export const OLLAMA_TEXT_MODEL = 'mistral';
export const OLLAMA_IMAGE_MODEL = 'llama3.2-vision:11b';
export const OLLAMA_EMBED_MODEL = 'nomic-embed-text';

// OpenAI Models (Production)
export const OPENAI_TEXT_MODEL = 'gpt-4-turbo';
export const OPENAI_IMAGE_MODEL = 'gpt-4o-mini';
export const OPENAI_EMBED_MODEL = 'text-embedding-3-small';
```

## Benefits

1. **Single Source of Truth**: All model configurations in one file
2. **Easy Experimentation**: Change models without searching through code
3. **Clear Separation**: Ollama and OpenAI models are clearly distinguished
4. **Type Safety**: TypeScript ensures correct usage

## How to Change Models

### Switching Ollama Models

To try a different local model:

```typescript
// Example: Using a smaller vision model
export const OLLAMA_IMAGE_MODEL = 'llava:7b';

// Example: Using Llama 2 for text
export const OLLAMA_TEXT_MODEL = 'llama2:7b';
```

### Switching OpenAI Models

To use different OpenAI models:

```typescript
// Example: Using GPT-4 for better quality
export const OPENAI_TEXT_MODEL = 'gpt-4';

// Example: Using larger embedding model
export const OPENAI_EMBED_MODEL = 'text-embedding-3-large';
```

## Model Usage

The constants are automatically imported and used by:

- `ollama.ts`: Uses `OLLAMA_*` constants
- `openai.ts`: Uses `OPENAI_*` constants
- Test mocks reference these constants for consistency

## Adding New Models

To add support for a new AI provider:

1. Add new constants to `constants.ts`:
   ```typescript
   export const ANTHROPIC_TEXT_MODEL = 'claude-3-opus';
   ```

2. Create a new service file that imports the constants
3. Update the AI service router to include the new provider

## Best Practices

1. **Test Before Production**: Always test model changes locally first
2. **Monitor Costs**: Different models have different pricing
3. **Check Compatibility**: Ensure models support required features
4. **Document Changes**: Update this file when adding new models