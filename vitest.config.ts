import path from 'path';
import { defineConfig } from 'vitest/config';

// 独立于 vite.config.ts：测试不需要 dev-sync-channel 中间件与构建分块配置
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
