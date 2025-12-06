<template>
  <div class="control-bar">
    <!-- 左侧：控制按钮 -->
    <div class="control-group">
      <el-button v-if="!isPaused" @click="$emit('pause')" :icon="VideoPause">暂停</el-button>
      <el-button v-else type="primary" @click="$emit('resume')" :icon="VideoPlay">继续</el-button>
    </div>
    
    <!-- 中间：结束按钮组 -->
    <div class="control-group end-group">
      <el-popconfirm
        title="确定要放弃本次面试吗？"
        confirm-button-text="确定放弃"
        cancel-button-text="取消"
        confirm-button-type="danger"
        :icon="WarningFilled"
        icon-color="#ef4444"
        @confirm="$emit('quit')"
      >
        <template #reference>
          <el-button type="info" plain :icon="Close">放弃面试</el-button>
        </template>
      </el-popconfirm>
      
      <el-button type="danger" :icon="Finished" @click="$emit('endAndSave')">
        结束并生成报告
      </el-button>
    </div>
    
    <!-- 右侧：导出 -->
    <div class="control-group">
      <el-button @click="$emit('export')" :icon="Download">导出记录</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VideoPlay, VideoPause, Close, Download, Finished, WarningFilled } from '@element-plus/icons-vue'

defineProps<{
  isPaused: boolean
}>()

defineEmits<{
  pause: []
  resume: []
  quit: []       // 放弃面试（不保存）
  endAndSave: [] // 结束并保存（生成报告）
  export: []
}>()
</script>

<style scoped lang="scss">
.control-bar {
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .control-group {
    display: flex;
    gap: 10px;
    
    &.end-group {
      // 结束按钮组居中
    }
  }
}
</style>
