import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['sockjs-client', '@stomp/stompjs'],
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // SockJS usa HTTP (xhr/streaming); ws:true provoca ECONNRESET en Vite
      '/ws': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
});
