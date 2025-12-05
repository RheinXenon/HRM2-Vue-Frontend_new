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
        <!-- 岗位信息卡片 -->
        <el-card class="position-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">当前招聘岗位</span>
              <router-link to="/positions">
                <el-button type="primary" link size="small">编辑</el-button>
              </router-link>
            </div>
          </template>
          <div class="position-info">
            <div class="info-item">
              <span class="label">岗位名称:</span>
              <span class="value">{{ positionData.position }}</span>
            </div>
            <div class="info-item">
              <span class="label">工作经验:</span>
              <span class="value">{{ positionData.min_experience }}年以上</span>
            </div>
            <div class="info-item">
              <span class="label">学历要求:</span>
              <span class="value">{{ positionData.education?.join('、') || '不限' }}</span>
            </div>
            <div class="info-item">
              <span class="label">薪资范围:</span>
              <span class="value">
                {{ positionData.salary_range?.[0] }} - {{ positionData.salary_range?.[1] }} 元/月
              </span>
            </div>
            <div class="info-item skills">
              <span class="label">必备技能:</span>
              <div class="tags">
                <el-tag v-for="skill in positionData.required_skills" :key="skill" size="small" type="primary">
                  {{ skill }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 简历组列表 -->
        <el-card class="groups-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">简历组</span>
              <el-button type="primary" size="small" @click="showCreateGroupDialog">
                新建分组
              </el-button>
            </div>
          </template>
          <div v-if="resumeGroups.length === 0" class="empty-groups">
            <el-empty description="暂无简历组" :image-size="60" />
          </div>
          <div v-else class="groups-list">
            <div v-for="group in resumeGroups" :key="group.id" class="group-item">
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

      <!-- 右侧面板 -->
      <div class="right-panel">
        <!-- 文件上传区域 -->
        <el-card class="upload-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">简历上传与初筛</span>
              <el-tag :type="uploadStatus.type" effect="plain">{{ uploadStatus.text }}</el-tag>
            </div>
          </template>

          <!-- 上传区域 -->
          <div
            class="upload-area"
            :class="{ 'drag-over': isDragOver }"
            @drop="handleDrop"
            @dragover="handleDragover"
            @dragleave="handleDragleave"
          >
            <div class="upload-content">
              <el-icon :size="48" color="#c0c4cc"><Upload /></el-icon>
              <div class="upload-text">
                <p>将简历文件拖拽到此处，或</p>
                <el-button type="primary" @click="triggerFileInput">点击选择文件</el-button>
              </div>
              <p class="upload-hint">支持 PDF、DOC、DOCX、TXT 格式，单个文件不超过10MB</p>
            </div>
            <input
              ref="fileInput"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              style="display: none"
              @change="handleFileSelect"
            />
          </div>

          <!-- 文件列表 -->
          <div v-if="selectedFiles.length > 0" class="file-list">
            <div class="file-list-header">
              <h4>已选文件 ({{ selectedFiles.length }})</h4>
            </div>
            <div class="file-items">
              <div v-for="(file, index) in selectedFiles" :key="file.id" class="file-item">
                <div class="file-info">
                  <el-icon :size="20" color="#409eff"><Document /></el-icon>
                  <div class="file-details">
                    <span class="file-name">{{ file.name }}</span>
                    <span class="file-size">{{ formatFileSize(file.size) }}</span>
                  </div>
                </div>
                <div class="file-actions">
                  <el-button v-if="file.status === 'parsing'" size="small" :loading="true" type="info">
                    解析中
                  </el-button>
                  <el-button v-else-if="file.status === 'parsed'" size="small" type="success" @click="previewFile(file)">
                    预览
                  </el-button>
                  <el-button v-else size="small" type="danger" @click="removeFile(index)">
                    移除
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="action-buttons">
              <el-button
                type="primary"
                :loading="isSubmitting"
                :disabled="!hasParsedFiles"
                @click="submitFiles"
              >
                {{ isSubmitting ? '提交中...' : `提交 ${parsedFilesCount} 份简历进行初筛` }}
              </el-button>
              <el-button @click="clearAll">清空列表</el-button>
            </div>
          </div>
        </el-card>

        <!-- 处理队列 -->
        <el-card class="queue-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">简历处理队列</span>
              <el-tag type="info">队列中 {{ processingQueue.length }} 份</el-tag>
            </div>
          </template>

          <div v-if="processingQueue.length === 0" class="empty-queue">
            <el-empty description="已提交的简历将在此显示" :image-size="60" />
          </div>
          <div v-else class="queue-list">
            <div
              v-for="(item, idx) in processingQueue"
              :key="item.task_id || idx"
              class="queue-item"
              :class="`status-${item.status}`"
            >
              <div class="queue-info">
                <div class="queue-name">{{ item.name }}</div>
                <div class="queue-meta">
                  <el-tag :type="getStatusType(item.status)" size="small">
                    {{ getStatusText(item.status) }}
                  </el-tag>
                  <span v-if="item.current_speaker" class="speaker">
                    {{ getSpeakerText(item.current_speaker) }}
                  </span>
                </div>
                <!-- 评分显示 -->
                <div v-if="item.status === 'completed' && getItemScore(item)" class="scores">
                  <span class="score-badge">
                    综合评分: {{ getItemScore(item)?.comprehensive_score }}
                  </span>
                </div>
                <div class="queue-time">{{ formatDate(item.created_at) }}</div>
              </div>
              <div class="queue-actions">
                <el-progress
                  v-if="item.status === 'running'"
                  :percentage="item.progress"
                  :show-text="false"
                  :stroke-width="6"
                  status="warning"
                  style="width: 100px"
                />
                <el-button
                  v-if="item.status === 'completed' && item.report_id"
                  size="small"
                  type="success"
                  @click="downloadReport(item.report_id!)"
                >
                  下载报告
                </el-button>
                <el-button
                  v-if="item.status === 'completed'"
                  size="small"
                  type="primary"
                  @click="showAddToGroupDialog(item)"
                >
                  加入分组
                </el-button>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 历史任务 -->
        <el-card class="history-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">初筛任务历史</span>
              <el-button type="primary" size="small" :loading="historyLoading" @click="loadHistoryTasks">
                刷新
              </el-button>
            </div>
          </template>

          <!-- 状态筛选 -->
          <div class="status-filter">
            <el-button
              v-for="status in statusFilters"
              :key="status.value"
              :type="historyParams.status === status.value ? status.btnType : 'default'"
              size="small"
              @click="filterByStatus(status.value)"
            >
              {{ status.label }}
            </el-button>
          </div>

          <div v-if="historyTasks.length === 0" class="empty-history">
            <el-empty description="暂无历史记录" :image-size="60" />
          </div>
          <div v-else class="history-list">
            <div
              v-for="task in historyTasks"
              :key="task.task_id"
              class="history-item"
              :class="`status-${task.status}`"
            >
              <div class="history-info">
                <div class="history-name">
                  {{ task.reports?.[0]?.report_filename || '未知文件' }}
                </div>
                <div class="history-meta">
                  <el-tag :type="getStatusType(task.status)" size="small">
                    {{ getStatusText(task.status) }}
                  </el-tag>
                  <span>{{ formatDate(task.created_at) }}</span>
                </div>
              </div>
              <div class="history-actions">
                <el-button
                  v-if="task.status === 'completed' && task.reports?.length"
                  size="small"
                  type="success"
                  @click="downloadReport(task.reports[0].report_id)"
                >
                  下载
                </el-button>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="historyTotal > 0" class="pagination">
            <el-pagination
              v-model:current-page="historyParams.page"
              v-model:page-size="historyParams.page_size"
              :total="historyTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              background
              @current-change="loadHistoryTasks"
              @size-change="loadHistoryTasks"
            />
          </div>
        </el-card>
      </div>
    </div>

    <!-- 创建简历组对话框 -->
    <el-dialog v-model="createGroupDialogVisible" title="新建简历组" width="500px">
      <el-form :model="newGroupForm" label-width="80px">
        <el-form-item label="组名称">
          <el-input v-model="newGroupForm.group_name" placeholder="请输入组名称" />
        </el-form-item>
        <el-form-item label="岗位">
          <el-input v-model="newGroupForm.position_title" placeholder="岗位名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="newGroupForm.description" type="textarea" placeholder="可选描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createGroupDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createGroup">创建</el-button>
      </template>
    </el-dialog>

    <!-- 添加到简历组对话框 -->
    <el-dialog v-model="addToGroupDialogVisible" title="添加到简历组" width="500px">
      <el-select v-model="selectedGroupId" placeholder="请选择简历组" style="width: 100%">
        <el-option
          v-for="group in resumeGroups"
          :key="group.id"
          :label="`${group.group_name} (${group.resume_count}份简历)`"
          :value="group.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="addToGroupDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedGroupId" @click="addToGroup">确认添加</el-button>
      </template>
    </el-dialog>

    <!-- 简历预览对话框 -->
    <el-dialog v-model="previewDialogVisible" title="简历内容预览" width="60%">
      <div class="preview-content">
        <h3>{{ previewFileData?.name }}</h3>
        <pre class="content-display">{{ previewFileData?.content || '无内容' }}</pre>
      </div>
      <template #footer>
        <el-button @click="previewDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Document } from '@element-plus/icons-vue'
import { positionApi, screeningApi } from '@/api'
import type {
  PositionData,
  ResumeGroup,
  ResumeScreeningTask,
  ResumeFile,
  ProcessingTask,
  ScreeningScore
} from '@/types'

// 岗位数据
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

// 简历组
const resumeGroups = ref<ResumeGroup[]>([])

// 文件相关
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const selectedFiles = ref<ResumeFile[]>([])
const isSubmitting = ref(false)

// 上传状态
const uploadStatus = reactive({ type: 'info' as const, text: '等待上传' })

// 处理队列
const processingQueue = ref<ProcessingTask[]>([])
const taskPollingTimer = ref<number | null>(null)

// 历史任务
const historyTasks = ref<ResumeScreeningTask[]>([])
const historyParams = reactive({ status: 'completed', page: 1, page_size: 10 })
const historyTotal = ref(0)
const historyLoading = ref(false)

// 对话框
const createGroupDialogVisible = ref(false)
const addToGroupDialogVisible = ref(false)
const previewDialogVisible = ref(false)
const newGroupForm = reactive({ group_name: '', position_title: '', description: '' })
const selectedGroupId = ref('')
const previewFileData = ref<ResumeFile | null>(null)
const currentTaskForGroup = ref<ProcessingTask | null>(null)

// 状态筛选选项
const statusFilters = [
  { value: 'completed', label: '已完成', btnType: 'success' as const },
  { value: 'running', label: '处理中', btnType: 'warning' as const },
  { value: 'failed', label: '失败', btnType: 'danger' as const },
  { value: 'pending', label: '队列中', btnType: 'info' as const }
]

// 计算属性
const hasParsedFiles = computed(() => selectedFiles.value.some(f => f.status === 'parsed'))
const parsedFilesCount = computed(() => selectedFiles.value.filter(f => f.status === 'parsed').length)

// 加载岗位数据
const loadPositionData = async () => {
  try {
    const data = await positionApi.getCriteria()
    positionData.value = data
    newGroupForm.position_title = data.position
  } catch (err) {
    console.error('加载岗位数据失败:', err)
  }
}

// 加载简历组
const loadResumeGroups = async () => {
  try {
    resumeGroups.value = await screeningApi.getGroups()
  } catch (err) {
    console.error('加载简历组失败:', err)
  }
}

// 加载历史任务
const loadHistoryTasks = async () => {
  historyLoading.value = true
  try {
    const result = await screeningApi.getTaskHistory(historyParams)
    historyTasks.value = result.results || []
    historyTotal.value = result.count || 0
  } catch (err) {
    console.error('加载历史任务失败:', err)
  } finally {
    historyLoading.value = false
  }
}

// 筛选状态
const filterByStatus = (status: string) => {
  historyParams.status = status
  historyParams.page = 1
  loadHistoryTasks()
}

// 文件处理方法
const triggerFileInput = () => fileInput.value?.click()

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) {
    processFiles(Array.from(target.files))
    target.value = ''
  }
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
  if (e.dataTransfer?.files) {
    processFiles(Array.from(e.dataTransfer.files))
  }
}

