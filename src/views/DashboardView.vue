<template>
  <div class="dashboard-view">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <el-card v-for="stat in statCards" :key="stat.title" class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-info">
            <div class="stat-title">{{ stat.title }}</div>
            <div class="stat-value">{{ stat.value }}</div>
          </div>
          <div class="stat-icon" :style="{ backgroundColor: stat.bgColor }">
            <el-icon :size="24" :color="stat.color">
              <component :is="stat.icon" />
            </el-icon>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 快捷操作 -->
    <el-card class="quick-actions-card" shadow="hover">
      <template #header>
        <span class="card-title">快捷操作</span>
      </template>
      <div class="quick-actions-grid">
        <router-link
          v-for="action in quickActions"
          :key="action.to"
          :to="action.to"
          class="action-item"
        >
          <div class="action-icon" :style="{ backgroundColor: action.bgColor }">
            <el-icon :size="24" :color="action.color">
              <component :is="action.icon" />
            </el-icon>
          </div>
          <div class="action-info">
            <div class="action-label">{{ action.label }}</div>
            <div class="action-desc">{{ action.desc }}</div>
          </div>
        </router-link>
      </div>
    </el-card>

    <!-- 下方两栏布局 -->
    <div class="bottom-grid">
      <!-- 最近筛选任务 -->
      <el-card class="recent-tasks-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">最近筛选任务</span>
            <router-link to="/screening">
              <el-button type="primary" link>查看全部</el-button>
            </router-link>
          </div>
        </template>
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="3" animated />
        </div>
        <div v-else-if="recentTasks.length === 0" class="empty-container">
          <el-empty description="暂无筛选任务" :image-size="80" />
        </div>
        <div v-else class="task-list">
          <div v-for="task in recentTasks" :key="task.task_id" class="task-item">
            <div class="task-info">
              <div class="task-name">任务 #{{ task.task_id?.slice(0, 8) }}</div>
              <div class="task-time">{{ formatDate(task.created_at) }}</div>
            </div>
            <el-tag :type="getStatusType(task.status)" size="small">
              {{ getStatusText(task.status) }}
            </el-tag>
          </div>
        </div>
      </el-card>

      <!-- 简历组 -->
      <el-card class="resume-groups-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">简历组</span>
            <router-link to="/screening">
              <el-button type="primary" link>查看全部</el-button>
            </router-link>
          </div>
        </template>
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="3" animated />
        </div>
        <div v-else-if="recentGroups.length === 0" class="empty-container">
          <el-empty description="暂无简历组" :image-size="80" />
        </div>
        <div v-else class="group-list">
          <div v-for="group in recentGroups" :key="group.id" class="group-item">
            <div class="group-info">
              <div class="group-name">{{ group.group_name }}</div>
              <div class="group-meta">
                {{ group.position_title }} · {{ group.resume_count }} 份简历
              </div>
            </div>
            <el-tag :type="getGroupStatusType(group.status)" size="small">
              {{ getGroupStatusText(group.status) }}
            </el-tag>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 最近视频分析 -->
    <el-card class="recent-videos-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">最近视频分析</span>
          <router-link to="/video">
            <el-button type="primary" link>查看全部</el-button>
          </router-link>
        </div>
      </template>
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="2" animated />
      </div>
      <div v-else-if="recentVideos.length === 0" class="empty-container">
        <el-empty description="暂无视频分析" :image-size="80" />
      </div>
      <div v-else class="video-grid">
        <div v-for="video in recentVideos" :key="video.id" class="video-item">
          <div class="video-header">
            <div class="video-info">
              <div class="video-name">{{ video.candidate_name }}</div>
              <div class="video-position">{{ video.position_applied }}</div>
            </div>
            <el-tag :type="getStatusType(video.status)" size="small">
              {{ getStatusText(video.status) }}
            </el-tag>
          </div>
          <div v-if="video.status === 'completed' && video.confidence_score" class="video-score">
            <span class="score-label">置信度:</span>
            <span class="score-value">{{ (video.confidence_score * 100).toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, markRaw } from 'vue'
import {
  User,
  Clock,
  CircleCheck,
  DataLine,
  Briefcase,
  Document,
  VideoCamera,
  ChatDotRound
} from '@element-plus/icons-vue'
import { screeningApi, videoApi, recommendApi } from '@/api'
import type { ResumeScreeningTask, ResumeGroup, VideoAnalysis, InterviewEvaluationTask } from '@/types'

// 加载状态
const loading = ref(true)

// 统计数据
const stats = reactive({
  totalResumes: 0,
  pendingScreening: 0,
  completedInterviews: 0,
  pendingRecommendations: 0
})

// 最近数据
const recentTasks = ref<ResumeScreeningTask[]>([])
const recentGroups = ref<ResumeGroup[]>([])
const recentVideos = ref<VideoAnalysis[]>([])

// 统计卡片配置
const statCards = [
  {
    title: '总简历数',
    value: stats.totalResumes,
    icon: markRaw(User),
    color: '#409eff',
    bgColor: '#ecf5ff'
  },
  {
    title: '待筛选任务',
    value: stats.pendingScreening,
    icon: markRaw(Clock),
    color: '#e6a23c',
    bgColor: '#fdf6ec'
  },
  {
    title: '已完成面试',
    value: stats.completedInterviews,
    icon: markRaw(CircleCheck),
    color: '#67c23a',
    bgColor: '#f0f9eb'
  },
  {
    title: '待推荐',
    value: stats.pendingRecommendations,
    icon: markRaw(DataLine),
    color: '#909399',
    bgColor: '#f4f4f5'
  }
]

// 快捷操作配置
const quickActions = [
  {
    to: '/positions',
    label: '设置岗位',
    desc: '配置招聘标准',
    icon: markRaw(Briefcase),
    color: '#409eff',
    bgColor: '#ecf5ff'
  },
  {
    to: '/screening',
    label: '简历筛选',
    desc: '上传并筛选简历',
    icon: markRaw(Document),
    color: '#67c23a',
    bgColor: '#f0f9eb'
  },
  {
    to: '/video',
    label: '视频分析',
    desc: '分析候选人视频',
    icon: markRaw(VideoCamera),
    color: '#e6a23c',
    bgColor: '#fdf6ec'
  },
  {
    to: '/interview',
    label: '面试辅助',
    desc: '开始面试会话',
    icon: markRaw(ChatDotRound),
    color: '#909399',
    bgColor: '#f4f4f5'
  }
]

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取状态类型
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'warning',
    running: 'primary',
    processing: 'primary',
    completed: 'success',
    failed: 'danger'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '等待中',
    running: '进行中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败'
  }
  return texts[status] || status
}

