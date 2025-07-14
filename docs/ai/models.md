# Model Selection Guide

## Overview

DinnerPeople uses different AI models optimized for specific tasks. This document explains which models are used, why they were chosen, and their specific capabilities.

## Production Models (OpenAI)

### Vision Model: `gpt-4o-mini`
**Used for**: Frame analysis and visual understanding

**Why this model**:
- Cost-effective vision capabilities ($0.075 per 1M input tokens)
- Fast response times (important for video processing)
- Good balance of quality and speed
- Handles multiple frames efficiently

**Capabilities**:
- Identifies ingredients and cooking techniques
- Describes cooking actions in frames
- Detects text overlays (social media handles)
- Works with various image qualities

### Text Model: `gpt-4-turbo`
**Used for**: Recipe summarization and title generation

**Why this model**:
- Superior text generation quality
- JSON mode support for structured output
- Better at understanding cooking context
- Consistent formatting

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
| Frame Analysis | gpt-4o-mini | llama3.2-vision:11b | Production: More accurate, better with complex scenes |
| Recipe Summary | gpt-4-turbo | mistral | Production: More creative, better formatting |
| Embeddings | text-embedding-3-small | nomic-embed-text | Production: Better semantic matching |

## Cost Analysis

### Production Costs (OpenAI)
- Frame Analysis: ~$0.00015 per frame
- Recipe Summary: ~$0.03 per recipe
- Embeddings: ~$0.00002 per description

### Development Costs (Ollama)
- All operations: $0 (runs locally)
- Only cost is initial setup time

## Switching Models

To change models, update the constants in:

```typescript
// src/lib/constants.ts
export const TEXT_MODEL = 'mistral';              // Ollama text model
export const IMAGE_MODEL = 'llama3.2-vision:11b'; // Ollama vision model  
export const EMBED_MODEL = 'nomic-embed-text';    // Ollama embedding model
```

## Future Considerations

### Potential Upgrades
- **GPT-4V**: When cost decreases, for better frame analysis
- **Claude 3**: Alternative for recipe generation
- **Gemini Pro Vision**: Google's multimodal option

### Local Alternatives
- **LLaVA-v1.6**: Improved vision model
- **Mixtral**: Larger, more capable text model
- **CLIP**: Alternative embedding approach