const handleDragover = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragleave = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
}

const processFiles = async (files: File[]) => {
  const validFiles = files.filter(file => {
    const isValidType = /\.(pdf|doc|docx|txt)$/i.test(file.name)
    const isValidSize = file.size <= 10 * 1024 * 1024
    if (!isValidType) ElMessage.error(`"${file.name}" 格式不支持`)
    if (!isValidSize) ElMessage.error(`"${file.name}" 超过10MB`)
    return isValidType && isValidSize
  })

  for (const file of validFiles) {
    const resumeFile: ResumeFile = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      content: '',
      status: 'pending'
    }
    selectedFiles.value.push(resumeFile)
    parseFileContent(resumeFile)
  }

  if (validFiles.length > 0) {
    ElMessage.success(`成功添加 ${validFiles.length} 个文件`)
    updateUploadStatus()
  }
}

const parseFileContent = async (resumeFile: ResumeFile) => {
  const target = selectedFiles.value.find(f => f.id === resumeFile.id)
  if (!target) return

  target.status = 'parsing'
  try {
    const content = await readFileAsText(resumeFile.file)
    target.content = content.replace(/\s+/g, ' ').trim()
    target.status = 'parsed'
  } catch {
    target.status = 'error'
    target.error = '解析失败'
  }
  updateUploadStatus()
}

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
  updateUploadStatus()
}

