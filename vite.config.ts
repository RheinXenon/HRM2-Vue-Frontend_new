import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      // 岗位设置
      '/position-settings': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      // 简历筛选
      '/resume-screening': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      // 视频分析
      '/video-analysis': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      // 最终推荐
      '/final-recommend': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      // 面试辅助
      '/interview-assist': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      // 媒体文件
      '/media': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  }
})
