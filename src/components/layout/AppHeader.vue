<template>
  <header class="app-header">
    <div class="header-left">
      <h1 class="page-title">{{ title }}</h1>
    </div>

    <div class="header-right">
      <!-- 搜索框 -->
      <div class="search-box">
        <el-input
          v-model="searchQuery"
          placeholder="搜索..."
          prefix-icon="Search"
          clearable
          style="width: 240px"
        />
      </div>

      <!-- 通知 -->
      <el-badge :value="notificationCount" :hidden="notificationCount === 0" class="notification-badge">
        <el-button :icon="Bell" circle />
      </el-badge>

      <!-- 用户信息 -->
      <el-dropdown trigger="click" @command="handleUserCommand">
        <div class="user-info">
          <el-avatar :size="32" :src="userAvatar">
            {{ userInitial }}
          </el-avatar>
          <span class="username">{{ userName }}</span>
          <el-icon><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <el-icon><User /></el-icon>
              个人中心
            </el-dropdown-item>
            <el-dropdown-item command="settings">
              <el-icon><Setting /></el-icon>
              设置
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search,
  Bell,
  ArrowDown,
  User,
  Setting,
  SwitchButton
} from '@element-plus/icons-vue'

interface Props {
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '仪表盘'
})

const router = useRouter()

// 搜索查询
const searchQuery = ref('')

// 通知数量
const notificationCount = ref(0)

// 用户信息
const userName = ref('管理员')
const userAvatar = ref('')

// 计算用户名首字母
const userInitial = computed(() => {
  return userName.value.charAt(0).toUpperCase()
})

// 处理用户菜单命令
const handleUserCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'settings':
      router.push('/settings')
      break
    case 'logout':
      console.log('执行退出登录')
      break
  }
}
</script>

<style scoped lang="scss">
.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  height: 60px;
  padding: 0 24px;
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-box {
  :deep(.el-input__wrapper) {
    border-radius: 20px;
    background-color: #f5f7fa;
    box-shadow: none;
    
    &:hover, &:focus-within {
      background-color: #ffffff;
      box-shadow: 0 0 0 1px #dcdfe6 inset;
    }
  }
}

.notification-badge {
  .el-button {
    border: none;
    background-color: transparent;
    
    &:hover {
      background-color: #f5f7fa;
    }
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f7fa;
  }
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}
</style>