const clearAll = () => {
  selectedFiles.value = []
  updateUploadStatus()
}

const previewFile = (file: ResumeFile) => {
  previewFileData.value = file
  previewDialogVisible.value = true
}

const updateUploadStatus = () => {
  const total = selectedFiles.value.length
  const parsed = parsedFilesCount.value
  if (total === 0) {
    uploadStatus.type = 'info'
    uploadStatus.text = '等待上传'
  } else if (parsed === total) {
    uploadStatus.type = 'success'
    uploadStatus.text = `${parsed} 份已就绪`
  } else {
    uploadStatus.type = 'warning'
    uploadStatus.text = `${parsed}/${total} 已解析`
  }
}

// 提交文件
const submitFiles = async () => {
  const parsedFiles = selectedFiles.value.filter(f => f.status === 'parsed')
  if (parsedFiles.length === 0) return

  isSubmitting.value = true
  try {
    for (const file of parsedFiles) {
      const formData = new FormData()
      formData.append('resume_file', file.file)
      formData.append('position_info', JSON.stringify(positionData.value))

      const result = await screeningApi.submitScreening(formData)

      processingQueue.value.unshift({
        name: file.name,
        task_id: result.task_id,
        status: 'pending',
        progress: 0,
        created_at: new Date().toISOString(),
        applied_position: positionData.value.position
      })
    }

    clearAll()
    ElMessage.success('简历已提交进行初筛')
    startTaskPolling()
  } catch (err) {
    console.error('提交失败:', err)
    ElMessage.error('提交失败')
  } finally {
    isSubmitting.value = false
  }
}

