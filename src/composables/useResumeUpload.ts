/**
 * 简历上传 composable
 * 处理简历文件上传和提交（支持上传文件和简历库选择两种模式）
 */
import { ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { screeningApi, libraryApi, type LibraryResume } from '@/api'
import type { PositionData, ResumeFile, ProcessingTask } from '@/types'

export function useResumeUpload(
  positionData: Ref<PositionData>,
  onSubmitSuccess?: (task: ProcessingTask) => void
) {
  const isSubmitting = ref(false)
  const currentFiles = ref<ResumeFile[]>([])
  const libraryFiles = ref<LibraryResume[]>([])

  // 上传文件变化处理
  const handleFilesChanged = (files: ResumeFile[]) => {
    currentFiles.value = files
  }

  // 简历库文件变化处理
  const handleLibraryFilesChanged = (files: LibraryResume[]) => {
    libraryFiles.value = files
  }

  // 提交文件（同时处理上传文件和简历库文件）
  const submitFiles = async (clearCallback?: () => void) => {
    const parsedFiles = currentFiles.value.filter(f => f.status === 'parsed')
    const selectedLibraryFiles = libraryFiles.value
    
    // 检查是否有可提交的文件
    if (parsedFiles.length === 0 && selectedLibraryFiles.length === 0) {
      ElMessage.warning('没有已解析的文件可提交')
      return
    }

    isSubmitting.value = true
    let successCount = 0
    let libraryUploadedCount = 0
    
    try {
      // 1. 提交上传的文件到简历库
      if (parsedFiles.length > 0) {
        try {
          const libraryUploadData = parsedFiles.map(file => ({
            name: file.name,
            content: file.content || '',
            metadata: {
              size: file.file.size,
              type: file.file.type || 'text/plain'
            }
          }));

          const libraryResult = await libraryApi.upload(libraryUploadData);
          libraryUploadedCount = libraryResult.uploaded_count;
          
          if (libraryResult.skipped_count > 0) {
            ElMessage.warning(`${libraryResult.skipped_count} 份简历已存在于简历库中`);
          }
        } catch (err) {
          console.error('上传到简历库失败:', err);
          ElMessage.error('部分简历上传到简历库失败');
        }
      }

      // 2. 提交上传的文件进行筛选
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

          const result = await screeningApi.submitScreening(uploadData as any)
          
          const task: ProcessingTask = {
            name: file.name,
            task_id: result.task_id,
            status: 'pending',
            progress: 0,
            created_at: new Date().toISOString(),
            applied_position: positionData.value.position
          }
          
          onSubmitSuccess?.(task)
          successCount++
        } catch (err) {
          console.error(`提交 ${file.name} 失败:`, err)
          ElMessage.error(`${file.name} 提交失败`)
        }
      }

      // 3. 提交从简历库选择的文件
      for (const libFile of selectedLibraryFiles) {
        try {
          // 获取简历库文件的详细内容
          const detail = await libraryApi.getDetail(libFile.id)
          
          const uploadData = {
            position: positionData.value,
            resumes: [{
              name: libFile.filename,
              content: detail.content || '',
              metadata: {
                size: libFile.file_size,
                type: libFile.file_type || 'text/plain'
              }
            }]
          }

          const result = await screeningApi.submitScreening(uploadData as any)
          
          const task: ProcessingTask = {
            name: libFile.filename,
            task_id: result.task_id,
            status: 'pending',
            progress: 0,
            created_at: new Date().toISOString(),
            applied_position: positionData.value.position
          }
          
          onSubmitSuccess?.(task)
          successCount++
        } catch (err) {
          console.error(`提交 ${libFile.filename} 失败:`, err)
          ElMessage.error(`${libFile.filename} 提交失败`)
        }
      }

      if (successCount > 0) {
        clearCallback?.()
        ElMessage.success(`成功提交 ${successCount} 份简历进行初筛` + 
                         (libraryUploadedCount > 0 ? `，其中 ${libraryUploadedCount} 份已保存到简历库` : ''));
      }
    } catch (err) {
      console.error('提交失败:', err)
      ElMessage.error('提交失败')
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    isSubmitting,
    currentFiles,
    libraryFiles,
    handleFilesChanged,
    handleLibraryFilesChanged,
    submitFiles
  }
}