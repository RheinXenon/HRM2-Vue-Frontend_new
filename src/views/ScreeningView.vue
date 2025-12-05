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
        <!-- 岗位列表（即简历组） -->
        <el-card class="groups-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">招聘岗位</span>
              <router-link to="/positions">
                <el-button type="primary" size="small">管理岗位</el-button>
              </router-link>
            </div>
          </template>
          <div v-if="positionsList.length === 0" class="empty-groups">
            <el-empty description="暂无岗位，请先创建岗位" :image-size="60">
              <router-link to="/positions">
                <el-button type="primary" size="small">创建岗位</el-button>
              </router-link>
            </el-empty>
          </div>
          <div v-else class="groups-list">
            <div 
              v-for="pos in positionsList" 
              :key="pos.id" 
              class="group-item-card"
              :class="{ active: selectedPositionId === pos.id }"
              @click="selectPosition(pos)"
            >
              <div class="group-header">
                <div class="group-title">
                  <span class="group-name">{{ pos.position }}</span>
                  <el-tag :type="getPositionStatusType(pos.status)" size="small">
                    {{ getPositionStatusText(pos.status) }}
                  </el-tag>
                </div>
                <div class="group-meta">{{ pos.resume_count || 0 }} 份简历</div>
              </div>
              <!-- 岗位中的简历列表 -->
              <div v-if="pos.resumes && pos.resumes.length > 0" class="resumes-preview">
                <div class="resumes-title">已分配的简历:</div>
                <div class="resumes-list">
                  <div 
                    v-for="resume in pos.resumes.slice(0, (pos as any).showAll ? undefined : 3)" 
                    :key="resume.id" 
                    class="resume-item"
                  >
                    <div class="resume-info">
                      <span class="resume-name">{{ resume.candidate_name || '未知候选人' }}</span>
                    </div>
                    <div class="resume-score" v-if="resume.screening_score">
                      <el-tag size="small" type="success">
                        {{ resume.screening_score.comprehensive_score }}
                      </el-tag>
                    </div>
                  </div>
                  <div 
                    v-if="pos.resumes.length > 3" 
                    class="toggle-resumes"
                    @click.stop="togglePositionResumes(pos)"
                  >
                    <span>{{ (pos as any).showAll ? '收起' : `展开剩余 ${pos.resumes.length - 3} 份` }}</span>
                    <el-icon><ArrowDown v-if="!(pos as any).showAll" /><ArrowUp v-else /></el-icon>
                  </div>
                </div>
              </div>
              <div v-else class="no-resumes">暂无简历</div>
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
                  {{ getHistoryTaskName(task) }}
                </div>
                <div class="history-meta">
                  <el-tag :type="getStatusType(task.status)" size="small">
                    {{ getStatusText(task.status) }}
                  </el-tag>
                  <span v-if="task.status === 'running'">进度: {{ task.progress }}%</span>
                  <span class="history-time">{{ formatDate(task.created_at) }}</span>
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
                <el-button
                  v-if="task.status === 'completed'"
                  size="small"
                  type="primary"
                  @click="showAddToGroupDialogFromHistory(task)"
                >
                  加入组
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

    <!-- 分配简历到岗位对话框 -->
    <el-dialog v-model="createGroupDialogVisible" title="分配简历到岗位" width="80%" @close="handleCreateDialogClose">
      <el-alert
        title="选择已完成初筛的简历，分配到当前选中的岗位"
        type="info"
        show-icon
        style="margin-bottom: 16px;"
      />
      
      <div v-if="selectedPositionId" class="selected-position-info">
        <span>目标岗位: </span>
        <el-tag type="primary">{{ positionData.position }}</el-tag>
      </div>
      <div v-else class="no-position-warning">
        <el-alert title="请先在左侧选择一个岗位" type="warning" show-icon />
      </div>
      
      <div class="resumes-selection">
        <el-table
          :data="availableResumes"
          row-key="id"
          style="width: 100%"
          v-loading="resumesLoading"
          max-height="400"
        >
          <el-table-column label="选择" width="60" align="center">
            <template #default="{ row }">
              <el-checkbox
                v-model="selectedResumeIds"
                :label="row.id"
              />
            </template>
          </el-table-column>
          <el-table-column prop="candidate_name" label="候选人" min-width="120">
            <template #default="{ row }">
              {{ row.candidate_name || '未知候选人' }}
            </template>
          </el-table-column>
          <el-table-column label="综合评分" width="100" align="center">
            <template #default="{ row }">
              <span v-if="row.screening_score">{{ row.screening_score.comprehensive_score }}</span>
              <span v-else>N/A</span>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="提交时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <template #footer>
        <el-button @click="createGroupDialogVisible = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="assignResumesToPosition"
          :disabled="selectedResumeIds.length === 0 || !selectedPositionId"
          :loading="creatingGroup"
        >
          分配到岗位 ({{ selectedResumeIds.length }})
        </el-button>
      </template>
    </el-dialog>

    <!-- 添加到岗位对话框 -->
    <el-dialog v-model="addToGroupDialogVisible" title="分配到岗位" width="500px">
      <el-select v-model="selectedGroupId" placeholder="请选择目标岗位" style="width: 100%">
        <el-option
          v-for="pos in positionsList"
          :key="pos.id"
          :label="`${pos.position} (${pos.resume_count || 0}份简历)`"
          :value="pos.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="addToGroupDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedGroupId" @click="addToGroup">确认分配</el-button>
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
import { Upload, Document, ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { positionApi, screeningApi } from '@/api'
import type {
  PositionData,
  ResumeGroup,
  ResumeScreeningTask,
  ResumeFile,
  ProcessingTask,
  ScreeningScore,
  ResumeData
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

// 岗位列表（替代简历组）
const positionsList = ref<PositionData[]>([])
const selectedPositionId = ref<string | null>(null)

// 简历组（保留兼容）
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
const selectedGroupId = ref('')
const previewFileData = ref<ResumeFile | null>(null)
const currentTaskForGroup = ref<ProcessingTask | null>(null)

// 创建简历组相关
const availableResumes = ref<ResumeData[]>([])
const selectedResumeIds = ref<string[]>([])
const resumesLoading = ref(false)
const creatingGroup = ref(false)

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

// 加载岗位列表（替代简历组）
const loadPositionsList = async () => {
  try {
    const result = await positionApi.getPositions({ include_resumes: true })
    positionsList.value = (result.positions || []).map(p => ({ ...p, showAll: false }))
    
    // 如果有岗位且未选中，默认选中第一个
    if (positionsList.value.length > 0 && !selectedPositionId.value) {
      selectedPositionId.value = positionsList.value[0].id || null
      positionData.value = positionsList.value[0]
    }
  } catch (err) {
    console.error('加载岗位列表失败:', err)
  }
}

// 选择岗位
const selectPosition = (pos: PositionData) => {
  selectedPositionId.value = pos.id || null
  positionData.value = pos
}

// 岗位状态映射
const getPositionStatusType = (status?: string) => {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
    pending: 'info',
    interview_analysis: 'warning',
    interview_analysis_completed: 'warning',
    comprehensive_screening: 'warning',
    completed: 'success'
  }
  return map[status || 'pending'] || 'info'
}

const getPositionStatusText = (status?: string) => {
  const map: Record<string, string> = {
    pending: '待分析',
    interview_analysis: '面试分析中',
    interview_analysis_completed: '面试分析完成',
    comprehensive_screening: '综合筛选中',
    completed: '已完成'
  }
  return map[status || 'pending'] || '待分析'
}

// 切换岗位中简历的展开/收起状态
const togglePositionResumes = (pos: PositionData & { showAll?: boolean }) => {
  (pos as any).showAll = !(pos as any).showAll
}

// 加载岗位数据（向后兼容）
const loadPositionData = async () => {
  try {
    const data = await positionApi.getCriteria()
    positionData.value = data
  } catch (err) {
    console.error('加载岗位数据失败:', err)
  }
}

// 加载简历组（包含简历详情）- 保留兼容
const loadResumeGroups = async () => {
  try {
    const groups = await screeningApi.getGroups({ include_resumes: true })
    resumeGroups.value = groups.map(g => ({ ...g, showAll: false }))
  } catch (err) {
    console.error('加载简历组失败:', err)
  }
}

// 切换组中简历的展开/收起状态
const toggleGroupResumes = (group: ResumeGroup & { showAll?: boolean }) => {
  group.showAll = !group.showAll
}

// 加载历史任务
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

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

const readFileAsText = async (file: File): Promise<string> => {
  const name = file.name.toLowerCase()
  const ext = name.split('.').pop() || ''

  // TXT 文件直接读取
  if (file.type.includes('text') || ext === 'txt') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string || '')
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file)
    })
  }

  // Word 文件 (.doc, .docx) 使用 mammoth 解析
  if (ext === 'doc' || ext === 'docx') {
    try {
      const mammoth = await import('mammoth')
      const arrayBuffer = await readFileAsArrayBuffer(file)
      const result = await mammoth.extractRawText({ arrayBuffer })
      return result.value || `[${file.name} 的内容解析为空]`
    } catch (err) {
      console.error('mammoth 解析失败:', err)
      return `[${file.name} - Word 解析失败]`
    }
  }

  // PDF 文件使用 pdfjs-dist 解析
  if (ext === 'pdf') {
    try {
      const arrayBuffer = await readFileAsArrayBuffer(file)
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
      
      // 设置 worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise

      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const strings = content.items.map((item: any) => item.str).join(' ')
        fullText += strings + '\n'
      }

      return fullText.trim() || `[${file.name} 的内容解析为空]`
    } catch (err) {
      console.error('pdf.js 解析失败:', err)
      return `[${file.name} - PDF 解析失败]`
    }
  }

  // 其他格式
  return `[${file.name} - 不支持的文件格式]`
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
  if (parsedFiles.length === 0) {
    ElMessage.warning('没有已解析的文件可提交')
    return
  }

  isSubmitting.value = true
  try {
    // 构建符合后端期望的 JSON 格式
    const uploadData = {
      position: positionData.value,
      resumes: parsedFiles.map(file => ({
        name: file.name,
        content: file.content || '',
        metadata: {
          size: file.file.size,
          type: file.file.type || 'text/plain'
        }
      }))
    }

    console.log('提交数据:', uploadData)

    const result = await screeningApi.submitScreening(uploadData)

    // 将任务添加到处理队列
    parsedFiles.forEach(file => {
      processingQueue.value.unshift({
        name: file.name,
        task_id: result.task_id,
        status: 'pending',
        progress: 0,
        created_at: new Date().toISOString(),
        applied_position: positionData.value.position
      })
    })

    clearAll()
    ElMessage.success(`成功提交 ${parsedFiles.length} 份简历进行初筛`)
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
const showCreateGroupDialog = async () => {
  selectedResumeIds.value = []
  createGroupDialogVisible.value = true
  await loadAvailableResumes()
}

// 加载可用于创建组的简历
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

// 检查简历是否应该被禁用（岗位不一致时）
const isResumeDisabled = (resume: ResumeData) => {
  if (selectedResumeIds.value.length === 0) return false
  const firstSelectedResume = availableResumes.value.find(
    r => selectedResumeIds.value.includes(r.id)
  )
  if (!firstSelectedResume) return false
  return resume.position_title !== firstSelectedResume.position_title
}

// 关闭创建弹窗时的清理
const handleCreateDialogClose = () => {
  selectedResumeIds.value = []
  availableResumes.value = []
}

// 分配简历到当前选中的岗位
const assignResumesToPosition = async () => {
  if (selectedResumeIds.value.length === 0) {
    ElMessage.warning('请至少选择一份简历')
    return
  }
  
  if (!selectedPositionId.value) {
    ElMessage.warning('请先选择一个目标岗位')
    return
  }
  
  creatingGroup.value = true
  try {
    const result = await positionApi.assignResumes(selectedPositionId.value, selectedResumeIds.value)
    ElMessage.success(`成功分配 ${result.assigned_count} 份简历到岗位`)
    createGroupDialogVisible.value = false
    loadPositionsList()  // 刷新岗位列表
  } catch (err) {
    console.error('分配简历失败:', err)
    ElMessage.error('分配简历失败')
  } finally {
    creatingGroup.value = false
  }
}

// 保留旧的 createGroup 函数用于兼容
const createGroup = async () => {
  await assignResumesToPosition()
}

const showAddToGroupDialog = (task: ProcessingTask) => {
  currentTaskForGroup.value = task
  selectedGroupId.value = ''
  addToGroupDialogVisible.value = true
}

// 添加简历到指定岗位
const addToGroup = async () => {
  if (!selectedGroupId.value || !currentTaskForGroup.value?.report_id) return
  try {
    await positionApi.assignResumes(selectedGroupId.value, [currentTaskForGroup.value.report_id])
    ElMessage.success('分配成功')
    addToGroupDialogVisible.value = false
    loadPositionsList()  // 刷新岗位列表
  } catch (err) {
    ElMessage.error('分配失败')
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

// 历史任务辅助函数
const getHistoryTaskName = (task: ResumeScreeningTask): string => {
  // 优先从 resume_data 获取候选人名
  if (task.resume_data && task.resume_data.length > 0) {
    const rd = task.resume_data[0] as any
    if (rd.candidate_name) return rd.candidate_name
  }
  // 其次从 reports 获取文件名
  if (task.reports && task.reports.length > 0) {
    const filename = task.reports[0].report_filename
    // 移除扩展名
    return filename?.replace(/\.[^/.]+$/, '') || '未知文件'
  }
  return '未知文件'
}

const getHistoryTaskScore = (task: ResumeScreeningTask): ScreeningScore | null => {
  if (task.resume_data && task.resume_data.length > 0) {
    return task.resume_data[0].scores || null
  }
  return null
}

const showAddToGroupDialogFromHistory = (task: ResumeScreeningTask) => {
  // 从历史任务获取 resume_data_id
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
    selectedGroupId.value = ''
    addToGroupDialogVisible.value = true
  } else {
    ElMessage.warning('无法获取简历数据ID')
  }
}

// 生命周期
onMounted(() => {
  loadPositionsList()  // 加载岗位列表（替代 loadResumeGroups）
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
  gap: 12px;
}

.group-item-card {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 2px solid #e4e7ed;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f0f2f5;
  }

  &.active {
    background: #ecf5ff;
    border-color: #409eff;
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;

    .group-title {
      display: flex;
      align-items: center;
      gap: 8px;

      .group-name {
        font-size: 14px;
        font-weight: 600;
        color: #303133;
      }
    }

    .group-meta {
      font-size: 12px;
      color: #909399;
    }
  }

  .resumes-preview {
    .resumes-title {
      font-size: 12px;
      color: #606266;
      margin-bottom: 8px;
    }

    .resumes-list {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .resume-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 10px;
        background: #fff;
        border-radius: 4px;
        border: 1px solid #ebeef5;

        .resume-info {
          display: flex;
          flex-direction: column;

          .resume-name {
            font-size: 13px;
            font-weight: 500;
            color: #303133;
          }

          .resume-position {
            font-size: 11px;
            color: #909399;
          }
        }
      }

      .toggle-resumes {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
        color: #409eff;
        cursor: pointer;
        font-size: 12px;

        &:hover {
          color: #66b1ff;
        }

        .el-icon {
          margin-left: 4px;
        }
      }
    }
  }

  .no-resumes {
    font-size: 12px;
    color: #c0c4cc;
    text-align: center;
    padding: 8px;
  }
}

// 分配简历到岗位弹窗
.selected-position-info {
  margin-bottom: 16px;
  padding: 12px;
  background: #f0f9eb;
  border-radius: 6px;
  
  span {
    color: #606266;
  }
}

.no-position-warning {
  margin-bottom: 16px;
}

.resumes-selection {
  max-height: 50vh;
  overflow-y: auto;
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

  .scores,
  .history-scores {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    
    .score-badge {
      display: inline-block;
      padding: 2px 8px;
      background: #f0f9eb;
      color: #67c23a;
      border-radius: 4px;
      font-size: 12px;
    }
  }

  .queue-time,
  .history-time {
    font-size: 12px;
    color: #c0c4cc;
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
