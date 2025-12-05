<template>
  <div class="recommend-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">录用推荐系统</h1>
        <p class="page-desc">基于综合评估结果，提供候选人录用建议</p>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="content-grid">
      <!-- 左侧面板 -->
      <div class="left-panel">
        <!-- 简历组选择 -->
        <el-card class="groups-card" shadow="hover">
          <template #header>
            <span class="card-title">选择简历组</span>
          </template>
          <el-select
            v-model="selectedGroupId"
            placeholder="请选择简历组"
            style="width: 100%"
            @change="loadGroupDetails"
          >
            <el-option
              v-for="group in availableGroups"
              :key="group.id"
              :label="`${group.group_name} (${group.resume_count}份简历)`"
              :value="group.id"
            />
          </el-select>

          <!-- 简历组详情 -->
          <div v-if="selectedGroup" class="group-details">
            <div class="group-summary">
              <h4>{{ selectedGroup.group_name }}</h4>
              <p>{{ selectedGroup.description || '暂无描述' }}</p>
              <div class="group-stats">
                <el-tag :type="getGroupStatusType(selectedGroup.status)">
                  {{ getGroupStatusText(selectedGroup.status) }}
                </el-tag>
                <span class="resume-count">{{ selectedGroup.resume_count }} 份简历</span>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 岗位信息 -->
        <el-card class="position-card" shadow="hover">
          <template #header>
            <span class="card-title">岗位信息</span>
          </template>
          <div class="position-info">
            <div class="info-item">
              <span class="label">岗位:</span>
              <span class="value">{{ positionData.position }}</span>
            </div>
            <div class="info-item">
              <span class="label">经验:</span>
              <span class="value">{{ positionData.min_experience }}年以上</span>
            </div>
            <div class="info-item">
              <span class="label">学历:</span>
              <span class="value">{{ positionData.education?.join('、') || '不限' }}</span>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 右侧面板 -->
      <div class="right-panel">
        <el-card class="recommend-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">录用推荐</span>
            </div>
          </template>

          <!-- 综合分析操作区 -->
          <div v-if="selectedGroupId" class="analysis-section">
            <div class="analysis-actions">
              <el-button
                type="primary"
                :loading="isAnalysisLoading"
                :disabled="isAnalysisRunning"
                @click="startComprehensiveAnalysis"
              >
                {{ isAnalysisRunning ? '分析进行中...' : '开始综合分析' }}
              </el-button>
              <el-button
                v-if="isAnalysisRunning && analysisTask"
                type="danger"
                @click="stopAnalysis"
              >
                停止分析
              </el-button>
            </div>

            <!-- 分析进度 -->
            <div v-if="analysisTask" class="analysis-progress">
              <el-progress
                :percentage="analysisProgress"
                :status="getProgressStatus()"
                :text-inside="true"
                :stroke-width="20"
              />
              <div class="progress-info">
                <p><strong>状态:</strong> {{ getAnalysisStatusText(analysisTask.status) }}</p>
                <p v-if="analysisTask.current_speaker">
                  <strong>当前处理:</strong> {{ analysisTask.current_speaker }}
                </p>
                <p><strong>任务ID:</strong> {{ analysisTask.task_id }}</p>
              </div>

              <!-- 完成后下载报告 -->
              <div v-if="analysisTask.status === 'completed' && analysisTask.result_file" class="analysis-result">
                <el-button type="success" @click="downloadReport(analysisTask.result_file!)">
                  下载评估报告
                </el-button>
                <div v-if="analysisTask.result_summary" class="result-summary">
                  <h4>评估摘要:</h4>
                  <div v-html="renderMarkdown(analysisTask.result_summary)"></div>
                </div>
              </div>

              <!-- 失败信息 -->
              <el-alert
                v-if="analysisTask.status === 'failed'"
                title="分析失败"
                :description="analysisTask.error_message || '未知错误'"
                type="error"
                show-icon
                class="error-alert"
              />
            </div>
          </div>

          <!-- 候选人列表 -->
          <div v-if="!selectedGroup" class="empty-state">
            <el-empty description="请选择简历组以查看推荐结果" :image-size="100" />
          </div>

          <div v-else-if="!selectedGroup.resumes?.length" class="empty-state">
            <el-empty description="该简历组暂无简历" :image-size="100" />
          </div>

          <div v-else class="resumes-list">
            <div
              v-for="resume in sortedResumes"
              :key="resume.id"
              class="resume-item"
              :class="getRecommendationClass(resume)"
            >
              <div class="resume-header">
                <div class="candidate-info">
                  <h4>{{ resume.candidate_name || '未知候选人' }}</h4>
                  <div class="recommendation-badge" :class="getRecommendBadgeClass(resume)">
                    {{ getRecommendText(resume) }}
                  </div>
                </div>
                <div
                  class="score-badge"
                  :class="getScoreBadgeClass(resume.scores?.comprehensive_score)"
                >
                  <span class="score-label">综合评分</span>
                  <span class="score-value">{{ resume.scores?.comprehensive_score || 'N/A' }}</span>
                </div>
              </div>

              <!-- 评分详情 -->
              <div class="score-breakdown">
                <div class="score-item">
                  <span class="label">HR评分:</span>
                  <strong>{{ resume.scores?.hr_score || 'N/A' }}</strong>
                </div>
                <div class="score-item">
                  <span class="label">技术评分:</span>
                  <strong>{{ resume.scores?.technical_score || 'N/A' }}</strong>
                </div>
                <div class="score-item">
                  <span class="label">管理评分:</span>
                  <strong>{{ resume.scores?.manager_score || 'N/A' }}</strong>
                </div>
              </div>

              <!-- 视频分析状态 -->
              <div v-if="resume.video_analysis_status" class="video-status">
                <span class="label">视频分析:</span>
                <el-tag :type="getStatusType(resume.video_analysis_status)" size="small">
                  {{ getStatusText(resume.video_analysis_status) }}
                </el-tag>
              </div>

              <!-- 摘要 -->
              <div v-if="resume.summary" class="resume-summary">
                <h5>初筛摘要:</h5>
                <div v-html="renderMarkdown(resume.summary)"></div>
              </div>

              <!-- 操作按钮 -->
              <div class="resume-actions">
                <el-button size="small" @click="previewReport(resume.report_md_url)">
                  初筛报告
                </el-button>
                <el-button
                  size="small"
                  :type="resume.video_analysis_status === 'completed' ? 'success' : 'primary'"
                  @click="goToVideoAnalysis(resume)"
                >
                  {{ resume.video_analysis_status === 'completed' ? '查看面试分析' : '面试分析' }}
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import { positionApi, screeningApi, recommendApi } from '@/api'
import type { PositionData, ResumeGroup, ResumeData, InterviewEvaluationTask } from '@/types'

