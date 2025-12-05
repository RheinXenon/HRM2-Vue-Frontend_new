<template>
  <div class="video-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">视频面试分析系统</h1>
        <p class="page-desc">通过AI技术分析视频面试内容，提供候选人综合素质评估</p>
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
        <el-card class="resumes-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">候选人简历</span>
            </div>
          </template>

          <div v-if="!selectedGroup" class="empty-state">
            <el-empty description="请选择简历组以查看简历信息" :image-size="100" />
          </div>

          <div v-else-if="!selectedGroup.resumes?.length" class="empty-state">
            <el-empty description="该简历组暂无简历" :image-size="100" />
          </div>

          <div v-else class="resumes-list">
            <div v-for="resume in selectedGroup.resumes" :key="resume.id" class="resume-item">
              <div class="resume-header">
                <div class="candidate-info">
                  <h4>{{ resume.candidate_name || '未知候选人' }}</h4>
                  <span class="position">{{ resume.position_title }}</span>
                </div>
                <div
                  class="score-badge"
                  :class="getScoreBadgeClass(resume.scores?.comprehensive_score)"
                >
                  <span class="score-label">综合评分</span>
                  <span class="score-value">{{ resume.scores?.comprehensive_score || 'N/A' }}</span>
                </div>
              </div>

              <!-- 初筛评分 -->
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

              <!-- 视频分析结果 -->
              <div
                v-if="resume.video_analysis_status === 'completed' && resume.video_analysis_result"
                class="video-analysis-scores"
              >
                <div class="section-title">视频分析评分</div>
                <div class="analysis-grid">
                  <div class="analysis-item fraud">
                    <span class="label">欺诈评分:</span>
                    <strong :class="getFraudScoreClass(resume.video_analysis_result.fraud_score)">
                      {{ resume.video_analysis_result.fraud_score?.toFixed(2) || 'N/A' }}
                    </strong>
                  </div>
                  <div class="analysis-item">
                    <span class="label">神经质:</span>
                    <strong>{{ resume.video_analysis_result.neuroticism_score?.toFixed(2) || 'N/A' }}</strong>
                  </div>
                  <div class="analysis-item">
                    <span class="label">外倾性:</span>
                    <strong>{{ resume.video_analysis_result.extraversion_score?.toFixed(2) || 'N/A' }}</strong>
                  </div>
                  <div class="analysis-item">
                    <span class="label">开放性:</span>
                    <strong>{{ resume.video_analysis_result.openness_score?.toFixed(2) || 'N/A' }}</strong>
                  </div>
                  <div class="analysis-item">
                    <span class="label">宜人性:</span>
                    <strong>{{ resume.video_analysis_result.agreeableness_score?.toFixed(2) || 'N/A' }}</strong>
                  </div>
                  <div class="analysis-item">
                    <span class="label">尽责性:</span>
                    <strong>{{ resume.video_analysis_result.conscientiousness_score?.toFixed(2) || 'N/A' }}</strong>
                  </div>
                </div>
              </div>

              <div v-else-if="resume.video_analysis_status" class="video-status">
                <span class="label">视频分析状态:</span>
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
                <el-button
                  size="small"
                  :disabled="!resume.report_md_url"
                  @click="previewReport(resume.report_md_url)"
                >
                  查看报告
                </el-button>
                <el-button
                  size="small"
                  :type="resume.video_analysis_status === 'completed' ? 'success' : 'primary'"
                  @click="startVideoAnalysis(resume)"
                >
                  {{ resume.video_analysis_status === 'completed' ? '查看分析结果' : '开始视频分析' }}
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 视频上传对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传视频进行分析" width="500px">
      <div class="upload-dialog-content">
        <p class="upload-hint">为候选人 <strong>{{ currentResume?.candidate_name }}</strong> 上传面试视频</p>
        <el-upload
          ref="uploadRef"
          drag
          :auto-upload="false"
          :limit="1"
          accept="video/*"
          :on-change="handleVideoChange"
        >
          <el-icon :size="48" color="#c0c4cc"><VideoCamera /></el-icon>
          <div class="el-upload__text">拖拽视频到此处，或<em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">支持常见视频格式，建议大小不超过500MB</div>
          </template>
        </el-upload>
      </div>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" :disabled="!selectedVideoFile" @click="submitVideo">
          开始分析
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { VideoCamera } from '@element-plus/icons-vue'
import { marked } from 'marked'
import { positionApi, screeningApi, videoApi } from '@/api'
import type { PositionData, ResumeGroup, ResumeData } from '@/types'

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

