<template>
  <div class="settings-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">系统设置</h1>
      <p class="page-desc">配置系统参数和个人偏好</p>
    </div>

    <!-- 设置内容 -->
    <div class="settings-content">
      <!-- API 配置 -->
      <el-card class="settings-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">API 配置</span>
          </div>
        </template>
        <el-form label-width="120px" :model="apiSettings">
          <el-form-item label="后端地址">
            <el-input v-model="apiSettings.baseUrl" placeholder="http://localhost:8000" />
            <div class="form-tip">设置后端 API 服务地址</div>
          </el-form-item>
          <el-form-item label="请求超时">
            <el-input-number v-model="apiSettings.timeout" :min="5000" :max="60000" :step="1000" />
            <span class="unit-text">毫秒</span>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveApiSettings">保存配置</el-button>
            <el-button @click="testConnection">测试连接</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 系统偏好 -->
      <el-card class="settings-card" shadow="hover">
        <template #header>
          <span class="card-title">系统偏好</span>
        </template>
        <el-form label-width="120px" :model="systemSettings">
          <el-form-item label="自动刷新">
            <el-switch v-model="systemSettings.autoRefresh" />
            <span class="switch-label">自动刷新任务状态</span>
          </el-form-item>
          <el-form-item label="刷新间隔" v-if="systemSettings.autoRefresh">
            <el-input-number v-model="systemSettings.refreshInterval" :min="1" :max="60" />
            <span class="unit-text">秒</span>
          </el-form-item>
          <el-form-item label="通知提醒">
            <el-switch v-model="systemSettings.notifications" />
            <span class="switch-label">任务完成时发送通知</span>
          </el-form-item>
          <el-form-item label="语言">
            <el-select v-model="systemSettings.language" style="width: 200px">
              <el-option label="简体中文" value="zh-CN" />
              <el-option label="English" value="en-US" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveSystemSettings">保存设置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据管理 -->
      <el-card class="settings-card" shadow="hover">
        <template #header>
          <span class="card-title">数据管理</span>
        </template>
        <div class="data-actions">
          <div class="action-item">
            <div class="action-info">
              <h4>导出数据</h4>
              <p>导出所有岗位设置和简历组数据</p>
            </div>
            <el-button type="primary" @click="exportData">导出</el-button>
          </div>
          <div class="action-item">
            <div class="action-info">
              <h4>导入数据</h4>
              <p>从文件导入配置数据</p>
            </div>
            <el-button @click="importData">导入</el-button>
          </div>
          <div class="action-item danger">
            <div class="action-info">
              <h4>清除缓存</h4>
              <p>清除本地缓存的数据和设置</p>
            </div>
            <el-button type="danger" @click="clearCache">清除</el-button>
          </div>
        </div>
      </el-card>

      <!-- 关于 -->
      <el-card class="settings-card" shadow="hover">
        <template #header>
          <span class="card-title">关于系统</span>
        </template>
        <div class="about-info">
          <div class="info-row">
            <span class="label">系统名称:</span>
            <span class="value">HRM2 招聘管理系统</span>
          </div>
          <div class="info-row">
            <span class="label">版本号:</span>
            <span class="value">v1.0.0</span>
          </div>
          <div class="info-row">
            <span class="label">技术栈:</span>
            <span class="value">Vue 3 + TypeScript + Element Plus</span>
          </div>
          <div class="info-row">
            <span class="label">后端:</span>
            <span class="value">Django + Django REST Framework</span>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// API 设置
const apiSettings = reactive({
  baseUrl: import.meta.env.VITE_API_BASE || 'http://localhost:8000',
  timeout: 30000
})

// 系统设置
const systemSettings = reactive({
  autoRefresh: true,
  refreshInterval: 5,
  notifications: true,
  language: 'zh-CN'
})

// 保存 API 配置
const saveApiSettings = () => {
  localStorage.setItem('apiSettings', JSON.stringify(apiSettings))
  ElMessage.success('API 配置已保存')
}

// 测试连接
const testConnection = async () => {
  try {
    const response = await fetch(`${apiSettings.baseUrl}/api/v1/positions/criteria/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })
    if (response.ok) {
      ElMessage.success('连接成功')
    } else {
      ElMessage.error(`连接失败: ${response.status}`)
    }
  } catch (err) {
    ElMessage.error('连接失败，请检查后端服务是否启动')
  }
}

// 保存系统设置
const saveSystemSettings = () => {
  localStorage.setItem('systemSettings', JSON.stringify(systemSettings))
  ElMessage.success('系统设置已保存')
}

// 导出数据
const exportData = () => {
  const data = {
    apiSettings,
    systemSettings,
    exportTime: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hrm2_settings_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('数据已导出')
}

// 导入数据
const importData = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (data.apiSettings) Object.assign(apiSettings, data.apiSettings)
      if (data.systemSettings) Object.assign(systemSettings, data.systemSettings)
      ElMessage.success('数据已导入')
    } catch {
      ElMessage.error('导入失败，文件格式错误')
    }
  }
  input.click()
}

// 清除缓存
const clearCache = () => {
  ElMessageBox.confirm('确定要清除所有本地缓存吗？此操作不可恢复。', '确认清除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    localStorage.clear()
    ElMessage.success('缓存已清除')
  }).catch(() => {})
}

// 初始化：读取本地存储的设置
const initSettings = () => {
  const savedApiSettings = localStorage.getItem('apiSettings')
  const savedSystemSettings = localStorage.getItem('systemSettings')
  
  if (savedApiSettings) {
    try {
      Object.assign(apiSettings, JSON.parse(savedApiSettings))
    } catch {}
  }
  
  if (savedSystemSettings) {
    try {
      Object.assign(systemSettings, JSON.parse(savedSystemSettings))
    } catch {}
  }
}

initSettings()
</script>

<style scoped lang="scss">
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  .page-title {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
  }

  .page-desc {
    margin: 0;
    font-size: 14px;
    color: #909399;
  }
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.unit-text {
  margin-left: 12px;
  color: #909399;
  font-size: 14px;
}

.switch-label {
  margin-left: 12px;
  font-size: 14px;
  color: #606266;
}

// 数据管理
.data-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;

  &.danger {
    background: #fef0f0;
  }

  .action-info {
    h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: #303133;
    }

    p {
      margin: 0;
      font-size: 12px;
      color: #909399;
    }
  }
}

// 关于信息
.about-info {
  .info-row {
    display: flex;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }

    .label {
      width: 80px;
      color: #909399;
      font-size: 14px;
    }

    .value {
      color: #303133;
      font-size: 14px;
    }
  }
}
</style>
