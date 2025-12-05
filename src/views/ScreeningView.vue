<template>
  <div class="screening-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">简历初筛系统</h1>
        <p class="page-desc">上传候选人简历，系统将自动进行初步筛选和匹配度分析</p>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="content-grid">
      <!-- 左侧面板 -->
      <div class="left-panel">
        <PositionList
          :positions="positionsList"
          :selected-position-id="selectedPositionId"
          @select="selectPosition"
          @assign="showAssignDialog"
          @show-resume-detail="showResumeDetail"
          @remove-resume="removeResumeFromPosition"
        />
      </div>

      <!-- 右侧面板 -->
      <div class="right-panel">
        <!-- 文件上传区域 -->
        <ResumeUpload
          ref="resumeUploadRef"
          :is-submitting="isSubmitting"
          @submit="submitFiles"
          @preview="previewFile"
          @files-changed="handleFilesChanged"
        />

        <!-- 处理队列 -->
        <ProcessingQueue
          :queue="processingQueue"
          @show-detail="showQueueItemDetail"
          @download-report="downloadReport"
          @add-to-group="showAddToGroupDialog"
        />

        <!-- 历史任务 -->
        <TaskHistory
          :tasks="historyTasks"
          :total="historyTotal"
          :loading="historyLoading"
          :current-status="historyParams.status"
          v-model:current-page="historyParams.page"
          v-model:page-size="historyParams.page_size"
          @refresh="loadHistoryTasks"
          @filter-by-status="filterByStatus"
          @show-detail="showHistoryTaskDetail"
          @download-report="downloadReport"
          @add-to-group="showAddToGroupDialogFromHistory"
          @page-change="loadHistoryTasks"
        />
      </div>
    </div>

    <!-- 分配简历到岗位对话框 -->
    <AssignResumeDialog
      v-model="createGroupDialogVisible"
      :selected-position-id="selectedPositionId"
      :position-name="positionData.position"
      :available-resumes="availableResumes"
      :loading="resumesLoading"
      :submitting="creatingGroup"
      @assign="assignResumesToPosition"
      @close="handleCreateDialogClose"
    />

    <!-- 添加到岗位对话框 -->
    <AddToGroupDialog
      v-model="addToGroupDialogVisible"
      :positions="positionsList"
      @confirm="addToGroup"
    />

    <!-- 简历预览对话框 -->
    <PreviewDialog
      v-model="previewDialogVisible"
      :file="previewFileData"
    />

    <!-- 简历详情对话框 -->
    <ResumeDetailDialog
      v-model="resumeDetailVisible"
      :resume="selectedResumeDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 组件导入
import {
  PositionList,
  ResumeUpload,
  ProcessingQueue,
  TaskHistory,
  AssignResumeDialog,
  AddToGroupDialog,
  PreviewDialog,
  ResumeDetailDialog
} from '@/components/screening'

// API 导入
import { positionApi, screeningApi } from '@/api'

// 类型导入
import type {
  PositionData,
  ResumeScreeningTask,
  ResumeFile,
  ProcessingTask,
  ResumeData
} from '@/types'

// ==================== 状态定义 ====================

// 岗位相关
const positionData = ref<PositionData>({
  position: '前端开发工程师',
  required_skills: ['HTML', 'JavaScript', 'CSS'],
  optional_skills: [],
  min_experience: 2,
  education: ['本科', '硕士'],
  certifications: [],
  salary_range: [8000, 20000],
  project_requirements: { min_projects: 2, team_lead_experience: false }
})
const positionsList = ref<PositionData[]>([])
const selectedPositionId = ref<string | null>(null)

// 上传相关
const resumeUploadRef = ref<InstanceType<typeof ResumeUpload>>()
const isSubmitting = ref(false)
const currentFiles = ref<ResumeFile[]>([])

// 处理队列
const processingQueue = ref<ProcessingTask[]>([])
const taskPollingTimer = ref<number | null>(null)

// 历史任务
const historyTasks = ref<ResumeScreeningTask[]>([])
const historyParams = reactive({ status: 'completed', page: 1, page_size: 10 })
const historyTotal = ref(0)
const historyLoading = ref(false)

// 对话框状态
const createGroupDialogVisible = ref(false)
const addToGroupDialogVisible = ref(false)
const previewDialogVisible = ref(false)
const resumeDetailVisible = ref(false)

// 对话框数据
const previewFileData = ref<ResumeFile | null>(null)
const selectedResumeDetail = ref<ResumeData | null>(null)
const currentTaskForGroup = ref<ProcessingTask | null>(null)

// 简历分配相关
const availableResumes = ref<ResumeData[]>([])
const resumesLoading = ref(false)
const creatingGroup = ref(false)

// ==================== 岗位管理 ====================

const loadPositionsList = async () => {
  try {
    const result = await positionApi.getPositions({ include_resumes: true })
    positionsList.value = (result.positions || []).map(p => ({ ...p, showAll: false }))
    
    if (positionsList.value.length > 0 && !selectedPositionId.value) {
      selectedPositionId.value = positionsList.value[0].id || null
      positionData.value = positionsList.value[0]
    }
  } catch (err) {
    console.error('加载岗位列表失败:', err)
  }
}

