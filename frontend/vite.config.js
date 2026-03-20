import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Use default Vite port — do NOT use 3002 (that's the API). Parallel `npm run dev`
    // was incrementing 3000→3001→3002 and colliding with Express (EADDRINUSE).
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
})
