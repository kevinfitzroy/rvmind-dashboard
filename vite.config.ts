import fs from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      fs: 'fs',
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host:'0.0.0.0',
    https: {
      key: fs.readFileSync('../192.168.8.145-key.pem'),
      cert: fs.readFileSync('../192.168.8.145.pem'),
    },
    // proxy: {
    //   '/api': {
    //     target: 'https://aec3-240e-878-c4-a5f5-c8c2-9dfc-8baa-10fe.ngrok-free.app',
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/api/, ''),
    //     headers: {
    //       'ngrok-skip-browser-warning': '1'
    //     }
    //   },
    //   '/socket.io': {
    //     target: 'https://aec3-240e-878-c4-a5f5-c8c2-9dfc-8baa-10fe.ngrok-free.app',
    //     changeOrigin: true,
    //     ws: true,
    //     headers: {
    //       'ngrok-skip-browser-warning': '1'
    //     }
    //   }
    // }
    
  },
  build: {
    outDir: resolve(__dirname, '../public'), // 指定输出目录到 NestJS 工程
    emptyOutDir: true, // 构建时清空输出目录
  },
});