# Testing Guide

## Overview
This project uses Vitest for testing, with mocked OpenAI services for integration tests and actual Ollama models for local development.

## Running Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm test:ui

# Run tests in watch mode
npm test -- --watch
```

## Test Structure

- `mocks/openai.mock.ts` - Mock implementation of OpenAI API
- `setup.ts` - Test environment setup
- `../lib/ai.test.ts` - Integration tests for AI service

## Debugging OpenAI Integration

To debug the actual OpenAI integration (requires API key):

```bash
# Install tsx if not already installed
npm install -g tsx

# Run debug script
VITE_OPENAI_API_KEY=your-key-here npx tsx src/test/debug-openai.ts
```

## Key Concepts

1. **Environment Detection**: The AI service automatically routes to Ollama for local development and OpenAI for production
2. **Mocking**: Tests use mocked OpenAI responses to avoid API calls and ensure consistent results
3. **Integration Tests**: Test the full workflow including frame analysis, embedding generation, and recipe summarization

## Adding New Tests

When adding new AI features, ensure you:
1. Update the mock in `mocks/openai.mock.ts`
2. Add corresponding test cases in `ai.test.ts`
3. Test both OpenAI (mocked) and Ollama (local) paths