// 视频上传相关
const uploadDialogVisible = ref(false)
const currentResume = ref<ResumeData | null>(null)
const selectedVideoFile = ref<File | null>(null)
const uploading = ref(false)

// 加载岗位信息
const loadPositionData = async () => {
  try {
    const data = await positionApi.getCriteria()
    positionData.value = data
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
    return
  }

  try {
    selectedGroup.value = await screeningApi.getGroupDetail(selectedGroupId.value)
  } catch (err) {
    console.error('加载简历组详情失败:', err)
    ElMessage.error('加载简历组详情失败')
  }
}

// 开始视频分析
const startVideoAnalysis = (resume: ResumeData) => {
  if (resume.video_analysis_status === 'completed') {
    // 已完成，跳转查看详情
    router.push(`/video/${resume.id}`)
    return
  }

  currentResume.value = resume
  selectedVideoFile.value = null
  uploadDialogVisible.value = true
}

// 处理视频文件选择
const handleVideoChange = (file: any) => {
  selectedVideoFile.value = file.raw
}

// 提交视频
const submitVideo = async () => {
  if (!selectedVideoFile.value || !currentResume.value) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('video_file', selectedVideoFile.value)
    formData.append('candidate_name', currentResume.value.candidate_name || '未知')
    formData.append('position_applied', currentResume.value.position_title || positionData.value.position)
    formData.append('resume_data_id', currentResume.value.id)

    await videoApi.uploadVideo(formData)

    ElMessage.success('视频已提交分析')
    uploadDialogVisible.value = false

    // 刷新数据
    loadGroupDetails()
  } catch (err) {
    console.error('提交视频失败:', err)
    ElMessage.error('提交视频失败')
  } finally {
    uploading.value = false
  }
}

// 预览报告
const previewReport = (url?: string) => {
  if (url) {
    window.open(url, '_blank')
  }
}

// 渲染 Markdown
const renderMarkdown = (text: string) => {
  return marked(text)
}

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

const getScoreBadgeClass = (score?: number) => {
  if (score === undefined || score === null) return 'score-na'
  if (score >= 80) return 'score-high'
  if (score >= 60) return 'score-medium'
  return 'score-low'
}

const getFraudScoreClass = (score?: number) => {
  if (score === undefined || score === null) return ''
  if (score >= 0.7) return 'fraud-high'
  if (score >= 0.4) return 'fraud-medium'
  return 'fraud-low'
}

// 生命周期
onMounted(() => {
  loadPositionData()
  loadAvailableGroups()
})
</script>

<style scoped lang="scss">
.video-view {
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

// 右侧面板
.right-panel {
  min-height: 400px;
}

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
  border-left: 3px solid #409eff;
}

.resume-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;

  .candidate-info {
    h4 {
      margin: 0 0 4px 0;
      font-size: 15px;
      color: #303133;
    }

    .position {
      font-size: 13px;
      color: #909399;
    }
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

.video-analysis-scores {
  margin: 12px 0;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;

  .section-title {
    font-size: 13px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 10px;
  }

  .analysis-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .analysis-item {
    font-size: 12px;

    .label {
      color: #909399;
    }

    strong {
      margin-left: 4px;
      color: #303133;

      &.fraud-high { color: #f56c6c; }
      &.fraud-medium { color: #e6a23c; }
      &.fraud-low { color: #67c23a; }
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

// 上传对话框
.upload-dialog-content {
  .upload-hint {
    margin: 0 0 16px 0;
    color: #606266;
  }
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
