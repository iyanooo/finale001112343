import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      // Proxy IPFS API requests to avoid CORS issues
      '/ipfs-api': {
        target: 'https://ipfs.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ipfs-api/, '/api/v0'),
      },
    },
  },
});
