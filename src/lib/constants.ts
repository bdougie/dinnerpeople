/**
 * Model constants for AI services
 * Centralized configuration for easy model management
 */

// Ollama Models (Local Development)
export const OLLAMA_TEXT_MODEL = 'mistral';
export const OLLAMA_IMAGE_MODEL = 'llama3.2-vision:11b';
export const OLLAMA_EMBED_MODEL = 'nomic-embed-text';

// OpenAI Models (Production)
export const OPENAI_TEXT_MODEL = 'gpt-4-turbo';
export const OPENAI_IMAGE_MODEL = 'gpt-4o-mini';
export const OPENAI_EMBED_MODEL = 'text-embedding-3-small';

// Legacy exports for backward compatibility
export const TEXT_MODEL = OLLAMA_TEXT_MODEL;
export const IMAGE_MODEL = OLLAMA_IMAGE_MODEL;
export const EMBED_MODEL = OLLAMA_EMBED_MODEL;
