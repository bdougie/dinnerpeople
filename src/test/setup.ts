// Test setup file
import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('VITE_OPENAI_API_KEY', 'test-api-key');
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');