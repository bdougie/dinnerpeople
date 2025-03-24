# Dinner People

A modern web application for sharing and discovering cooking recipes through video content. Users can upload cooking videos which are automatically processed to extract frames, analyze content, and generate detailed recipe information.

## Project Overview

Dinner People is a React application that leverages Supabase for backend services and AI models for video content analysis. The app allows users to:

- Sign up and authenticate
- Upload cooking videos
- Process videos into step-by-step recipes with AI assistance
- Browse, save, and like recipes from other users
- Manage their own recipe collection

## Technical Architecture

### Supabase Integration

Dinner People uses Supabase for authentication, database operations, and storage.

#### Authentication

The app uses Supabase Auth for user management with a custom Zustand store:

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Auth store with Zustand
export const useAuthStore = create<AuthState>((set) => ({
  // ...existing code...
  
  signIn: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // ...error handling and state updates
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  
  // ...other auth methods
}));
```

#### Database Operations

Supabase is used for storing and querying recipe data:

```typescript
// Example from src/lib/storage.ts
export async function uploadVideo(file: File): Promise<UploadResult> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Create recipe entry with a temporary title
  const { error: recipeError } = await supabase
    .from('recipes')
    .insert({
      id: recipeId,
      user_id: userId,
      status: 'draft',
      title: `Untitled Recipe ${new Date().toLocaleDateString()}`,
      description: 'Recipe details will be added after processing'
    });
    
  // ...additional code
}
```

#### Storage

Supabase Storage is used for video and image storage:

```typescript
// Example from src/lib/video.ts
export async function uploadFrames(frames: { timestamp: number, blob: Blob }[], recipeId: string) {
  const uploadedFrames: { timestamp: number, imageUrl: string }[] = [];

  for (const frame of frames) {
    const path = `${recipeId}/${frame.timestamp}.jpg`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('frames')
      .upload(path, frame.blob);

    // ...additional code
  }

  return uploadedFrames;
}
```

### AI Integration

The app uses either OpenAI in production or Ollama locally for video processing and analysis.

#### AI Service Router
_note: testing openai local? Comment out the original implementation and return false below._

```typescript
// src/lib/ai.ts
import { ollama } from './ollama';
import { openai } from './openai';

class AIService {
  private isLocalEnvironment(): boolean {
    // Temporarily return false to force using OpenAI instead of Ollama
    return true;
    
    // Original implementation (comment out while testing)
    return window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1';
  }

  async analyzeFrame(imageUrl: string): Promise<string> {
    // Use Ollama for local development, OpenAI for production
    return this.isLocalEnvironment() 
      ? ollama.analyzeFrame(imageUrl)
      : openai.analyzeFrame(imageUrl);
  }

  // ...other methods
}

export const ai = new AIService();
```

#### OpenAI Integration

```typescript
// src/lib/openai.ts
import OpenAI from 'openai';
import { supabase } from './supabase';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, API calls should be made from backend
});

export async function analyzeFrame(imageUrl: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe this cooking step in detail, focusing on the ingredients, techniques, and any important details visible in the frame. Keep it concise but informative."
            },
            {
              type: "image_url",
              image_url: imageUrl
            }
          ]
        }
      ],
      max_tokens: 150
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error analyzing frame:', error);
    throw error;
  }
}
```

#### Ollama Integration (Local Development)

```typescript
// src/lib/ollama.ts
import { supabase } from './supabase';

const OLLAMA_BASE_URL = 'http://localhost:11434';

class OllamaAPI {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = OLLAMA_BASE_URL, model: string = 'llama2-vision') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async analyzeFrame(imageUrl: string): Promise<string> {
    if (!this.isLocalEnvironment()) {
      throw new Error('Ollama can only be used in local development environment');
    }

    const prompt = `You are a culinary expert. Analyze this cooking image and provide a detailed description of what you see.`;

    // ...additional code
    
    return await this.generateImageCompletion(prompt, [imageData]);
  }
  
  // ...other methods
}

export const ollama = new OllamaAPI('http://localhost:11434', 'llama2-vision');
```

## Local Development Setup

Follow these steps to run Dinner People locally:

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier available)
- For local AI processing: Ollama installed with llama2-vision model
- Optional: OpenAI API key for production-like environment

### Setup Steps

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/dinnerpeople.git
   cd dinnerpeople
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   Create a `.env` file in the root directory with the following:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key (optional for local dev)
   ```

4. Set up Supabase
   - Create a new Supabase project
   - Run the migration scripts in the `supabase/migrations` folder
   - Set up the storage buckets (`videos`, `thumbnails`, `frames`)

5. For local AI processing with Ollama:
   - Install Ollama from https://ollama.ai/
   - Pull the llama2-vision model:
     ```bash
     ollama pull llama2-vision
     ```

6. Start the development server
   ```bash
   npm run dev
   ```

7. The application should now be running at `http://localhost:5173`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| VITE_SUPABASE_URL | URL for your Supabase project | Yes |
| VITE_SUPABASE_ANON_KEY | Anonymous key for Supabase | Yes |
| VITE_OPENAI_API_KEY | OpenAI API key | Optional for local dev |

## Deployment

For production deployment, we recommend:
- Deploying the frontend to Vercel, Netlify, or similar
- Ensuring your Supabase project has appropriate RLS policies
- Setting up proper edge functions for video processing
- Using OpenAI for production AI processing

## Database Schema

See the migration files in `/supabase/migrations` for the complete database schema, including:
- User authentication
- Recipes
- Video frames
- Processing queue
- Recipe interactions

## Supabase Migrations

### Prerequisites
- Supabase CLI
  ```bash
  brew install supabase/tap/supabase
  ```
- Docker Desktop
  ```bash
  brew install --cask docker
  ```
  
### Running Supabase Locally
1. Start the local Supabase instance
   ```bash
   supabase start
   ```
   This will launch all required services (PostgreSQL, API, Auth, etc.)

2. View local Supabase Studio
   After starting, the CLI will output a Studio URL (typically http://localhost:54323)

### Managing Migrations

#### Creating a New Migration
1. Generate a timestamped migration file
   ```bash
   supabase migration new your_migration_name
   ```

2. Edit the generated SQL file in `supabase/migrations/[timestamp]_your_migration_name.sql`

#### Applying Migrations
1. Apply all pending migrations
   ```bash
   supabase migration up
   ```

2. Verify migration was applied
   ```bash
   supabase db execute "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;"
   ```

#### Resetting Database (Development Only)
If you need to reset your local database:
```bash
supabase db reset
```
This will drop all data and reapply migrations from scratch.

### Pushing Schema Changes to Production
To apply migrations to your production Supabase instance:

1. Link your local project to your Supabase project (first time only)
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. Push migrations to production (use with caution!)
   ```bash
   supabase db push
   ```

