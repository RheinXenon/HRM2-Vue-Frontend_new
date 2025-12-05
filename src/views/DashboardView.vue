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
      <!-- 最近筛选任务（已完成） -->
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
          <el-empty description="暂无已完成的筛选任务" :image-size="80" />
        </div>
        <div v-else class="task-list">
          <div 
            v-for="task in recentTasks" 
            :key="task.task_id" 
            class="task-item"
            :class="`status-${task.status}`"
          >
            <div class="task-info">
              <div class="task-name">
                {{ getTaskName(task) }}
                <el-tag v-if="getTaskPosition(task)" type="info" size="small" effect="light" class="position-tag">
                  {{ getTaskPosition(task) }}
                </el-tag>
              </div>
              <div class="task-meta">
                <el-tag :type="getStatusType(task.status)" size="small">
                  {{ getStatusText(task.status) }}
                </el-tag>
                <span class="task-time">{{ formatDate(task.created_at) }}</span>
              </div>
              <!-- 评分显示 -->
              <div v-if="task.status === 'completed' && getTaskScore(task)" class="task-scores">
                <el-tag type="success" size="small" effect="plain">
                  综合: {{ getTaskScore(task)?.comprehensive_score }}
                </el-tag>
                <el-tag type="info" size="small" effect="plain">
                  HR: {{ getTaskScore(task)?.hr_score }}
                </el-tag>
                <el-tag type="warning" size="small" effect="plain">
                  技术: {{ getTaskScore(task)?.technical_score }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 岗位简历 -->
      <el-card class="resume-groups-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">岗位简历</span>
            <router-link to="/positions">
              <el-button type="primary" link>管理岗位</el-button>
            </router-link>
          </div>
        </template>
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="3" animated />
        </div>
        <div v-else-if="positionResumes.length === 0" class="empty-container">
          <el-empty description="暂无岗位或简历" :image-size="80" />
        </div>
        <div v-else class="group-list">
          <div v-for="pos in positionResumes" :key="pos.id" class="group-item">
            <div class="group-info">
              <div class="group-name">{{ pos.position }}</div>
              <div class="group-meta">
                {{ pos.resume_count || 0 }} 份简历已添加
              </div>
              <!-- 显示简历列表预览 -->
              <div v-if="pos.resumes && pos.resumes.length > 0" class="resume-preview">
                <span v-for="(resume, idx) in pos.resumes.slice(0, 3)" :key="resume.id" class="resume-name">
                  {{ resume.candidate_name || '未知' }}{{ idx < Math.min(pos.resumes.length, 3) - 1 ? '、' : '' }}
                </span>
                <span v-if="pos.resumes.length > 3" class="more-count">等{{ pos.resumes.length }}人</span>
              </div>
            </div>
            <el-tag type="primary" size="small">
              {{ pos.resume_count || 0 }} 份
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
  FolderChecked,
  CircleCheck,
  Trophy,
  Briefcase,
  Document,
  VideoCamera,
  ChatDotRound
} from '@element-plus/icons-vue'
import { screeningApi, videoApi, positionApi } from '@/api'
import type { ResumeScreeningTask, PositionData, VideoAnalysis, ScreeningScore } from '@/types'

// 加载状态
const loading = ref(true)

// 统计数据
const stats = reactive({
  totalResumes: 0,
  screenedResumes: 0,
  completedInterviews: 0,
  recommendedResumes: 0
})

// 最近数据
const recentTasks = ref<ResumeScreeningTask[]>([])
const positionResumes = ref<PositionData[]>([])
const recentVideos = ref<VideoAnalysis[]>([])

// 统计卡片配置
const statCards = reactive([
  {
    title: '总简历数',
    value: 0,
    icon: markRaw(User),
    color: '#409eff',
    bgColor: '#ecf5ff'
  },
  {
    title: '已初筛简历',
    value: 0,
    icon: markRaw(FolderChecked),
    color: '#67c23a',
    bgColor: '#f0f9eb'
  },
  {
    title: '已完成面试',
    value: 0,
    icon: markRaw(CircleCheck),
    color: '#e6a23c',
    bgColor: '#fdf6ec'
  },
  {
    title: '已总结推荐',
    value: 0,
    icon: markRaw(Trophy),
    color: '#9b59b6',
    bgColor: '#f5f0ff'
  }
])

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
    color: '#9b59b6',
    bgColor: '#f5f0ff'
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

