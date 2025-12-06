/**
 * API 模块统一导出
 */
import axios from 'axios'
import type {
  PositionData,
  ResumeScreeningTask,
  ResumeGroup,
  ResumeData,
  VideoAnalysis,
  InterviewEvaluationTask,
  ApiResponse
} from '@/types'

// API 基础路径
const API_BASE = import.meta.env.VITE_API_BASE ?? ''

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

/**
 * 岗位设置 API
 * 后端路径: /position-settings/
 */
export const positionApi = {
  // 获取默认岗位设置（向后兼容）
  getCriteria: async (): Promise<PositionData> => {
    const response = await fetch(`${API_BASE}/position-settings/`)
    if (!response.ok) {
      throw new Error(`获取数据失败: ${response.status}`)
    }
    const result: ApiResponse<PositionData> = await response.json()
    if (result.code !== 200) {
      throw new Error(`API错误: ${result.message}`)
    }
    return result.data
  },

  // 保存默认岗位设置（向后兼容）
  saveCriteria: async (data: PositionData): Promise<void> => {
    const response = await fetch(`${API_BASE}/position-settings/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error(`保存数据失败: ${response.status}`)
    }
  },

  // 获取所有岗位列表
  getPositions: async (params?: { include_resumes?: boolean }): Promise<{ positions: PositionData[], total: number }> => {
    const searchParams = new URLSearchParams()
    if (params?.include_resumes) searchParams.append('include_resumes', 'true')
    const url = `${API_BASE}/position-settings/positions/${searchParams.toString() ? '?' + searchParams : ''}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`获取岗位列表失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || { positions: [], total: 0 }
  },

  // 创建新岗位
  createPosition: async (data: Partial<PositionData>): Promise<PositionData> => {
    const response = await fetch(`${API_BASE}/position-settings/positions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `创建岗位失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data
  },

  // 获取单个岗位详情
  getPosition: async (positionId: string, includeResumes = true): Promise<PositionData> => {
    const url = `${API_BASE}/position-settings/positions/${positionId}/?include_resumes=${includeResumes}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`获取岗位详情失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data
  },

  // 更新岗位
  updatePosition: async (positionId: string, data: Partial<PositionData>): Promise<PositionData> => {
    const response = await fetch(`${API_BASE}/position-settings/positions/${positionId}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error(`更新岗位失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data
  },

  // 删除岗位
  deletePosition: async (positionId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/position-settings/positions/${positionId}/`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error(`删除岗位失败: ${response.status}`)
    }
  },

  // 分配简历到岗位
  assignResumes: async (positionId: string, resumeDataIds: string[]): Promise<{ assigned_count: number, total_resumes: number }> => {
    const response = await fetch(`${API_BASE}/position-settings/positions/${positionId}/assign-resumes/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_data_ids: resumeDataIds })
    })
    if (!response.ok) {
      throw new Error(`分配简历失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data
  },

  // 从岗位移除简历
  removeResume: async (positionId: string, resumeId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/position-settings/positions/${positionId}/remove-resume/${resumeId}/`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error(`移除简历失败: ${response.status}`)
    }
  },

  // AI生成岗位要求
  aiGenerate: async (data: {
    description: string
    documents?: Array<{ name: string; content: string }>
  }): Promise<PositionData> => {
    const response = await fetch(`${API_BASE}/position-settings/ai/generate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `AI生成失败: ${response.status}`)
    }
    const result = await response.json()
    if (result.code !== 200) {
      throw new Error(result.message || 'AI生成失败')
    }
    return result.data
  }
}

/**
 * 简历筛选 API
 * 后端路径: /resume-screening/
 */
