/**
 * 简历库管理 Composable
 */
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { libraryApi, type LibraryResume } from '@/api'

export function useResumeLibrary() {
  // 状态
  const loading = ref(false)
  const uploading = ref(false)
  const resumes = ref<LibraryResume[]>([])
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const keyword = ref('')
  const selectedIds = ref<string[]>([])
  
  // 筛选条件
  const filters = reactive({
    isScreened: undefined as boolean | undefined,
    isAssigned: undefined as boolean | undefined
  })

  // 加载简历库列表
  const loadResumes = async () => {
    loading.value = true
    try {
      const result = await libraryApi.getList({
        page: currentPage.value,
        page_size: pageSize.value,
        keyword: keyword.value || undefined,
        is_screened: filters.isScreened,
        is_assigned: filters.isAssigned
      })
      resumes.value = result.resumes
      total.value = result.total
    } catch (error) {
      console.error('加载简历库失败:', error)
      ElMessage.error('加载简历库失败')
    } finally {
      loading.value = false
    }
  }

  // 上传简历
  const uploadResumes = async (files: Array<{ name: string; content: string; metadata?: { size?: number; type?: string } }>) => {
    if (files.length === 0) return { uploaded_count: 0, skipped_count: 0 }
    
    uploading.value = true
    try {
      const result = await libraryApi.upload(files)
      
      if (result.uploaded_count > 0) {
        ElMessage.success(`成功上传 ${result.uploaded_count} 份简历`)
      }
      if (result.skipped_count > 0) {
        const reasons = result.skipped.map(s => `${s.filename}: ${s.reason}`).join('\n')
        ElMessage.warning(`跳过 ${result.skipped_count} 份简历:\n${reasons}`)
      }
      
      // 刷新列表
      await loadResumes()
      
      return result
    } catch (error) {
      console.error('上传简历失败:', error)
      ElMessage.error('上传简历失败')
      throw error
    } finally {
      uploading.value = false
    }
  }

  // 删除简历
  const deleteResume = async (resumeId: string) => {
    try {
      await ElMessageBox.confirm('确定要删除这份简历吗？', '确认删除', {
        type: 'warning'
      })
      
      await libraryApi.delete(resumeId)
      ElMessage.success('删除成功')
      await loadResumes()
    } catch (error) {
      if ((error as any) !== 'cancel') {
        console.error('删除简历失败:', error)
        ElMessage.error('删除简历失败')
      }
    }
  }

  // 批量删除
  const batchDelete = async () => {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请先选择要删除的简历')
      return
    }
    
    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${selectedIds.value.length} 份简历吗？`,
        '确认删除',
        { type: 'warning' }
      )
      
      await libraryApi.batchDelete(selectedIds.value)
      ElMessage.success(`成功删除 ${selectedIds.value.length} 份简历`)
      selectedIds.value = []
      await loadResumes()
    } catch (error) {
      if ((error as any) !== 'cancel') {
        console.error('批量删除失败:', error)
        ElMessage.error('批量删除失败')
      }
    }
  }

  // 更新简历信息
  const updateResume = async (resumeId: string, data: { candidate_name?: string; notes?: string }) => {
    try {
      await libraryApi.update(resumeId, data)
      ElMessage.success('更新成功')
      await loadResumes()
    } catch (error) {
      console.error('更新简历失败:', error)
      ElMessage.error('更新简历失败')
      throw error
    }
  }

  // 搜索
  const search = () => {
    currentPage.value = 1
    loadResumes()
  }

  // 重置筛选
  const resetFilters = () => {
    keyword.value = ''
    filters.isScreened = undefined
    filters.isAssigned = undefined
    currentPage.value = 1
    loadResumes()
  }

  // 页码改变
  const handlePageChange = (page: number) => {
    currentPage.value = page
    loadResumes()
  }

  // 页面大小改变
  const handleSizeChange = (size: number) => {
    pageSize.value = size
    currentPage.value = 1
    loadResumes()
  }

  // 选择改变
  const handleSelectionChange = (selection: LibraryResume[]) => {
    selectedIds.value = selection.map(r => r.id)
  }

  // 是否有选中
  const hasSelection = computed(() => selectedIds.value.length > 0)

  return {
    // 状态
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
    // 方法
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
  }
}
