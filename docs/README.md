# DinnerPeople AI Documentation

## Overview

DinnerPeople uses a hybrid AI architecture that automatically switches between local (Ollama) and cloud (OpenAI) models based on the environment. This approach provides:

- **Development**: Fast, free local inference with Ollama
- **Production**: High-quality results with OpenAI's latest models
- **Testing**: Mocked responses for consistent integration tests

## Documentation Structure

- [AI Architecture](./ai/architecture.md) - How the AI system is structured
- [Model Selection](./ai/models.md) - Which models are used and why
- [Local Setup](./ai/local-setup.md) - Setting up Ollama for development
- [API Reference](./ai/api-reference.md) - AI service methods and usage

## Quick Start

### For Development (Local)
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull required models
ollama pull llava:7b
ollama pull mistral
ollama pull nomic-embed-text

# Start development server
npm run dev
```

### For Production (Cloud)
```bash
# Set OpenAI API key
export VITE_OPENAI_API_KEY=your-key-here

# Build and deploy
npm run build
```

## Key Features

- **Video Frame Analysis**: Extract cooking steps from video frames
- **Recipe Generation**: Create titles and descriptions from cooking steps  
- **Semantic Search**: Find similar recipes using embeddings
- **Social Media Detection**: Identify creator attribution from frames