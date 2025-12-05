<template>
  <div class="main-layout">
    <!-- 侧边栏 -->
    <AppSidebar />

    <!-- 主内容区域 -->
    <div class="main-container">
      <!-- 顶部标题栏 -->
      <AppHeader :title="pageTitle" />

      <!-- 页面内容 -->
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const route = useRoute()

// 页面标题映射
const pageTitles: Record<string, string> = {
  '/': '仪表盘',
  '/positions': '岗位设置',
  '/library': '简历库',
  '/screening': '简历筛选',
  '/video': '视频分析',
  '/interview': '面试辅助',
  '/recommend': '最终推荐',
  '/settings': '系统设置'
}

// 计算当前页面标题
const pageTitle = computed(() => {
  // 获取基础路径
  const basePath = '/' + (route.path.split('/')[1] || '')
  return pageTitles[basePath] || '招聘管理系统'
})
</script>

<style scoped lang="scss">
.main-layout {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.main-container {
  margin-left: 240px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
</style>