// 获取任务名称（候选人姓名）
const getTaskName = (task: ResumeScreeningTask) => {
  // 优先从 resume_data 获取候选人名
  if (task.resume_data && task.resume_data.length > 0) {
    const names = task.resume_data.map(r => r.candidate_name || '未知').slice(0, 2)
    return names.join('、') + (task.resume_data.length > 2 ? ` 等${task.resume_data.length}人` : '')
  }
  // 从 reports 获取
  if (task.reports && task.reports.length > 0) {
    const report = task.reports[0]
    const filename = (report as any).original_filename
    return filename?.replace(/\.[^.]+$/, '') || `任务 #${task.task_id?.slice(0, 8)}`
  }
  return `任务 #${task.task_id?.slice(0, 8)}`
}

// 获取任务岗位
const getTaskPosition = (task: ResumeScreeningTask): string | null => {
  if (task.reports && task.reports.length > 0) {
    const posInfo = task.reports[0]?.position_info
    if (posInfo?.position) return posInfo.position
  }
  if (task.resume_data && task.resume_data.length > 0) {
    const rd = task.resume_data[0]
    if (rd?.position_title) return rd.position_title
  }
  return null
}

// 获取任务评分
const getTaskScore = (task: ResumeScreeningTask): ScreeningScore | null => {
  if (task.resume_data && task.resume_data.length > 0) {
    const rd = task.resume_data[0]
    if (rd?.scores) return rd.scores
  }
  return null
}

// 加载数据
const fetchData = async () => {
  loading.value = true
  try {
    // 获取所有已完成的任务（用于统计总简历数）
    const [allTasksResult, recentTasksResult, positionsResult, videos] = await Promise.all([
      screeningApi.getTaskHistory({ status: 'completed', page: 1, page_size: 100 }).catch(() => ({ tasks: [], total: 0 })),
      screeningApi.getTaskHistory({ status: 'completed', page: 1, page_size: 5 }).catch(() => ({ tasks: [], total: 0 })),
      positionApi.getPositions({ include_resumes: true }).catch(() => ({ positions: [], total: 0 })),
      videoApi.getVideoList().catch(() => [])
    ])

    const allTasks = allTasksResult.tasks || []
    const tasks = recentTasksResult.tasks || []
    const positions = positionsResult.positions || []
    const videosArr = Array.isArray(videos) ? videos : []
    
    // 显示数据
    recentTasks.value = tasks.slice(0, 5)
    positionResumes.value = positions.slice(0, 5)
    recentVideos.value = videosArr.slice(0, 6)

    // 计算统计数据
    // 1. 总简历数：从已完成任务中统计 resume_data 数量（每个任务可能有多个简历）
    let totalResumeCount = 0
    for (const task of allTasks) {
      if (task.resume_data && Array.isArray(task.resume_data)) {
        totalResumeCount += task.resume_data.length
      } else {
        // 如果没有 resume_data，至少算1个
        totalResumeCount += 1
      }
    }
    stats.totalResumes = totalResumeCount

    // 2. 已初筛简历：所有岗位分配的简历总数
    stats.screenedResumes = positions.reduce((sum: number, p: PositionData) => sum + (p.resume_count || 0), 0)

    // 3. 已完成面试：已完成视频分析的数量
    stats.completedInterviews = videosArr.filter((v: VideoAnalysis) => v.status === 'completed').length

    // 4. 已总结推荐：暂时设为0（需要后端提供最终推荐完成的统计接口）
    // TODO: 对接最终推荐完成统计 API
    stats.recommendedResumes = 0

    // 更新统计卡片
    if (statCards[0]) statCards[0].value = stats.totalResumes
    if (statCards[1]) statCards[1].value = stats.screenedResumes
    if (statCards[2]) statCards[2].value = stats.completedInterviews
    if (statCards[3]) statCards[3].value = stats.recommendedResumes
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
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #fafafa;
  border-radius: 8px;
  transition: background-color 0.2s;
  border-left: 3px solid transparent;

  &:hover {
    background-color: #f0f0f0;
  }

  &.status-completed {
    border-left-color: #67c23a;
  }

  &.status-running {
    border-left-color: #409eff;
  }

  &.status-failed {
    border-left-color: #f56c6c;
  }
}

.task-info,
.group-info {
  flex: 1;
  min-width: 0;
  
  .task-name,
  .group-name {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .task-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .task-time,
  .group-meta {
    font-size: 12px;
    color: #909399;
  }

  .position-tag {
    font-size: 11px;
  }

  .task-scores {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    
    .el-tag {
      font-size: 11px;
    }
  }

  .resume-preview {
    margin-top: 6px;
    font-size: 12px;
    color: #606266;
    
    .resume-name {
      color: #409eff;
    }
    
    .more-count {
      color: #909399;
    }
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
