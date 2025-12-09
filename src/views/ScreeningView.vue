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
          :position-name="positionData.position"
          @submit="submitFiles"
          @preview="previewFile"
          @files-changed="handleFilesChanged"
          @library-files-changed="handleLibraryFilesChanged"
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
          @retry-task="handleRetryTask"
          @delete="deleteHistoryTask"
          @page-change="loadHistoryTasks"
        />
      </div>
    </div>

    <!-- 添加简历到岗位对话框 -->
    <AssignResumeDialog
      v-model="createGroupDialogVisible"
      :selected-position-id="selectedPositionId"
      :position-name="positionData.position"
      :available-resumes="availableResumes"
      :assigned-resume-ids="assignedResumeIds"
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
import { ref, onMounted } from 'vue'

// 组件导入
import { PositionList } from '@/components/common'
import {
  ResumeUpload,
  ProcessingQueue,
  TaskHistory,
  AssignResumeDialog,
  AddToGroupDialog,
  PreviewDialog,
  ResumeDetailDialog
} from '@/components/screening'

// Composables 导入
import { usePositionManagement } from '@/composables/usePositionManagement'
import { useTaskPolling } from '@/composables/useTaskPolling'
import { useHistoryTasks } from '@/composables/useHistoryTasks'
import { useResumeUpload } from '@/composables/useResumeUpload'
import { useResumeAssignment } from '@/composables/useResumeAssignment'
import { useResumeDetail } from '@/composables/useResumeDetail'

// API 导入
import { screeningApi, positionApi } from '@/api'
import { ElMessage } from 'element-plus'

// 类型导入
import type { PositionData, ProcessingTask } from '@/types'

// ==================== Composables 初始化 ====================

// 岗位管理
const {
  positionData,
  positionsList,
  selectedPositionId,
  loadPositionsList,
  selectPosition,
  removeResumeFromPosition
} = usePositionManagement()

// 历史任务（需要先初始化，供其他 composable 引用）
const {
  historyTasks,
  historyParams,
  historyTotal,
  historyLoading,
  loadHistoryTasks,
  filterByStatus,
  deleteHistoryTask
} = useHistoryTasks()

// 任务轮询（完成时刷新历史任务）
const {
  processingQueue,
  addToQueue
} = useTaskPolling(loadHistoryTasks)

// 简历上传组件引用
const resumeUploadRef = ref<InstanceType<typeof ResumeUpload>>()

// 简历上传（提交成功时添加到队列）
const {
  isSubmitting,
  handleFilesChanged,
  handleLibraryFilesChanged,
  submitFiles: doSubmitFiles
} = useResumeUpload(positionData, addToQueue)

// 包装 submitFiles 以便传入清除回调
const submitFiles = () => doSubmitFiles(() => {
  resumeUploadRef.value?.clearAll()
  resumeUploadRef.value?.clearLibrarySelection()
})

// 简历详情和预览
const {
  previewDialogVisible,
  resumeDetailVisible,
  previewFileData,
  selectedResumeDetail,
  previewFile,
  showResumeDetail,
  showQueueItemDetail,
  showHistoryTaskDetail,
  downloadReport
} = useResumeDetail()

// 简历添加（添加成功时刷新岗位列表）
const {
  createGroupDialogVisible,
  addToGroupDialogVisible,
  availableResumes,
  assignedResumeIds,
  resumesLoading,
  creatingGroup,
  showCreateGroupDialog,
  handleCreateDialogClose,
  assignResumesToPosition,
  showAddToGroupDialog,
  showAddToGroupDialogFromHistory,
  addToGroup
} = useResumeAssignment(selectedPositionId, positionsList, loadPositionsList)

// ==================== 事件处理 ====================

// 处理重新检测任务
const handleRetryTask = async (data: {
  resume_content: string
  candidate_name: string
  position_title: string
}) => {
  try {
    // 检查是否有选中的岗位，如果没有，使用失败任务中的职位信息
    let positionForRetry = positionData.value
    
    // 如果当前没有选中岗位，或者当前岗位与失败任务的岗位不同
    if (!positionForRetry.position || positionForRetry.position !== data.position_title) {
      // 尝试从岗位列表中找到匹配的岗位
      const matchingPosition = positionsList.value.find(p => p.position === data.position_title)
      
      if (matchingPosition) {
        positionForRetry = matchingPosition
      } else {
        // 如果找不到匹配的岗位，使用当前选中的岗位（如果有）
        if (positionData.value && positionData.value.position) {
          console.warn(`使用当前岗位(${positionData.value.position})而不是失败任务的岗位(${data.position_title})`)
          positionForRetry = positionData.value
        } else {
          // 获取默认岗位设置
          try {
            positionForRetry = await positionApi.getCriteria()
            console.warn(`使用默认岗位设置而不是失败任务的岗位(${data.position_title})`)
          } catch (err) {
            console.error('获取默认岗位设置失败:', err)
            // 如果所有方法都失败，创建一个最小可用的岗位对象
            positionForRetry = {
              id: 'retry-temp-position',
              position: data.position_title || positionData.value.position || '未知职位',
              department: '',
              description: '',
              required_skills: [],
              optional_skills: [],
              min_experience: 0,
              education: [],
              certifications: [],
              is_active: true
            }
          }
        }
      }
    }
    
    // 准备简历数据 - 确保数据格式与正常提交一致
    const resumeData = {
      name: data.candidate_name,
      content: data.resume_content,
      metadata: {
        size: data.resume_content.length,
        type: 'text/plain'
      }
    }
    
    // 构造提交数据，确保格式与正常提交完全一致
    const submitData = {
      position: positionForRetry,
      resumes: [resumeData]
    }
    
    // 调用API重新提交筛选任务
    const newTask = await screeningApi.submitScreening(submitData)
    
    // 创建ProcessingTask对象，确保格式与正常提交一致
    const processingTask: ProcessingTask = {
      name: data.candidate_name,
      task_id: newTask.task_id,
      status: 'pending',
      progress: 0,
      created_at: new Date().toISOString(),
      applied_position: positionForRetry.position,
      error_message: undefined,
      current_speaker: undefined,
      report_id: undefined,
      reports: undefined,
      resume_data: undefined
    }
    
    // 将新任务添加到处理队列
    addToQueue(processingTask)
    
    // 显示成功消息
    ElMessage.success(`已重新提交 ${data.candidate_name} 的简历进行筛选`)
    
    // 刷新历史任务列表
    await loadHistoryTasks()
    
  } catch (error) {
    console.error('重新检测任务失败:', error)
    ElMessage.error(`重新检测失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 显示添加对话框（从岗位列表触发）
const showAssignDialog = (pos: PositionData) => {
  selectPosition(pos)  // 同时更新 selectedPositionId 和 positionData
  showCreateGroupDialog()
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadPositionsList()
  loadHistoryTasks()
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
