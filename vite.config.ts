import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react', '@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  server: {
    proxy: {
      // Proxy API requests to your Node server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Ensure workers are handled correctly
        format: 'es',
        manualChunks: (id) => {
          // Separate FFmpeg into its own chunk
          if (id.includes('@ffmpeg')) {
            return 'ffmpeg';
          }
        }
      }
    }
  },
  worker: {
    format: 'es'
  }
});
