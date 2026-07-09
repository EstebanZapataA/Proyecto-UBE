import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          supabase: ['@supabase/supabase-js'],
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
