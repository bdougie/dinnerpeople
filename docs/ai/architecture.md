# AI Architecture

## Overview

The AI system in DinnerPeople follows a service-oriented architecture with environment-based routing:

```
┌─────────────────┐
│   AI Service    │  ← Main entry point (ai.ts)
│   (Router)      │
└────────┬────────┘
         │
    Environment?
    ┌────┴────┐
    │         │
Local │         │ Production
    ↓         ↓
┌─────────┐ ┌─────────┐
│ Ollama  │ │ OpenAI  │
│ Service │ │ Service │
└─────────┘ └─────────┘
```

## Core Components

### 1. AI Service (ai.ts)
The main service that routes requests based on environment:
- Detects if running locally (localhost, 127.0.0.1, or webcontainer)
- Routes to appropriate backend (Ollama or OpenAI)
- Provides unified interface for all AI operations

### 2. Ollama Service (ollama.ts)
Local AI provider for development:
- Runs on `http://localhost:11434`
- Uses open-source models
- No API costs
- Supports all core features

### 3. OpenAI Service (openai.ts)
Production AI provider:
- Uses OpenAI's GPT-4 and embedding models
- Higher quality results
- Requires API key
- Optimized for production workloads

## Key Design Decisions

### Environment-Based Routing
- **Why**: Developers can work without API keys or costs
- **How**: Automatic detection based on `window.location.hostname`
- **Benefit**: Seamless transition between dev and prod

### Unified Interface
- **Why**: Components don't need to know which AI backend is used
- **How**: Both services implement the same methods
- **Benefit**: Easy to add new AI providers or switch between them

### Modular Services
- **Why**: Each service can be optimized for its use case
- **How**: Separate files with focused responsibilities
- **Benefit**: Easier testing, maintenance, and debugging

### Centralized Model Configuration
- **Why**: Easy model management and experimentation
- **How**: All models defined in `constants.ts`
- **Benefit**: Change models in one place, applies everywhere

## Data Flow

1. **Frame Analysis**
   ```
   Video Frame → AI Service → (Ollama/OpenAI) → Description
   ```

2. **Recipe Generation**
   ```
   Frame Descriptions → AI Service → (Ollama/OpenAI) → Recipe Summary
   ```

3. **Embedding Generation**
   ```
   Text → AI Service → (Ollama/OpenAI) → Vector Embedding
   ```

## Error Handling

- Each service handles its own errors gracefully
- Fallback responses for failed AI calls
- Detailed logging for debugging
- User-friendly error messages