// 任务轮询
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

// 下载报告
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

// 简历组相关
const showCreateGroupDialog = () => {
  newGroupForm.group_name = ''
  newGroupForm.description = ''
  createGroupDialogVisible.value = true
}

const createGroup = async () => {
  if (!newGroupForm.group_name) {
    ElMessage.warning('请输入组名称')
    return
  }
  try {
    await screeningApi.createGroup(newGroupForm)
    ElMessage.success('创建成功')
    createGroupDialogVisible.value = false
    loadResumeGroups()
  } catch (err) {
    ElMessage.error('创建失败')
  }
}

const showAddToGroupDialog = (task: ProcessingTask) => {
  currentTaskForGroup.value = task
  selectedGroupId.value = ''
  addToGroupDialogVisible.value = true
}

const addToGroup = async () => {
  if (!selectedGroupId.value || !currentTaskForGroup.value?.report_id) return
  try {
    await screeningApi.addResumeToGroup({
      group_id: selectedGroupId.value,
      resume_data_id: currentTaskForGroup.value.report_id
    })
    ElMessage.success('添加成功')
    addToGroupDialogVisible.value = false
    loadResumeGroups()
  } catch (err) {
    ElMessage.error('添加失败')
  }
}

// 工具函数
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'warning',
    running: 'primary',
    completed: 'success',
    failed: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '队列中',
    running: '处理中',
    completed: '已完成',
    failed: '失败'
  }
  return texts[status] || status
}

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

