# Model Selection Guide

## Overview

DinnerPeople uses different AI models optimized for specific tasks. This document explains which models are used, why they were chosen, and their specific capabilities.

## Production Models (OpenAI)

### Vision Model: `gpt-4o`
**Used for**: Frame analysis and visual understanding

**Why this model**:
- Latest multimodal model with native vision capabilities
- Superior accuracy compared to gpt-4o-mini
- Faster than previous GPT-4 models
- Better at understanding complex cooking scenes
- Tier 3 access provides higher rate limits

**Capabilities**:
- Identifies ingredients and cooking techniques
- Describes cooking actions in frames
- Detects text overlays (social media handles)
- Works with various image qualities

### Text Model: `gpt-4o`
**Used for**: Recipe summarization and title generation

**Why this model**:
- Latest and most capable OpenAI model
- Combines vision and text understanding
- Excellent JSON mode support
- Faster than gpt-4-turbo with better quality
- Optimized for Tier 3 usage patterns

**Capabilities**:
- Creates engaging recipe titles
- Writes detailed recipe descriptions
- Extracts key cooking methods
- Maintains consistent tone

### Embedding Model: `text-embedding-3-small`
**Used for**: Semantic search and similarity matching

**Why this model**:
- High-quality embeddings at low cost
- 1536-dimensional vectors
- Optimized for search tasks
- Fast generation

**Capabilities**:
- Enables recipe similarity search
- Powers recommendation features
- Supports multilingual content

## Development Models (Ollama)

### Vision Model: `llama3.2-vision:11b`
**Used for**: Local frame analysis

**Why this model**:
- Latest vision model from Meta
- Superior accuracy compared to older models
- Better understanding of cooking contexts
- No API costs

**Requirements**:
- ~7GB disk space
- 12GB+ RAM recommended
- GPU optional but helpful

### Text Model: `mistral`
**Used for**: Local text generation

**Why this model**:
- Excellent performance/size ratio
- Fast inference
- Good instruction following
- Reliable JSON output

**Requirements**:
- ~4GB disk space
- 8GB RAM minimum

### Embedding Model: `nomic-embed-text`
**Used for**: Local embeddings

**Why this model**:
- Compatible embedding dimensions
- Fast local inference
- Good semantic understanding
- Lightweight

**Requirements**:
- ~274MB disk space
- Minimal RAM usage

## Model Comparison

| Task | Production (OpenAI) | Development (Ollama) | Quality Difference |
|------|-------------------|---------------------|-------------------|
| Frame Analysis | gpt-4o | llama3.2-vision:11b | Production: Significantly more accurate, better scene understanding |
| Recipe Summary | gpt-4o | mistral | Production: More creative, consistent formatting, faster |
| Embeddings | text-embedding-3-small | nomic-embed-text | Production: Better semantic matching |

## Cost Analysis

### Production Costs (OpenAI) - Tier 3
- Frame Analysis: ~$0.0025 per frame (gpt-4o)
- Recipe Summary: ~$0.005 per recipe (gpt-4o)
- Embeddings: ~$0.00002 per description
- Note: Tier 3 provides higher rate limits and priority access

### Development Costs (Ollama)
- All operations: $0 (runs locally)
- Only cost is initial setup time

## Switching Models

All models are centrally configured in `src/lib/constants.ts`:

```typescript
// src/lib/constants.ts

// Ollama Models (Local Development)
export const OLLAMA_TEXT_MODEL = 'mistral';
export const OLLAMA_IMAGE_MODEL = 'llama3.2-vision:11b';
export const OLLAMA_EMBED_MODEL = 'nomic-embed-text';

// OpenAI Models (Production) - Updated for Tier 3
export const OPENAI_TEXT_MODEL = 'gpt-4o';
export const OPENAI_IMAGE_MODEL = 'gpt-4o';
export const OPENAI_EMBED_MODEL = 'text-embedding-3-small';
```

To change a model, simply update the corresponding constant. The change will automatically apply to the appropriate service.

## Future Considerations

### Potential Upgrades
- **GPT-4V**: When cost decreases, for better frame analysis
- **Claude 3**: Alternative for recipe generation
- **Gemini Pro Vision**: Google's multimodal option

### Local Alternatives
- **LLaVA-v1.6**: Improved vision model
- **Mixtral**: Larger, more capable text model
- **CLIP**: Alternative embedding approach