// 获取简历组状态类型
const getGroupStatusType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'warning',
    interview_analysis: 'primary',
    interview_analysis_completed: 'info',
    comprehensive_screening: 'primary',
    completed: 'success'
  }
  return types[status] || 'info'
}

// 获取简历组状态文本
const getGroupStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '待处理',
    interview_analysis: '面试分析中',
    interview_analysis_completed: '面试分析完成',
    comprehensive_screening: '综合筛选中',
    completed: '已完成'
  }
  return texts[status] || status
}

// 加载数据
const fetchData = async () => {
  loading.value = true
  try {
    const [tasksResult, groups, videos, evaluations] = await Promise.all([
      screeningApi.getTaskHistory({ page: 1, page_size: 5 }).catch(() => ({ results: [], count: 0 })),
      screeningApi.getGroups().catch(() => []),
      videoApi.getVideoList().catch(() => []),
      recommendApi.getEvaluationList().catch(() => [])
    ])

    const tasks = tasksResult.results || []
    
    recentTasks.value = tasks.slice(0, 5)
    recentGroups.value = groups.slice(0, 5)
    recentVideos.value = videos.slice(0, 6)

    // 计算统计数据
    stats.totalResumes = groups.reduce((sum: number, g: ResumeGroup) => sum + g.resume_count, 0)
    stats.pendingScreening = tasks.filter((t: ResumeScreeningTask) => 
      t.status === 'pending' || t.status === 'running'
    ).length
    stats.completedInterviews = tasks.filter((t: ResumeScreeningTask) => 
      t.status === 'completed'
    ).length
    stats.pendingRecommendations = evaluations.filter((e: InterviewEvaluationTask) => 
      e.status === 'pending' || e.status === 'processing'
    ).length

    // 更新统计卡片
    statCards[0].value = stats.totalResumes
    statCards[1].value = stats.pendingScreening
    statCards[2].value = stats.completedInterviews
    statCards[3].value = stats.pendingRecommendations
  } catch (error) {
    console.error('加载仪表盘数据失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

// 统计卡片网格
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-card {
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-info {
  .stat-title {
    font-size: 14px;
    color: #909399;
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 600;
    color: #303133;
  }
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

// 快捷操作
.quick-actions-card {
  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    border-color: #409eff;
    background-color: #f5f7fa;
  }
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-info {
  .action-label {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 4px;
  }

  .action-desc {
    font-size: 12px;
    color: #909399;
  }
}

// 卡片通用样式
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.loading-container,
.empty-container {
  padding: 20px 0;
}

// 底部两栏
.bottom-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

// 任务列表
.task-list,
.group-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item,
.group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #fafafa;
  border-radius: 8px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f0f0f0;
  }
}

.task-info,
.group-info {
  .task-name,
  .group-name {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 4px;
  }

  .task-time,
  .group-meta {
    font-size: 12px;
    color: #909399;
  }
}

// 视频网格
.video-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.video-item {
  padding: 16px;
  background-color: #fafafa;
  border-radius: 8px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f0f0f0;
  }
}

.video-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.video-info {
  .video-name {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 4px;
  }

  .video-position {
    font-size: 12px;
    color: #909399;
  }
}

.video-score {
  font-size: 13px;
  
  .score-label {
    color: #909399;
  }

  .score-value {
    font-weight: 600;
    color: #303133;
    margin-left: 4px;
  }
}

// 响应式调整
@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .video-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 992px) {
  .bottom-grid {
    grid-template-columns: 1fr;
  }
}
</style>