export const screeningApi = {
  // 提交筛选任务
  // 期望数据格式: { position: {...}, resumes: [{ name, content, metadata }] }
  submitScreening: async (data: {
    position: Record<string, unknown>
    resumes: Array<{ name: string; content: string; metadata?: { size: number; type: string } }>
  }): Promise<ResumeScreeningTask> => {
    const response = await fetch(`${API_BASE}/resume-screening/screening/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API 错误响应:', errorText)
      throw new Error(`提交失败: ${response.status}`)
    }
    const result = await response.json()
    return result
  },

  // 查询任务状态
  getTaskStatus: async (taskId: string): Promise<ResumeScreeningTask> => {
    const response = await fetch(`${API_BASE}/resume-screening/tasks/${taskId}/status/`)
    if (!response.ok) {
      throw new Error(`获取状态失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  },

  // 获取任务历史
  getTaskHistory: async (params?: {
    status?: string
    page?: number
    page_size?: number
  }): Promise<{ tasks: ResumeScreeningTask[]; total: number }> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString())

    const response = await fetch(`${API_BASE}/resume-screening/tasks-history/?${searchParams}`)
    if (!response.ok) {
      throw new Error(`获取历史失败: ${response.status}`)
    }
    const result = await response.json()
    // 后端返回 { tasks: [...], total, page, page_size }
    return { tasks: result.tasks || [], total: result.total || 0 }
  },

  // 删除任务
  deleteTask: async (taskId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/resume-screening/tasks/${taskId}/`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error(`删除失败: ${response.status}`)
    }
  },

  // 获取简历数据统计（总数）
  getResumeDataStats: async (): Promise<{ total: number }> => {
    const response = await fetch(`${API_BASE}/resume-screening/resume-data/?page=1&page_size=1`)
    if (!response.ok) {
      throw new Error(`获取简历统计失败: ${response.status}`)
    }
    const result = await response.json()
    return { total: result.total || 0 }
  },

  // 获取简历详情
  getResumeDetail: async (resumeId: string): Promise<ResumeData | null> => {
    try {
      const response = await fetch(`${API_BASE}/resume-screening/reports/${resumeId}/detail/`)
      if (!response.ok) {
        return null
      }
      const result = await response.json()
      const report = result.report || result.data || result
      // 映射字段名称
      return {
        id: report.id,
        candidate_name: report.candidate_name,
        position_title: report.position_title,
        resume_content: report.resume_content,
        screening_score: report.scores,
        screening_summary: report.summary,
        created_at: report.created_at
      }
    } catch {
      return null
    }
  },

  // 获取简历组列表
  getGroups: async (params?: { include_resumes?: boolean }): Promise<ResumeGroup[]> => {
    const searchParams = new URLSearchParams()
    if (params?.include_resumes) searchParams.append('include_resumes', 'true')
    const url = `${API_BASE}/resume-screening/groups/${searchParams.toString() ? '?' + searchParams : ''}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`获取简历组失败: ${response.status}`)
    }
    const result = await response.json()
    // 后端返回 { groups: [...], total, page, page_size }
    return result.groups || []
  },

  // 获取可用于创建组的简历数据（从已完成任务中获取）
  getAvailableResumes: async (): Promise<ResumeData[]> => {
    const response = await fetch(`${API_BASE}/resume-screening/tasks-history/?status=completed&page_size=100`)
    if (!response.ok) {
      throw new Error(`获取简历数据失败: ${response.status}`)
    }
    const result = await response.json()
    // 从任务中提取resume_data
    const tasks = result.tasks || []
    const resumes: ResumeData[] = []
    for (const task of tasks) {
      if (task.resume_data && Array.isArray(task.resume_data)) {
        for (const rd of task.resume_data) {
          resumes.push({
            id: rd.id,
            position_title: rd.position_title || task.reports?.[0]?.position_info?.position || '未知岗位',
            candidate_name: rd.candidate_name || '未知候选人',
            screening_score: rd.scores || rd.screening_score,
            created_at: rd.created_at || task.created_at,
            task_id: task.task_id
          })
        }
      }
    }
    return resumes
  },

  // 获取简历组详情
  getGroupDetail: async (groupId: string): Promise<ResumeGroup> => {
    const response = await fetch(`${API_BASE}/resume-screening/groups/${groupId}/?include_resumes=true`)
    if (!response.ok) {
      throw new Error(`获取简历组详情失败: ${response.status}`)
    }
    const result = await response.json()
    // 后端返回 { group: {...}, summary: {...} }
    return result.group || result
  },

  // 创建简历组
  createGroup: async (data: {
    group_name: string
    resume_data_ids: string[]
    description?: string
  }): Promise<ResumeGroup> => {
    const response = await fetch(`${API_BASE}/resume-screening/groups/create/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error(`创建简历组失败: ${response.status}`)
    }
    const result = await response.json()
    // 后端返回 { message, group_id, group_name, resume_count }
    return result
  },

  // 添加简历到组
  addResumeToGroup: async (data: {
    group_id: string
    resume_data_id: string
  }): Promise<void> => {
    const response = await fetch(`${API_BASE}/resume-screening/groups/add-resume/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error(`添加简历失败: ${response.status}`)
    }
  },

  // 下载报告（仅返回 Blob）
  downloadReport: async (reportId: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE}/resume-screening/reports/${reportId}/download/`)
    if (!response.ok) {
      throw new Error(`下载报告失败: ${response.status}`)
    }
    return response.blob()
  },

  // 下载报告（包含文件名）
  downloadReportWithFilename: async (reportId: string): Promise<{ blob: Blob; filename: string }> => {
    const response = await fetch(`${API_BASE}/resume-screening/reports/${reportId}/download/`)
    if (!response.ok) {
      throw new Error(`下载报告失败: ${response.status}`)
    }
    
    // 从响应头获取文件名
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = `report_${reportId}.md`
    
    if (contentDisposition) {
      // 解析 filename*=UTF-8''xxx 格式
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
      if (utf8Match && utf8Match[1]) {
        filename = decodeURIComponent(utf8Match[1])
      } else {
        // 解析普通 filename="xxx" 格式
        const normalMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
        if (normalMatch && normalMatch[1]) {
          filename = normalMatch[1]
        }
      }
    }
    
    const blob = await response.blob()
    return { blob, filename }
  },

  // 获取简历数据
  getResumeData: async (): Promise<ResumeData[]> => {
    const response = await fetch(`${API_BASE}/resume-screening/data/`)
    if (!response.ok) {
      throw new Error(`获取简历数据失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  }
}

