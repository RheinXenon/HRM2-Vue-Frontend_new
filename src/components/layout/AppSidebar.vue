<template>
  <aside class="app-sidebar">
    <!-- Logo区域 -->
    <div class="sidebar-header">
      <div class="logo" @click="handleLogoClick">
        <div class="logo-icon">
          <el-icon :size="24"><Briefcase /></el-icon>
        </div>
        <span class="system-name">招聘管理系统</span>
      </div>
    </div>

    <!-- 导航菜单 -->
    <nav class="sidebar-nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <el-icon :size="20">
          <component :is="item.icon" />
        </el-icon>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>

    <!-- 底部设置 -->
    <div class="sidebar-footer">
      <router-link to="/settings" class="nav-item" :class="{ active: isActive('/settings') }">
        <el-icon :size="20"><Setting /></el-icon>
        <span class="nav-label">系统设置</span>
      </router-link>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Briefcase,
  HomeFilled,
  FolderOpened,
  Document,
  VideoCamera,
  ChatDotRound,
  Trophy,
  Setting
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

// 导航项配置
const navItems = [
  { path: '/', label: '仪表盘', icon: HomeFilled },
  { path: '/positions', label: '岗位设置', icon: Briefcase },
  { path: '/library', label: '简历库', icon: FolderOpened },
  { path: '/screening', label: '简历筛选', icon: Document },
  { path: '/video', label: '视频分析', icon: VideoCamera },
  { path: '/interview', label: '面试辅助', icon: ChatDotRound },
  { path: '/recommend', label: '最终推荐', icon: Trophy }
]

// 判断当前路由是否激活
const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

// Logo点击事件
const handleLogoClick = () => {
  router.push('/')
}
</script>

<style scoped lang="scss">
.app-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  width: 240px;
  height: 100vh;
  background: #ffffff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  height: 60px;
  padding: 0 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 12px;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.system-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  color: #606266;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background-color: #f5f7fa;
    color: #409eff;
  }

  &.active {
    background-color: #ecf5ff;
    color: #409eff;
  }
}

.nav-label {
  flex: 1;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #e4e7ed;
}
</style>