const selectPosition = (pos: PositionData) => {
  selectedPositionId.value = pos.id || null
  positionData.value = pos
}

const removeResumeFromPosition = async (pos: PositionData, resume: ResumeData) => {
  if (!pos.id || !resume.id) return
  
  try {
    await ElMessageBox.confirm(
      `确定要将 "${resume.candidate_name || '该简历'}" 从岗位中移除吗？`,
      '确认移除',
      { type: 'warning' }
    )
    
    await positionApi.removeResume(pos.id, resume.id)
    ElMessage.success('移除成功')
    loadPositionsList()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('移除简历失败:', err)
      ElMessage.error('移除失败')
    }
  }
}

// ==================== 文件上传 ====================

const handleFilesChanged = (files: ResumeFile[]) => {
  currentFiles.value = files
}

const submitFiles = async () => {
  const parsedFiles = currentFiles.value.filter(f => f.status === 'parsed')
  if (parsedFiles.length === 0) {
    ElMessage.warning('没有已解析的文件可提交')
    return
  }

  isSubmitting.value = true
  let successCount = 0
  
  try {
    // 为每份简历单独发送请求，获取独立的task_id
    for (const file of parsedFiles) {
      try {
        const uploadData = {
          position: positionData.value,
          resumes: [{
            name: file.name,
            content: file.content || '',
            metadata: {
              size: file.file.size,
              type: file.file.type || 'text/plain'
            }
          }]
        }

        const result = await screeningApi.submitScreening(uploadData)
        
        // 每份简历有独立的task_id
        processingQueue.value.unshift({
          name: file.name,
          task_id: result.task_id,
          status: 'pending',
          progress: 0,
          created_at: new Date().toISOString(),
          applied_position: positionData.value.position
        })
        
        successCount++
      } catch (err) {
        console.error(`提交 ${file.name} 失败:`, err)
        ElMessage.error(`${file.name} 提交失败`)
      }
    }

    if (successCount > 0) {
      resumeUploadRef.value?.clearAll()
      ElMessage.success(`成功提交 ${successCount} 份简历进行初筛`)
      startTaskPolling()
    }
  } catch (err) {
    console.error('提交失败:', err)
    ElMessage.error('提交失败')
  } finally {
    isSubmitting.value = false
  }
}

const previewFile = (file: ResumeFile) => {
  previewFileData.value = file
  previewDialogVisible.value = true
}

// ==================== 任务轮询 ====================

const startTaskPolling = () => {
  if (taskPollingTimer.value) return
  taskPollingTimer.value = window.setInterval(pollTaskStatus, 3000)
}

const stopTaskPolling = () => {
  if (taskPollingTimer.value) {
    clearInterval(taskPollingTimer.value)
    taskPollingTimer.value = null
  }
}

const pollTaskStatus = async () => {
  const pendingTasks = processingQueue.value.filter(
    t => t.status === 'pending' || t.status === 'running'
  )

  if (pendingTasks.length === 0) {
    stopTaskPolling()
    return
  }

  for (const task of pendingTasks) {
    if (!task.task_id) continue
    try {
      const status = await screeningApi.getTaskStatus(task.task_id)
      Object.assign(task, {
        status: status.status,
        progress: status.progress,
        current_speaker: status.current_speaker,
        report_id: status.reports?.[0]?.report_id,
        reports: status.reports,
        resume_data: status.resume_data
      })

      if (status.status === 'completed') {
        ElMessage.success(`"${task.name}" 初筛完成`)
        loadHistoryTasks()
      }
    } catch (err) {
      console.error('获取任务状态失败:', err)
    }
  }
}

// ==================== 历史任务 ====================

const loadHistoryTasks = async () => {
  historyLoading.value = true
  try {
    const result = await screeningApi.getTaskHistory(historyParams)
    historyTasks.value = result.tasks || []
    historyTotal.value = result.total || 0
  } catch (err) {
    console.error('加载历史任务失败:', err)
  } finally {
    historyLoading.value = false
  }
}

const filterByStatus = (status: string) => {
  historyParams.status = status
  historyParams.page = 1
  loadHistoryTasks()
}

// ==================== 下载报告 ====================

