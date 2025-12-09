<template>
  <el-card class="history-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="card-title">初筛任务历史</span>
        <el-button type="primary" size="small" :loading="loading" @click="$emit('refresh')">
          刷新
        </el-button>
      </div>
    </template>

    <!-- 状态筛选 -->
    <div class="status-filter">
      <el-button
        v-for="status in statusFilters"
        :key="status.value"
        :type="currentStatus === status.value ? status.btnType : 'default'"
        size="small"
        @click="$emit('filterByStatus', status.value)"
      >
        {{ status.label }}
      </el-button>
    </div>

    <div v-if="tasks.length === 0" class="empty-history">
      <el-empty description="暂无历史记录" :image-size="60" />
    </div>
    <div v-else class="history-list">
      <div
        v-for="task in tasks"
        :key="task.task_id"
        class="history-item clickable"
        :class="`status-${task.status}`"
        @click="$emit('showDetail', task)"
      >
        <div class="history-info">
          <div class="history-name">
            {{ getHistoryTaskName(task) }}
            <el-tag v-if="getTaskPosition(task)" type="info" size="small" effect="light" class="position-tag">
              {{ getTaskPosition(task) }}
            </el-tag>
          </div>
          <div class="history-meta">
            <el-tag :type="getStatusType(task.status)" size="small">
              {{ getStatusText(task.status) }}
            </el-tag>
            <span v-if="task.status === 'running'">进度: {{ task.progress }}%</span>
            <span v-if="task.status === 'running' && task.current_speaker" class="current-speaker">
              当前处理: {{ task.current_speaker }}
            </span>
            <span v-if="task.status === 'running' && task.current_step !== undefined && task.total_steps" class="step-info">
              步骤: {{ task.current_step }}/{{ task.total_steps }}
            </span>
            <span class="history-time">{{ formatDate(task.created_at) }}</span>
          </div>
          <!-- 进度条 -->
          <div v-if="task.status === 'running'" class="progress-container">
            <el-progress :percentage="task.progress" :stroke-width="6" />
          </div>
          <!-- 简历内容预览（进行中任务） -->
          <div v-if="task.status === 'running' && task.resume_data && task.resume_data.length > 0" class="resume-preview">
            <div class="resume-name">
              <i class="el-icon-user"></i> 候选人: {{ task.resume_data[0]?.candidate_name || '未知候选人' }}
            </div>
            <div class="resume-content-preview">
              {{ getResumeContentPreview(task.resume_data[0]?.resume_content || '') }}
            </div>
          </div>
          <!-- 评分显示 -->
          <div v-if="task.status === 'completed' && getHistoryTaskScore(task)" class="history-scores">
            <el-tag type="success" size="small" effect="plain">
              综合: {{ getHistoryTaskScore(task)?.comprehensive_score }}
            </el-tag>
            <el-tag type="info" size="small" effect="plain">
              HR: {{ getHistoryTaskScore(task)?.hr_score }}
            </el-tag>
            <el-tag type="warning" size="small" effect="plain">
              技术: {{ getHistoryTaskScore(task)?.technical_score }}
            </el-tag>
            <el-tag size="small" effect="plain">
              管理: {{ getHistoryTaskScore(task)?.manager_score }}
            </el-tag>
          </div>
        </div>
        <div class="history-actions">
          <el-button
            v-if="task.status === 'completed' && getDownloadId(task)"
            size="small"
            type="success"
            @click.stop="$emit('downloadReport', getDownloadId(task)!)"
          >
            下载
          </el-button>
          <el-button
            v-if="task.status === 'completed'"
            size="small"
            type="primary"
            @click.stop="$emit('addToGroup', task)"
          >
            加入组
          </el-button>
          <el-button
            v-if="task.status === 'running'"
            size="small"
            type="warning"
            @click.stop="$emit('pauseTask', task.task_id)"
          >
            暂停
          </el-button>
          <el-button
            v-if="task.status === 'failed'"
            size="small"
            type="warning"
            @click.stop="handleRetryTask(task)"
          >
            重新检测
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click.stop="$emit('delete', task.task_id)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="total > 0" class="pagination">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
        @update:current-page="(val: number) => emit('update:currentPage', val)"
        @update:page-size="(val: number) => emit('update:pageSize', val)"
        @current-change="handlePageChange"
        @size-change="handlePageChange"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { useScreeningUtils } from '@/composables/useScreeningUtils'
import type { ResumeScreeningTask } from '@/types'
import { ElMessage } from 'element-plus';

const props = defineProps<{
  tasks: ResumeScreeningTask[]
  total: number
  loading: boolean
  currentStatus: string
  currentPage: number
  pageSize: number
}>()

