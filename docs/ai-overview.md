# AI System Overview

## Quick Reference

### Production Setup (OpenAI) - Tier 3
- **Vision**: `gpt-4o` - Analyzes video frames with superior accuracy
- **Text**: `gpt-4o` - Generates recipes with latest model  
- **Embeddings**: `text-embedding-3-small` - Powers search
- **Cost**: ~$0.01 per recipe (with gpt-4o efficiency)
- **Speed**: Fastest available, with priority access

### Development Setup (Ollama)
- **Vision**: `llama3.2-vision:11b` - Local frame analysis
- **Text**: `mistral` - Local recipe generation
- **Embeddings**: `nomic-embed-text` - Local search
- **Cost**: Free (runs locally)
- **Speed**: Slower first run, then fast

## Architecture

```
User uploads video
        ↓
Frame extraction (30s, 60s, 90s...)
        ↓
AI Service (routes based on environment)
        ↓
    ┌───────────────┬────────────────┐
    │   Localhost   │   Production   │
    │               │                │
    │    Ollama     │    OpenAI      │
    │  (Free, Local)│  (Paid, Cloud) │
    └───────────────┴────────────────┘
            ↓
    Frame descriptions
            ↓
    Recipe generation
            ↓
    Store in Supabase
```

## Key Features

1. **Automatic Environment Detection**
   - No configuration needed
   - Seamless dev/prod experience

2. **Cost Optimization**
   - Free local development
   - Efficient production usage

3. **Quality Balance**
   - Good enough for development
   - Excellent for production

4. **Unified Interface**
   - Same code works everywhere
   - Easy to test and debug

## Getting Started

```bash
# For local development
ollama pull llama3.2-vision:11b
ollama pull mistral
ollama pull nomic-embed-text
npm run dev

# For production
export VITE_OPENAI_API_KEY=your-key
npm run build
```

See [detailed documentation](./ai/) for more information.