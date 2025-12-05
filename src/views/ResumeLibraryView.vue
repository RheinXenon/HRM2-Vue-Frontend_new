<template>
  <div class="resume-library-view">
    <!-- 页面标题和操作区 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">简历库</h2>
        <span class="resume-count">共 {{ total }} 份简历</span>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showUploadDialog">
          <el-icon><Upload /></el-icon>
          上传简历
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选区 -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-row">
        <el-input
          v-model="keyword"
          placeholder="搜索文件名或候选人姓名"
          clearable
          style="width: 300px"
          @keyup.enter="search"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <el-select
          v-model="filters.isScreened"
          placeholder="筛选状态"
          clearable
          style="width: 140px"
        >
          <el-option label="已筛选" :value="true" />
          <el-option label="未筛选" :value="false" />
        </el-select>
        
        <el-select
          v-model="filters.isAssigned"
          placeholder="分配状态"
          clearable
          style="width: 140px"
        >
          <el-option label="已分配" :value="true" />
          <el-option label="未分配" :value="false" />
        </el-select>
        
        <el-button type="primary" @click="search">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
        
        <div class="filter-spacer"></div>
        
        <el-button
          type="danger"
          :disabled="!hasSelection"
          @click="batchDelete"
        >
          批量删除 ({{ selectedIds.length }})
        </el-button>
      </div>
    </el-card>

    <!-- 简历列表 -->
    <el-card class="list-card" shadow="never">
      <el-table
        :data="resumes"
        v-loading="loading"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        
        <el-table-column prop="filename" label="文件名" min-width="200">
          <template #default="{ row }">
            <div class="filename-cell">
              <el-icon class="file-icon"><Document /></el-icon>
              <span class="filename">{{ row.filename }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="candidate_name" label="候选人" width="120">
          <template #default="{ row }">
            <span v-if="row.candidate_name">{{ row.candidate_name }}</span>
            <span v-else class="text-muted">未识别</span>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="180">
          <template #default="{ row }">
            <div class="status-tags">
              <el-tag
                :type="row.is_screened ? 'success' : 'info'"
                size="small"
                effect="light"
              >
                {{ row.is_screened ? '已筛选' : '未筛选' }}
              </el-tag>
              <el-tag
                :type="row.is_assigned ? 'primary' : 'info'"
                size="small"
                effect="light"
              >
                {{ row.is_assigned ? '已分配' : '未分配' }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="标识" width="100">
          <template #default="{ row }">
            <span class="hash-value">{{ row.file_hash }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="file_size" label="大小" width="100">
          <template #default="{ row }">
            {{ formatFileSize(row.file_size) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="上传时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" link @click="downloadResume(row)">
              下载
            </el-button>
            <el-button size="small" type="primary" link @click="viewResume(row)">
              查看
            </el-button>
            <el-button size="small" type="primary" link @click="editResume(row)">
              编辑
            </el-button>
            <el-button size="small" type="danger" link @click="deleteResume(row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 上传对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="上传简历到简历库"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-upload
        ref="uploadRef"
        class="upload-area"
        drag
        multiple
        :auto-upload="false"
        :file-list="uploadFileList"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
        accept=".pdf,.docx,.txt,.md"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将简历文件拖拽到此处，或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 PDF、DOCX、TXT、Markdown 格式，单次最多上传 50 份
          </div>
        </template>
      </el-upload>

      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="uploading"
          :disabled="uploadFileList.length === 0"
          @click="handleUpload"
        >
          上传 ({{ uploadFileList.length }})
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看/编辑对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="isEditing ? '编辑简历信息' : '查看简历'"
      width="800px"
    >
      <template v-if="currentResume">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="文件名">{{ currentResume.filename }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ formatFileSize(currentResume.file_size) }}</el-descriptions-item>
          <el-descriptions-item label="上传时间">{{ formatDate(currentResume.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="文件哈希">
            <span class="hash-value">{{ currentResume.file_hash }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <el-form v-if="isEditing" :model="editForm" label-width="80px" style="margin-top: 20px">
          <el-form-item label="候选人">
            <el-input v-model="editForm.candidate_name" placeholder="请输入候选人姓名" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="editForm.notes" type="textarea" :rows="3" placeholder="请输入备注" />
          </el-form-item>
        </el-form>

        <div v-else class="resume-content-preview">
          <div class="preview-header">
            <h4>简历内容预览</h4>
            <el-tag size="small" type="info">{{ getFileTypeLabel(currentResume.filename) }}</el-tag>
          </div>
          <div class="content-text">
            <template v-if="currentResume.content || currentResume.content_preview">
              {{ formatResumeContent(currentResume.content || currentResume.content_preview || '') }}
            </template>
            <el-empty v-else description="暂无内容" :image-size="60" />
          </div>
        </div>
      </template>

      <template #footer>
        <el-button @click="detailDialogVisible = false">
          {{ isEditing ? '取消' : '关闭' }}
        </el-button>
        <el-button v-if="!isEditing" type="primary" @click="isEditing = true">
          编辑
        </el-button>
        <el-button v-else type="primary" :loading="saving" @click="saveEdit">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Upload, Search, Document, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { useResumeLibrary } from '@/composables/useResumeLibrary'
import { libraryApi, type LibraryResume } from '@/api'

const {
  loading,
  uploading,
  resumes,
  total,
  currentPage,
  pageSize,
  keyword,
  selectedIds,
  filters,
  hasSelection,
  loadResumes,
  uploadResumes,
  deleteResume,
  batchDelete,
  updateResume,
  search,
  resetFilters,
  handlePageChange,
  handleSizeChange,
  handleSelectionChange
} = useResumeLibrary()

// 上传相关
const uploadDialogVisible = ref(false)
const uploadFileList = ref<UploadFile[]>([])
const uploadRef = ref()

// 详情/编辑相关
const detailDialogVisible = ref(false)
const currentResume = ref<LibraryResume | null>(null)
const isEditing = ref(false)
const saving = ref(false)
const editForm = reactive({
  candidate_name: '',
  notes: ''
})

// 显示上传对话框
const showUploadDialog = () => {
  uploadFileList.value = []
  uploadDialogVisible.value = true
}

// 文件选择变化
const handleFileChange = (file: UploadFile, fileList: UploadFile[]) => {
  uploadFileList.value = fileList
}

// 文件移除
const handleFileRemove = (file: UploadFile, fileList: UploadFile[]) => {
  uploadFileList.value = fileList
}

// 执行上传
const handleUpload = async () => {
  if (uploadFileList.value.length === 0) return
  
  const files: Array<{ name: string; content: string; metadata?: { size?: number; type?: string } }> = []
  
  // 读取所有文件内容
  for (const file of uploadFileList.value) {
    if (!file.raw) continue
    
    try {
      const content = await readFileAsText(file.raw)
      files.push({
        name: file.name,
        content,
        metadata: {
          size: file.size,
          type: file.raw.type
        }
      })
    } catch (error) {
      console.error(`读取文件失败: ${file.name}`, error)
      ElMessage.error(`读取文件失败: ${file.name}`)
    }
  }
  
  if (files.length === 0) return
  
  try {
    await uploadResumes(files)
    uploadDialogVisible.value = false
    uploadFileList.value = []
  } catch (error) {
    // 错误已在 composable 中处理
  }
}

// 读取文件为 ArrayBuffer
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// 读取文件为文本（支持解析 PDF、Word）
const readFileAsText = async (file: File): Promise<string> => {
  const name = file.name.toLowerCase()
  const ext = name.split('.').pop() || ''

  // TXT、MD 文件直接读取
  if (file.type.includes('text') || ext === 'txt' || ext === 'md') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string || '')
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file)
    })
  }

  // Word 文件 (.docx) 使用 mammoth 解析
  // 注意：mammoth 只支持 .docx 格式，不支持旧版 .doc
  if (ext === 'docx') {
    try {
      const mammothModule = await import('mammoth')
      // 处理 ESM 和 CJS 模块兼容
      const mammoth = mammothModule.default || mammothModule
      const arrayBuffer = await readFileAsArrayBuffer(file)
      const result = await mammoth.extractRawText({ arrayBuffer })
      return result.value || `[${file.name} 的内容解析为空]`
    } catch (err) {
      console.error('mammoth 解析失败:', err)
      return `[${file.name} - Word 解析失败: ${err}]`
    }
  }

  // PDF 文件使用 pdfjs-dist 解析
  if (ext === 'pdf') {
    try {
      const arrayBuffer = await readFileAsArrayBuffer(file)
      // 动态导入 pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist')
      
      // 使用 Vite 的 ?url 导入本地 worker
      const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default

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
      return `[${file.name} - PDF 解析失败: ${err}]`
    }
  }

  // 其他格式
  return `[${file.name} - 不支持的文件格式]`
}

// 下载简历
const downloadResume = (resume: LibraryResume) => {
  if (!resume.content && !resume.content_preview) {
    ElMessage.warning('简历内容为空，无法下载')
    return
  }
  
  const content = resume.content || resume.content_preview || ''
  const ext = resume.filename.split('.').pop()?.toLowerCase() || 'txt'
  
  // 创建下载
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  // 如果原文件不是纯文本，下载为 txt 格式
  const downloadName = (ext === 'txt' || ext === 'md') 
    ? resume.filename 
    : resume.filename.replace(/\.[^.]+$/, '.txt')
  link.download = downloadName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  ElMessage.success('下载成功')
}

// 查看简历
const viewResume = async (resume: LibraryResume) => {
  try {
    const detail = await libraryApi.getDetail(resume.id)
    currentResume.value = detail
    isEditing.value = false
    detailDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取简历详情失败')
  }
}

// 编辑简历
const editResume = async (resume: LibraryResume) => {
  try {
    const detail = await libraryApi.getDetail(resume.id)
    currentResume.value = detail
    editForm.candidate_name = detail.candidate_name || ''
    editForm.notes = detail.notes || ''
    isEditing.value = true
    detailDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取简历详情失败')
  }
}

// 保存编辑
const saveEdit = async () => {
  if (!currentResume.value) return
  
  saving.value = true
  try {
    await updateResume(currentResume.value.id, {
      candidate_name: editForm.candidate_name || undefined,
      notes: editForm.notes || undefined
    })
    detailDialogVisible.value = false
  } catch (error) {
    // 错误已在 composable 中处理
  } finally {
    saving.value = false
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取文件类型标签
const getFileTypeLabel = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const typeMap: Record<string, string> = {
    'pdf': 'PDF 文档',
    'doc': 'Word 文档',
    'docx': 'Word 文档',
    'txt': '纯文本',
    'md': 'Markdown'
  }
  return typeMap[ext] || '未知格式'
}

// 格式化简历内容显示
const formatResumeContent = (content: string): string => {
  if (!content) return ''
  // 清理多余空白，保留段落结构
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

onMounted(() => {
  loadResumes()
})
</script>

<style scoped lang="scss">
.resume-library-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
  
  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
    margin: 0;
  }
  
  .resume-count {
    font-size: 14px;
    color: #909399;
  }
}

.filter-card {
  :deep(.el-card__body) {
    padding: 16px;
  }
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  
  .filter-spacer {
    flex: 1;
  }
}

.list-card {
  :deep(.el-card__body) {
    padding: 0;
  }
}

.filename-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .file-icon {
    color: #409eff;
    font-size: 16px;
  }
  
  .filename {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.status-tags {
  display: flex;
  gap: 6px;
}

.hash-value {
  font-family: monospace;
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.text-muted {
  color: #c0c4cc;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  padding: 16px;
}

.upload-area {
  width: 100%;
  
  :deep(.el-upload-dragger) {
    width: 100%;
  }
}

.resume-content-preview {
  margin-top: 20px;
  
  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    
    h4 {
      margin: 0;
      font-size: 14px;
      color: #606266;
    }
  }
  
  .content-text {
    max-height: 450px;
    overflow-y: auto;
    padding: 16px;
    background: #fafafa;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    font-size: 14px;
    line-height: 1.8;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #303133;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #c0c4cc;
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-track {
      background: #f5f7fa;
    }
  }
}
</style>