const emit = defineEmits<{
  refresh: []
  filterByStatus: [status: string]
  showDetail: [task: ResumeScreeningTask]
  downloadReport: [reportId: string]
  addToGroup: [task: ResumeScreeningTask]
  pauseTask: [taskId: string]
  retryTask: [data: { resume_content: string, candidate_name: string, position_title: string }]
  delete: [taskId: string]
  'update:currentPage': [page: number]
  'update:pageSize': [size: number]
  pageChange: []
}>()

const { 
  formatDate, 
  getStatusType, 
  getStatusText, 
  getHistoryTaskName, 
  getHistoryTaskScore 
} = useScreeningUtils()

// 获取任务对应的岗位
const getTaskPosition = (task: ResumeScreeningTask): string => {
  // 优先从 resume_data 获取
  if (task.resume_data && task.resume_data.length > 0) {
    const rd = task.resume_data[0]
    if (rd?.position_title) return rd.position_title
  }
  // 其次从 reports 获取
  if (task.reports && task.reports.length > 0) {
    const posInfo = task.reports[0]?.position_info
    if (posInfo?.position) return posInfo.position
  }
  return ''
}

// 状态筛选选项
const statusFilters = [
  { value: 'completed', label: '已完成', btnType: 'success' as const },
  { value: 'running', label: '处理中', btnType: 'warning' as const },
  { value: 'failed', label: '失败', btnType: 'danger' as const },
  { value: 'pending', label: '队列中', btnType: 'info' as const }
]

// 获取下载报告的 ID（优先使用 resume_data 的 id）
const getDownloadId = (task: ResumeScreeningTask): string | null => {
  // 优先使用 resume_data 的 id
  if (task.resume_data && task.resume_data.length > 0) {
    const rd = task.resume_data[0]
    if (rd?.id) return rd.id
  }
  // 备选：使用 reports 的 report_id
  if (task.reports && task.reports.length > 0) {
    return task.reports[0]?.report_id || null
  }
  return null
}

// 获取简历内容预览
const getResumeContentPreview = (content: string): string => {
  if (!content) return ''
  // 截取前100个字符作为预览
  return content.length > 100 ? content.substring(0, 100) + '...' : content
}

// 处理重新检测任务
const handleRetryTask = (task: ResumeScreeningTask) => {
  if (!task.resume_data || task.resume_data.length === 0) {
    // 如果没有简历数据，可以显示一个提示或使用详情信息
    console.warn('没有可用于重新检测的简历数据');
    ElMessage.warning('没有可用于重新检测的简历数据');
    return
  }
  
  const resumeData = task.resume_data[0]
  const resume_content = resumeData?.resume_content
  const candidate_name = resumeData?.candidate_name
  const position_title = resumeData?.position_title
  
  if (!resume_content) {
    console.warn('没有简历内容可用于重新检测')
    return
  }
  
  // 发送重新检测事件，包含必要的数据
  emit('retryTask', {
    resume_content,
    candidate_name: candidate_name || '未知候选人',
    position_title: position_title || '未知职位'
  })
}

// 分页变化
const handlePageChange = () => {
  emit('pageChange')
}
</script>

<style scoped lang="scss">
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

.status-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.empty-history {
  padding: 20px 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  border-left: 3px solid transparent;
  transition: all 0.2s;

  &.clickable {
    cursor: pointer;
    
    &:hover {
      background: #f0f5ff;
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
    }
  }

  &.status-pending { border-left-color: #e6a23c; }
  &.status-running { border-left-color: #409eff; }
  &.status-completed { border-left-color: #67c23a; }
  &.status-failed { border-left-color: #f56c6c; }
}

.history-info {
  .history-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 6px;
    
    .position-tag {
      background-color: #e6f7ff;
      border-color: #91d5ff;
      color: #1890ff;
    }
  }

  .history-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #909399;
    
    .current-speaker {
      color: #409eff;
      font-weight: 500;
    }
    
    .step-info {
      color: #67c23a;
    }
  }
  
  .progress-container {
    margin-top: 8px;
    margin-bottom: 8px;
  }
  
  .resume-preview {
    margin-top: 8px;
    padding: 8px;
    background-color: #f9f9f9;
    border-radius: 4px;
    border-left: 3px solid #409eff;
    
    .resume-name {
      font-size: 12px;
      font-weight: 500;
      color: #409eff;
      margin-bottom: 4px;
    }
    
    .resume-content-preview {
      font-size: 12px;
      color: #606266;
      line-height: 1.4;
      max-height: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .history-scores {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .history-time {
    font-size: 12px;
    color: #c0c4cc;
  }
}

.history-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
