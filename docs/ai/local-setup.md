# Local Development Setup

## Prerequisites

- macOS, Linux, or Windows (with WSL2)
- 8GB+ RAM recommended
- 10GB free disk space
- Node.js 18+ installed

## Step 1: Install Ollama

### macOS
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Windows
Download from [ollama.com/download](https://ollama.com/download)

## Step 2: Pull Required Models

Run these commands to download the AI models:

```bash
# Vision model for analyzing video frames (~7GB)
ollama pull llama3.2-vision:11b

# Text model for recipe generation (~3.8GB)
ollama pull mistral

# Embedding model for semantic search (~274MB)
ollama pull nomic-embed-text
```

## Step 3: Verify Installation

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Test a model
ollama run mistral "Hello, are you working?"
```

## Step 4: Configure Environment

Create a `.env` file in the project root:

```env
# Supabase (required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# OpenAI (optional for local dev)
VITE_OPENAI_API_KEY=optional_for_local_dev
```

## Step 5: Start Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will automatically use Ollama when running on localhost.

## Troubleshooting

### Ollama Not Running
```bash
# Start Ollama service
ollama serve
```

### Model Not Found
```bash
# List available models
ollama list

# Re-pull a model
ollama pull llava:7b
```

### Port Conflicts
If port 11434 is in use:
```bash
# Run Ollama on different port
OLLAMA_PORT=11435 ollama serve
```

Then update `ollama.ts`:
```typescript
const OLLAMA_BASE_URL = 'http://localhost:11435';
```

### Performance Issues

1. **Slow inference**: 
   - Close other applications
   - Consider using GPU acceleration
   - Use smaller models (e.g., `llava:7b` instead of `llava:13b`)

2. **Out of memory**:
   - Reduce concurrent model loading
   - Use one model at a time
   - Increase swap space

## Using Different Models

To experiment with different models:

```bash
# Smaller, faster vision model
ollama pull llava:7b-v1.6-vicuna-q4_0

# Alternative text model
ollama pull llama2:7b

# Update constants.ts with new model names
```

## Development Workflow

1. **Frame Analysis**: Upload a video to test vision capabilities
2. **Recipe Generation**: Process frames to see text generation
3. **Search**: Test embedding generation and retrieval

## Monitoring

Watch Ollama logs:
```bash
# In a separate terminal
tail -f ~/.ollama/logs/ollama.log
```

Check model usage:
```bash
# See which models are loaded
curl http://localhost:11434/api/ps
```

## Tips for Development

1. **First Run**: Models load slowly on first use, subsequent runs are faster
2. **Multiple Models**: Ollama can run multiple models but uses more RAM
3. **API Compatibility**: The local API mimics OpenAI's structure
4. **Cost**: Everything runs locally - no API charges!

## Next Steps

- Read the [API Reference](./api-reference.md) to understand available methods
- Check [Model Selection](./models.md) for model details
- Review [Architecture](./architecture.md) for system design