const router = useRouter()

// 响应式数据
const positionData = ref<PositionData>({
  position: '前端开发工程师',
  required_skills: [],
  optional_skills: [],
  min_experience: 2,
  education: ['本科'],
  certifications: [],
  salary_range: [8000, 20000],
  project_requirements: { min_projects: 0, team_lead_experience: false }
})

const availableGroups = ref<ResumeGroup[]>([])
const selectedGroupId = ref('')
const selectedGroup = ref<ResumeGroup | null>(null)

// 分析任务相关
const analysisTask = ref<InterviewEvaluationTask | null>(null)
const isAnalysisLoading = ref(false)
const pollingTimer = ref<number | null>(null)

// 计算属性
const isAnalysisRunning = computed(() => {
  return analysisTask.value?.status === 'pending' || analysisTask.value?.status === 'processing'
})

const analysisProgress = computed(() => {
  return analysisTask.value?.progress || 0
})

const sortedResumes = computed(() => {
  if (!selectedGroup.value?.resumes) return []
  return [...selectedGroup.value.resumes].sort((a, b) => {
    const scoreA = a.scores?.comprehensive_score || 0
    const scoreB = b.scores?.comprehensive_score || 0
    return scoreB - scoreA
  })
})

// 加载岗位数据
const loadPositionData = async () => {
  try {
    positionData.value = await positionApi.getCriteria()
  } catch (err) {
    console.error('加载岗位数据失败:', err)
  }
}