const getSpeakerText = (speaker: string) => {
  const map: Record<string, string> = {
    'HR_Expert': 'HR评分中...',
    'Technical_Expert': '技术评分中...',
    'Project_Manager_Expert': '管理评分中...',
    'Critic': '生成报告中...'
  }
  return map[speaker] || speaker
}

const getItemScore = (item: ProcessingTask): ScreeningScore | null => {
  return item.resume_data?.[0]?.scores || null
}

// 生命周期
onMounted(() => {
  loadPositionData()
  loadResumeGroups()
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

.position-info {
  .info-item {
    display: flex;
    margin-bottom: 12px;

    &.skills {
      flex-direction: column;
      gap: 8px;
    }

    .label {
      color: #909399;
      font-size: 13px;
      min-width: 70px;
    }

    .value {
      color: #303133;
      font-size: 13px;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
  }
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 6px;

  .group-name {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
  }

  .group-meta {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}

// 右侧面板
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// 上传区域
.upload-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  transition: all 0.2s;

  &:hover,
  &.drag-over {
    border-color: #409eff;
    background: #ecf5ff;
  }
}

.upload-content {
  .upload-text {
    margin: 16px 0;

    p {
      margin: 0 0 8px 0;
      color: #606266;
    }
  }

  .upload-hint {
    margin: 0;
    font-size: 12px;
    color: #909399;
  }
}

// 文件列表
.file-list {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.file-list-header h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #303133;
}

.file-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 6px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-details {
  .file-name {
    display: block;
    font-size: 13px;
    color: #303133;
  }

  .file-size {
    display: block;
    font-size: 12px;
    color: #909399;
  }
}

.action-buttons {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}

// 队列和历史列表
.queue-list,
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.queue-item,
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  border-left: 3px solid transparent;

  &.status-pending { border-left-color: #e6a23c; }
  &.status-running { border-left-color: #409eff; }
  &.status-completed { border-left-color: #67c23a; }
  &.status-failed { border-left-color: #f56c6c; }
}

.queue-info,
.history-info {
  .queue-name,
  .history-name {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 6px;
  }

  .queue-meta,
  .history-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #909399;
  }

  .scores {
    margin-top: 6px;
    
    .score-badge {
      display: inline-block;
      padding: 2px 8px;
      background: #f0f9eb;
      color: #67c23a;
      border-radius: 4px;
      font-size: 12px;
    }
  }

  .queue-time {
    font-size: 12px;
    color: #c0c4cc;
    margin-top: 4px;
  }
}

.queue-actions,
.history-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

// 状态筛选
.status-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

// 分页
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

// 预览内容
.preview-content {
  h3 {
    margin: 0 0 16px 0;
    color: #303133;
  }

  .content-display {
    background: #f6f8fa;
    padding: 16px;
    border-radius: 6px;
    max-height: 400px;
    overflow: auto;
    white-space: pre-wrap;
    font-family: monospace;
    font-size: 13px;
    color: #303133;
  }
}

// 空状态
.empty-groups,
.empty-queue,
.empty-history {
  padding: 20px 0;
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
