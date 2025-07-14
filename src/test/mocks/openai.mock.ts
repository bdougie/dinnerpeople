import { vi } from 'vitest';
import { OPENAI_EMBED_MODEL } from '../../lib/constants';

// Mock OpenAI responses
export const mockOpenAIResponses = {
  frameAnalysis: 'A chef is chopping vegetables on a cutting board.',
  recipeSummary: {
    title: 'Vegetable Stir Fry',
    description: 'A quick and healthy vegetable stir fry with fresh ingredients.'
  },
  embedding: new Array(1536).fill(0).map((_, i) => Math.random())
};

// Create OpenAI mock
export const createOpenAIMock = () => {
  return {
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async (params) => {
          // Check if it's a frame analysis request by checking if content is an array
          if (Array.isArray(params.messages[0].content) && 
              params.messages[0].content.some(c => c.type === 'image_url')) {
            return {
              choices: [{
                message: {
                  content: mockOpenAIResponses.frameAnalysis
                }
              }]
            };
          }
          
          // Otherwise it's a recipe summary request
          return {
            choices: [{
              message: {
                content: JSON.stringify(mockOpenAIResponses.recipeSummary)
              }
            }]
          };
        })
      }
    },
    embeddings: {
      create: vi.fn().mockResolvedValue({
        data: [{
          embedding: mockOpenAIResponses.embedding
        }]
      })
    }
  };
};