// 加载简历组列表
const loadAvailableGroups = async () => {
  try {
    availableGroups.value = await screeningApi.getGroups()
  } catch (err) {
    console.error('加载简历组失败:', err)
  }
}

// 加载简历组详情
const loadGroupDetails = async () => {
  if (!selectedGroupId.value) {
    selectedGroup.value = null
    analysisTask.value = null
    return
  }

  try {
    selectedGroup.value = await screeningApi.getGroupDetail(selectedGroupId.value)
    // 检查是否有进行中的分析任务
    checkExistingTask()
  } catch (err) {
    console.error('加载简历组详情失败:', err)
    ElMessage.error('加载简历组详情失败')
  }
}

// 检查现有任务
const checkExistingTask = async () => {
  try {
    const tasks = await recommendApi.getEvaluationList()
    const existingTask = tasks.find(t => t.group_id === selectedGroupId.value)
    if (existingTask) {
      analysisTask.value = existingTask
      if (isAnalysisRunning.value) {
        startPolling()
      }
    }
  } catch (err) {
    console.error('检查任务失败:', err)
  }
}

// 开始综合分析
const startComprehensiveAnalysis = async () => {
  if (!selectedGroupId.value) return

  isAnalysisLoading.value = true
  try {
    const task = await recommendApi.createEvaluation(selectedGroupId.value)
    analysisTask.value = task
    startPolling()
    ElMessage.success('分析任务已启动')
  } catch (err) {
    console.error('启动分析失败:', err)
    ElMessage.error('启动分析失败')
  } finally {
    isAnalysisLoading.value = false
  }
}

// 停止分析
const stopAnalysis = async () => {
  if (!analysisTask.value?.task_id) return

  try {
    await recommendApi.stopEvaluation(analysisTask.value.task_id)
    stopPolling()
    analysisTask.value = null
    ElMessage.success('分析已停止')
  } catch (err) {
    ElMessage.error('停止分析失败')
  }
}

// 轮询任务状态
const startPolling = () => {
  if (pollingTimer.value) return
  pollingTimer.value = window.setInterval(pollTaskStatus, 3000)
}

