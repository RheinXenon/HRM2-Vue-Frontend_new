<template>
  <div class="control-bar">
    <el-button v-if="!isPaused" @click="$emit('pause')" :icon="VideoPause">暂停</el-button>
    <el-button v-else type="primary" @click="$emit('resume')" :icon="VideoPlay">继续</el-button>
    <el-button type="danger" @click="$emit('end')" :icon="Close">结束面试</el-button>
    <el-button @click="$emit('export')" :icon="Download">导出记录</el-button>
  </div>
</template>

<script setup lang="ts">
import { VideoPlay, VideoPause, Close, Download } from '@element-plus/icons-vue'

defineProps<{
  isPaused: boolean
}>()

defineEmits<{
  pause: []
  resume: []
  end: []
  export: []
}>()
</script>

<style scoped lang="scss">
.control-bar {
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
