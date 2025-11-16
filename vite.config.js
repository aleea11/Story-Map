import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

// Plugin untuk copy Service Worker
function copyServiceWorkerPlugin() {
  return {
    name: 'copy-service-worker',
    closeBundle() {
      const swSource = resolve(__dirname, 'src', 'public', 'sw.js');
      const distDir = resolve(__dirname, 'dist');
      const swDest = resolve(distDir, 'sw.js');
      
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true });
      }
      
      try {
        copyFileSync(swSource, swDest);
        console.log('✅ Service Worker copied to dist/sw.js');
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
    copyServiceWorkerPlugin()  // ← PLUGIN INI WAJIB!
  ],
  server: {
    port: 3000,
    open: true
  }
});