const stopPolling = () => {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

const pollTaskStatus = async () => {
  if (!analysisTask.value?.task_id) {
    stopPolling()
    return
  }

  try {
    const status = await recommendApi.getEvaluationStatus(analysisTask.value.task_id)
    analysisTask.value = status

    if (status.status === 'completed' || status.status === 'failed') {
      stopPolling()
      if (status.status === 'completed') {
        ElMessage.success('综合分析已完成')
        loadGroupDetails()
      }
    }
  } catch (err) {
    console.error('获取任务状态失败:', err)
  }
}

// 下载报告
const downloadReport = async (filePath: string) => {
  try {
    const blob = await recommendApi.downloadReport(filePath)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evaluation_report.md`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    ElMessage.error('下载报告失败')
  }
}

// 预览报告
const previewReport = (url?: string) => {
  if (url) window.open(url, '_blank')
}

// 跳转视频分析
const goToVideoAnalysis = (resume: ResumeData) => {
  router.push(`/video?resume=${resume.id}`)
}

// 渲染 Markdown
const renderMarkdown = (text: string) => marked(text)

// 工具函数
const getGroupStatusType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'warning',
    interview_analysis: 'primary',
    completed: 'success'
  }
  return types[status] || 'info'
}

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

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'warning',
    processing: 'primary',
    completed: 'success',
    failed: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '等待中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败'
  }
  return texts[status] || status
}

const getProgressStatus = () => {
  if (!analysisTask.value) return ''
  if (analysisTask.value.status === 'completed') return 'success'
  if (analysisTask.value.status === 'failed') return 'exception'
  return ''
}

const getAnalysisStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '等待中',
    processing: '分析中',
    completed: '已完成',
    failed: '失败'
  }
  return texts[status] || status
}

const getScoreBadgeClass = (score?: number) => {
  if (score === undefined || score === null) return 'score-na'
  if (score >= 80) return 'score-high'
  if (score >= 60) return 'score-medium'
  return 'score-low'
}

const getRecommendationClass = (resume: ResumeData) => {
  const score = resume.scores?.comprehensive_score
  if (!score) return ''
  if (score >= 80) return 'recommend-strong'
  if (score >= 60) return 'recommend-normal'
  return 'recommend-weak'
}

const getRecommendBadgeClass = (resume: ResumeData) => {
  const score = resume.scores?.comprehensive_score
  if (!score) return 'badge-na'
  if (score >= 80) return 'badge-strong'
  if (score >= 60) return 'badge-normal'
  return 'badge-weak'
}

const getRecommendText = (resume: ResumeData) => {
  const score = resume.scores?.comprehensive_score
  if (!score) return '待评估'
  if (score >= 80) return '强烈推荐'
  if (score >= 60) return '建议录用'
  return '谨慎考虑'
}

// 生命周期
onMounted(() => {
  loadPositionData()
  loadAvailableGroups()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped lang="scss">
.recommend-view {
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

.content-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  align-items: start;
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

// 左侧面板
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.group-details {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.group-summary {
  h4 {
    margin: 0 0 8px 0;
    font-size: 15px;
    color: #303133;
  }

  p {
    margin: 0 0 12px 0;
    font-size: 13px;
    color: #909399;
  }

  .group-stats {
    display: flex;
    align-items: center;
    gap: 12px;

    .resume-count {
      font-size: 13px;
      color: #606266;
    }
  }
}

.position-info {
  .info-item {
    display: flex;
    margin-bottom: 10px;

    &:last-child {
      margin-bottom: 0;
    }

    .label {
      color: #909399;
      font-size: 13px;
      min-width: 50px;
    }

    .value {
      color: #303133;
      font-size: 13px;
    }
  }
}

// 分析区域
.analysis-section {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.analysis-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.analysis-progress {
  .progress-info {
    margin-top: 12px;

    p {
      margin: 4px 0;
      font-size: 13px;
      color: #606266;
    }
  }
}

.analysis-result {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;

  .result-summary {
    margin-top: 12px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #303133;
    }
  }
}

.error-alert {
  margin-top: 16px;
}

// 简历列表
.empty-state {
  padding: 40px 0;
}

.resumes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.resume-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border-left: 4px solid #909399;

  &.recommend-strong {
    border-left-color: #67c23a;
    background: #f0f9eb;
  }

  &.recommend-normal {
    border-left-color: #409eff;
    background: #ecf5ff;
  }

  &.recommend-weak {
    border-left-color: #e6a23c;
    background: #fdf6ec;
  }
}

.resume-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;

  .candidate-info {
    h4 {
      margin: 0 0 8px 0;
      font-size: 15px;
      color: #303133;
    }
  }
}

.recommendation-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;

  &.badge-strong {
    background: #67c23a;
    color: white;
  }

  &.badge-normal {
    background: #409eff;
    color: white;
  }

  &.badge-weak {
    background: #e6a23c;
    color: white;
  }

  &.badge-na {
    background: #909399;
    color: white;
  }
}

.score-badge {
  padding: 8px 12px;
  border-radius: 8px;
  text-align: center;
  background: #f0f9eb;

  &.score-high {
    background: #f0f9eb;
    .score-value { color: #67c23a; }
  }

  &.score-medium {
    background: #fdf6ec;
    .score-value { color: #e6a23c; }
  }

  &.score-low {
    background: #fef0f0;
    .score-value { color: #f56c6c; }
  }

  .score-label {
    display: block;
    font-size: 11px;
    color: #909399;
    margin-bottom: 2px;
  }

  .score-value {
    font-size: 18px;
    font-weight: 600;
  }
}

.score-breakdown {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;

  .score-item {
    font-size: 13px;

    .label {
      color: #909399;
    }

    strong {
      color: #303133;
      margin-left: 4px;
    }
  }
}

.video-status {
  margin: 12px 0;
  font-size: 13px;

  .label {
    color: #909399;
    margin-right: 8px;
  }
}

.resume-summary {
  margin: 12px 0;

  h5 {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #303133;
  }

  :deep(p) {
    margin: 0;
    font-size: 13px;
    color: #606266;
    line-height: 1.6;
  }
}

.resume-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
