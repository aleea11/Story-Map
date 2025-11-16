import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

// ============================================
// FIXED: Copy Service Worker dari src/public ke dist
// ============================================
function copyServiceWorkerPlugin() {
  return {
    name: 'copy-service-worker',
    closeBundle() {
      const swSource = resolve(__dirname, 'src', 'public', 'service-worker.js');
      const distDir = resolve(__dirname, 'dist');
      const swDest = resolve(distDir, 'service-worker.js');
      
      // Ensure dist directory exists
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true });
      }
      
      try {
        if (existsSync(swSource)) {
          copyFileSync(swSource, swDest);
          console.log('✅ Service Worker copied from src/public/service-worker.js to dist/service-worker.js');
        } else {
          console.error('❌ Service Worker source not found at:', swSource);
        }
      } catch (error) {
        console.error('❌ Failed to copy Service Worker:', error);
      }
    }
  };
}

export default defineConfig({
  root: resolve(__dirname, 'src'),
  publicDir: resolve(__dirname, 'src', 'public'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src', 'index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    copyServiceWorkerPlugin()
  ],
  server: {
    port: 3000,
    open: true
  }
});