/**
 * 视频分析 API
 * 后端路径: /video-analysis/
 */
export const videoApi = {
  // 上传视频
  uploadVideo: async (formData: FormData): Promise<VideoAnalysis> => {
    const response = await fetch(`${API_BASE}/video-analysis/`, {
      method: 'POST',
      body: formData
    })
    if (!response.ok) {
      throw new Error(`上传视频失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  },

  // 获取视频分析状态
  getVideoStatus: async (videoId: string): Promise<VideoAnalysis> => {
    const response = await fetch(`${API_BASE}/video-analysis/${videoId}/status/`)
    if (!response.ok) {
      throw new Error(`获取状态失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  },

  // 获取视频列表
  getVideoList: async (): Promise<VideoAnalysis[]> => {
    const response = await fetch(`${API_BASE}/video-analysis/list/`)
    if (!response.ok) {
      throw new Error(`获取视频列表失败: ${response.status}`)
    }
    const result = await response.json()
    // 后端返回 { videos: [...], total, page, page_size }
    return result.videos || []
  }
}

/**
 * 最终推荐 API
 * 后端路径: /final-recommend/
 */
export const recommendApi = {
  // 创建评估任务
  createEvaluation: async (groupId: string): Promise<InterviewEvaluationTask> => {
    const response = await fetch(`${API_BASE}/final-recommend/interview-evaluation/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId })
    })
    if (!response.ok) {
      throw new Error(`创建评估任务失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  },

  // 获取评估任务状态
  getEvaluationStatus: async (taskId: string): Promise<InterviewEvaluationTask> => {
    const response = await fetch(`${API_BASE}/final-recommend/interview-evaluation/${taskId}/`)
    if (!response.ok) {
      throw new Error(`获取评估状态失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  },

  // 获取评估任务状态（根据组ID）
  getEvaluationByGroup: async (groupId: string): Promise<InterviewEvaluationTask | null> => {
    const response = await fetch(`${API_BASE}/final-recommend/interview-evaluation/?group_id=${groupId}`)
    if (!response.ok) {
      throw new Error(`获取评估状态失败: ${response.status}`)
    }
    const result = await response.json()
    // 后端返回 { status: 'success', data: {...} | null }
    return result.data || null
  },

  // 停止评估任务
  stopEvaluation: async (taskId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/final-recommend/interview-evaluation/${taskId}/delete/`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error(`停止评估任务失败: ${response.status}`)
    }
  },

  // 下载报告
  downloadReport: async (filePath: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE}/final-recommend/download-report/${filePath}`)
    if (!response.ok) {
      throw new Error(`下载报告失败: ${response.status}`)
    }
    return response.blob()
  }
}

/**
 * 简历库 API
 * 后端路径: /resume-screening/library/
 */
export const libraryApi = {
  // 获取简历库列表
  getList: async (params?: {
    page?: number
    page_size?: number
    keyword?: string
    is_screened?: boolean
    is_assigned?: boolean
  }): Promise<{
    resumes: LibraryResume[]
    total: number
    page: number
    page_size: number
  }> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString())
    if (params?.keyword) searchParams.append('keyword', params.keyword)
    if (params?.is_screened !== undefined) searchParams.append('is_screened', params.is_screened.toString())
    if (params?.is_assigned !== undefined) searchParams.append('is_assigned', params.is_assigned.toString())
    
    const url = `${API_BASE}/resume-screening/library/${searchParams.toString() ? '?' + searchParams : ''}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`获取简历库失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || { resumes: [], total: 0, page: 1, page_size: 20 }
  },

  // 上传简历到简历库
  upload: async (resumes: Array<{
    name: string
    content: string
    metadata?: { size?: number; type?: string }
  }>): Promise<{
    uploaded: Array<{ id: string; filename: string; candidate_name: string }>
    skipped: Array<{ filename: string; reason: string }>
    uploaded_count: number
    skipped_count: number
  }> => {
    const response = await fetch(`${API_BASE}/resume-screening/library/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumes })
    })
    if (!response.ok) {
      throw new Error(`上传简历失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data
  },

  // 获取简历详情
  getDetail: async (resumeId: string): Promise<LibraryResume> => {
    const response = await fetch(`${API_BASE}/resume-screening/library/${resumeId}/`)
    if (!response.ok) {
      throw new Error(`获取简历详情失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data
  },

  // 更新简历信息
  update: async (resumeId: string, data: {
    candidate_name?: string
    notes?: string
  }): Promise<void> => {
    const response = await fetch(`${API_BASE}/resume-screening/library/${resumeId}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error(`更新简历失败: ${response.status}`)
    }
  },

  // 删除简历
  delete: async (resumeId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/resume-screening/library/${resumeId}/`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error(`删除简历失败: ${response.status}`)
    }
  },

  // 批量删除简历
  batchDelete: async (resumeIds: string[]): Promise<void> => {
    const response = await fetch(`${API_BASE}/resume-screening/library/batch-delete/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_ids: resumeIds })
    })
    if (!response.ok) {
      throw new Error(`批量删除失败: ${response.status}`)
    }
  },

  // 检查哈希值是否已存在
  checkHashes: async (hashes: string[]): Promise<{ exists: Record<string, boolean>; existing_count: number }> => {
    const response = await fetch(`${API_BASE}/resume-screening/library/check-hash/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashes })
    })
    if (!response.ok) {
      throw new Error(`检查哈希值失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data
  }
}

// 简历库类型定义
export interface LibraryResume {
  id: string
  filename: string
  file_hash: string
  file_size: number
  file_type: string
  content?: string
  content_preview?: string
  candidate_name: string | null
  is_screened: boolean
  is_assigned: boolean
  notes: string | null
  created_at: string
  updated_at?: string
}

/**
 * 开发测试工具 API
 */
export const devToolsApi = {
  // 生成随机简历
  generateResumes: async (params: {
    position: {
      position: string
      description?: string
      required_skills?: string[]
      optional_skills?: string[]
      min_experience?: number
      education?: string[]
    }
    count: number
  }): Promise<{
    added: Array<{ id: string; filename: string; candidate_name: string }>
    skipped: Array<{ filename: string; reason: string }>
    added_count: number
    skipped_count: number
    requested_count: number
  }> => {
    const response = await fetch(`${API_BASE}/resume-screening/dev/generate-resumes/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `生成简历失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data
  }
}

/**
 * 面试辅助 API
 * 后端路径: /interview-assist/
 */
export const interviewAssistApi = {
  // 创建面试会话
  createSession: async (data: {
    resume_data_id: string
    interviewer_name?: string
    job_config?: Record<string, unknown>
    company_config?: Record<string, unknown>
  }): Promise<InterviewSession> => {
    const response = await fetch(`${API_BASE}/interview-assist/sessions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `创建会话失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data
  },

  // 获取会话详情
  getSession: async (sessionId: string): Promise<InterviewSession> => {
    const response = await fetch(`${API_BASE}/interview-assist/sessions/${sessionId}/`)
    if (!response.ok) {
      throw new Error(`获取会话失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data
  },

  // 结束会话
  endSession: async (sessionId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/interview-assist/sessions/${sessionId}/`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error(`结束会话失败: ${response.status}`)
    }
  },

  // 生成面试问题
  generateQuestions: async (sessionId: string, params?: {
    categories?: string[]
    candidate_level?: string
    count_per_category?: number
    focus_on_resume?: boolean
  }): Promise<{
    question_pool: InterviewQuestion[]
    resume_highlights: string[]
  }> => {
    const response = await fetch(`${API_BASE}/interview-assist/sessions/${sessionId}/generate-questions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {})
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `生成问题失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data
  },

  // 记录问答并获取评估
  recordQA: async (sessionId: string, data: {
    question: {
      content: string
      source?: string
      category?: string
      expected_skills?: string[]
      difficulty?: number
      interest_point?: string
    }
    answer: {
      content: string
      duration_seconds?: number
    }
  }): Promise<{
    round_number: number
    qa_record_id: string
    evaluation: AnswerEvaluation
    followup_recommendation: {
      should_followup: boolean
      reason: string
      suggested_followups: FollowupSuggestion[]
      hr_hint?: string
    }
    hr_action_hints: string[]
  }> => {
    const response = await fetch(`${API_BASE}/interview-assist/sessions/${sessionId}/record-qa/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `记录问答失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data
  },

  // 生成最终报告
  generateReport: async (sessionId: string, params?: {
    include_conversation_log?: boolean
    hr_notes?: string
  }): Promise<{
    report: InterviewReport
    report_file_url: string | null
  }> => {
    const response = await fetch(`${API_BASE}/interview-assist/sessions/${sessionId}/generate-report/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {})
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `生成报告失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data
  }
}

// 面试辅助类型定义
export interface InterviewSession {
  session_id: string
  candidate_name: string
  position_title: string
  interviewer_name?: string
  status: 'active' | 'completed'
  current_round: number
  qa_count?: number
  question_pool_count?: number
  resume_highlights?: string[]
  created_at: string
  updated_at?: string
  resume_summary?: {
    candidate_name: string
    position_title: string
    screening_score?: number
    screening_summary?: string
  }
  has_final_report?: boolean
  final_report_summary?: string
}

export interface InterviewQuestion {
  question: string
  category: string
  difficulty: number
  expected_skills: string[]
  source: 'resume_based' | 'skill_based' | 'hr_custom'
  related_point?: string
}

export interface AnswerEvaluation {
  normalized_score: number
  dimension_scores: {
    technical_depth: number
    practical_experience: number
    answer_specificity: number
    logical_clarity: number
    honesty: number
    communication: number
  }
  confidence_level: 'genuine' | 'uncertain' | 'overconfident'
  should_followup: boolean
  followup_reason?: string
  feedback: string
}

export interface FollowupSuggestion {
  question: string
  purpose: string
  difficulty: number
}

export interface InterviewReport {
  overall_assessment: {
    recommendation_score: number
    recommendation: string
    summary: string
  }
  dimension_analysis: Record<string, { score: number; comment: string }>
  skill_assessment: Array<{ skill: string; level: string; evidence: string }>
  highlights: string[]
  red_flags: string[]
  overconfidence_detected: boolean
  suggested_next_steps: string[]
}

export { apiClient }