const downloadReport = async (reportId: string) => {
  try {
    const blob = await screeningApi.downloadReport(reportId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report_${reportId}.md`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    ElMessage.error('下载报告失败')
  }
}

// ==================== 简历详情 ====================

const showResumeDetail = (resume: ResumeData) => {
  selectedResumeDetail.value = resume
  resumeDetailVisible.value = true
}

const showQueueItemDetail = async (item: ProcessingTask) => {
  // 优先从 resume_data 获取数据（包含完整的筛选结果）
  const resumeDataItem = item.resume_data?.[0]
  
  const resumeData: ResumeData = {
    id: resumeDataItem?.id || item.report_id || item.task_id || '',
    candidate_name: resumeDataItem?.candidate_name || item.name,
    position_title: resumeDataItem?.position_title || item.applied_position || '',
    screening_score: resumeDataItem?.scores,
    screening_summary: resumeDataItem?.summary,
    resume_content: resumeDataItem?.resume_content || item.reports?.[0]?.resume_content,
    created_at: item.created_at
  }
  
  // 如果本地数据不完整，尝试从API获取详情
  // 使用 resume_data 的 id（而不是 report_id）
  const detailId = resumeDataItem?.id || item.report_id
  if (detailId && item.status === 'completed' && !resumeData.screening_summary) {
    try {
      const detail = await screeningApi.getResumeDetail(detailId)
      if (detail) {
        resumeData.resume_content = detail.resume_content || resumeData.resume_content
        resumeData.screening_summary = detail.screening_summary || resumeData.screening_summary
        resumeData.screening_score = detail.screening_score || resumeData.screening_score
        resumeData.candidate_name = detail.candidate_name || resumeData.candidate_name
      }
    } catch (err) {
      console.warn('获取简历详情失败:', err)
    }
  }
  
  selectedResumeDetail.value = resumeData
  resumeDetailVisible.value = true
}

const showHistoryTaskDetail = async (task: ResumeScreeningTask) => {
  const taskResumeData = (task.resume_data as any)?.[0]
  
  if (taskResumeData) {
    const resumeData: ResumeData = {
      id: taskResumeData.id || task.task_id,
      candidate_name: taskResumeData.candidate_name || getHistoryTaskName(task),
      position_title: taskResumeData.position_title || '',
      screening_score: taskResumeData.scores,
      screening_summary: taskResumeData.summary,
      resume_content: taskResumeData.resume_content,
      created_at: task.created_at
    }
    selectedResumeDetail.value = resumeData
    resumeDetailVisible.value = true
    return
  }
  
  const report = task.reports?.[0]
  const resumeData: ResumeData = {
    id: report?.report_id || task.task_id,
    candidate_name: getHistoryTaskName(task),
    position_title: '',
    resume_content: report?.resume_content,
    created_at: task.created_at
  }
  
  selectedResumeDetail.value = resumeData
  resumeDetailVisible.value = true
}

const getHistoryTaskName = (task: ResumeScreeningTask): string => {
  if (task.resume_data && task.resume_data.length > 0) {
    const rd = task.resume_data[0] as any
    if (rd?.candidate_name) return rd.candidate_name
  }
  if (task.reports && task.reports.length > 0) {
    const filename = task.reports[0]?.report_filename
    return filename?.replace(/\.[^/.]+$/, '') || '未知文件'
  }
  return '未知文件'
}

// ==================== 简历分配 ====================

const showAssignDialog = (pos: PositionData) => {
  selectedPositionId.value = pos.id || null
  showCreateGroupDialog()
}

const showCreateGroupDialog = async () => {
  createGroupDialogVisible.value = true
  await loadAvailableResumes()
}

const loadAvailableResumes = async () => {
  resumesLoading.value = true
  try {
    availableResumes.value = await screeningApi.getAvailableResumes()
  } catch (err) {
    console.error('加载可用简历失败:', err)
    ElMessage.error('加载简历列表失败')
  } finally {
    resumesLoading.value = false
  }
}

const handleCreateDialogClose = () => {
  availableResumes.value = []
}

const assignResumesToPosition = async (resumeIds: string[]) => {
  if (resumeIds.length === 0 || !selectedPositionId.value) return
  
  creatingGroup.value = true
  try {
    const result = await positionApi.assignResumes(selectedPositionId.value, resumeIds)
    ElMessage.success(`成功分配 ${result.assigned_count} 份简历到岗位`)
    createGroupDialogVisible.value = false
    loadPositionsList()
  } catch (err) {
    console.error('分配简历失败:', err)
    ElMessage.error('分配简历失败')
  } finally {
    creatingGroup.value = false
  }
}

const showAddToGroupDialog = (task: ProcessingTask) => {
  currentTaskForGroup.value = task
  addToGroupDialogVisible.value = true
}

const showAddToGroupDialogFromHistory = (task: ResumeScreeningTask) => {
  const resumeDataId = (task.resume_data?.[0] as any)?.id || task.reports?.[0]?.report_id
  if (resumeDataId) {
    currentTaskForGroup.value = {
      name: getHistoryTaskName(task),
      task_id: task.task_id,
      status: task.status,
      progress: task.progress,
      created_at: task.created_at,
      report_id: resumeDataId,
      reports: task.reports,
      resume_data: task.resume_data
    }
    addToGroupDialogVisible.value = true
  } else {
    ElMessage.warning('无法获取简历数据ID')
  }
}

const addToGroup = async (groupId: string) => {
  if (!currentTaskForGroup.value?.report_id) return
  try {
    await positionApi.assignResumes(groupId, [currentTaskForGroup.value.report_id])
    ElMessage.success('分配成功')
    addToGroupDialogVisible.value = false
    loadPositionsList()
  } catch (err) {
    ElMessage.error('分配失败')
  }
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadPositionsList()
  loadHistoryTasks()
})

onUnmounted(() => {
  stopTaskPolling()
})
</script>

<style scoped lang="scss">
.screening-view {
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

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .left-panel {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .left-panel {
    grid-template-columns: 1fr;
  }
}
</style>
