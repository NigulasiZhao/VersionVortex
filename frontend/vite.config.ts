import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import history from 'connect-history-api-fallback';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'history-fallback',
      configureServer(server: any) {
        const h = history({
          disableDotRule: true,
        });

        server.middlewares.use((req: any, res: any, next: any) => {
          const url = req.url.split('?')[0];

          // Vite 内部路径直接跳过
          if (url.startsWith('/@') || url.startsWith('/src/') || url.startsWith('/node_modules/')) {
            return next();
          }

          // API 和上传跳过
          if (url.startsWith('/api') || url.startsWith('/uploads')) {
            return next();
          }

          // 其他路径使用 history fallback
          h(req, res, next);
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 12005,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:12006',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:12006',
        changeOrigin: true,
      },
    },
  },
});
