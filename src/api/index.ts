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
 */
export const positionApi = {
  // 获取岗位设置
  getCriteria: async (): Promise<PositionData> => {
    const response = await fetch(`${API_BASE}/api/v1/positions/criteria/`)
    if (!response.ok) {
      throw new Error(`获取数据失败: ${response.status}`)
    }
    const result: ApiResponse<PositionData> = await response.json()
    if (result.code !== 200) {
      throw new Error(`API错误: ${result.message}`)
    }
    return result.data
  },

  // 保存岗位设置
  saveCriteria: async (data: PositionData): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/v1/positions/criteria/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error(`保存数据失败: ${response.status}`)
    }
  }
}

/**
 * 简历筛选 API
 */
export const screeningApi = {
  // 提交筛选任务
  submitScreening: async (formData: FormData): Promise<ResumeScreeningTask> => {
    const response = await fetch(`${API_BASE}/api/v1/screening/screening/`, {
      method: 'POST',
      body: formData
    })
    if (!response.ok) {
      throw new Error(`提交失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  },

  // 查询任务状态
  getTaskStatus: async (taskId: string): Promise<ResumeScreeningTask> => {
    const response = await fetch(`${API_BASE}/api/v1/screening/tasks/${taskId}/status/`)
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
  }): Promise<{ results: ResumeScreeningTask[]; count: number }> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString())

    const response = await fetch(`${API_BASE}/api/v1/screening/tasks-history/?${searchParams}`)
    if (!response.ok) {
      throw new Error(`获取历史失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  },

  // 获取简历组列表
  getGroups: async (): Promise<ResumeGroup[]> => {
    const response = await fetch(`${API_BASE}/api/v1/screening/groups/`)
    if (!response.ok) {
      throw new Error(`获取简历组失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  },

  // 获取简历组详情
  getGroupDetail: async (groupId: string): Promise<ResumeGroup> => {
    const response = await fetch(`${API_BASE}/api/v1/screening/groups/${groupId}/`)
    if (!response.ok) {
      throw new Error(`获取简历组详情失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  },

  // 创建简历组
  createGroup: async (data: {
    group_name: string
    position_title: string
    description?: string
  }): Promise<ResumeGroup> => {
    const response = await fetch(`${API_BASE}/api/v1/screening/groups/create/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error(`创建简历组失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  },

  // 添加简历到组
  addResumeToGroup: async (data: {
    group_id: string
    resume_data_id: string
  }): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/v1/screening/groups/add-resume/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error(`添加简历失败: ${response.status}`)
    }
  },

  // 下载报告
  downloadReport: async (reportId: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE}/api/v1/screening/reports/${reportId}/download/`)
    if (!response.ok) {
      throw new Error(`下载报告失败: ${response.status}`)
    }
    return response.blob()
  },

  // 获取简历数据
  getResumeData: async (): Promise<ResumeData[]> => {
    const response = await fetch(`${API_BASE}/api/v1/screening/data/`)
    if (!response.ok) {
      throw new Error(`获取简历数据失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  }
}

/**
 * 视频分析 API
 */
export const videoApi = {
  // 上传视频
  uploadVideo: async (formData: FormData): Promise<VideoAnalysis> => {
    const response = await fetch(`${API_BASE}/api/v1/video/`, {
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
    const response = await fetch(`${API_BASE}/api/v1/video/${videoId}/status/`)
    if (!response.ok) {
      throw new Error(`获取状态失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  },

  // 获取视频列表
  getVideoList: async (): Promise<VideoAnalysis[]> => {
    const response = await fetch(`${API_BASE}/api/v1/video/list/`)
    if (!response.ok) {
      throw new Error(`获取视频列表失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  }
}

/**
 * 最终推荐 API
 */
export const recommendApi = {
  // 创建评估任务
  createEvaluation: async (groupId: string): Promise<InterviewEvaluationTask> => {
    const response = await fetch(`${API_BASE}/api/v1/recommend/interview-evaluation/`, {
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
    const response = await fetch(`${API_BASE}/api/v1/recommend/interview-evaluation/${taskId}/`)
    if (!response.ok) {
      throw new Error(`获取评估状态失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  },

  // 获取评估任务列表
  getEvaluationList: async (): Promise<InterviewEvaluationTask[]> => {
    const response = await fetch(`${API_BASE}/api/v1/recommend/interview-evaluation/`)
    if (!response.ok) {
      throw new Error(`获取评估列表失败: ${response.status}`)
    }
    const result = await response.json()
    return result.data || result
  },

  // 停止评估任务
  stopEvaluation: async (taskId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/v1/recommend/interview-evaluation/${taskId}/delete/`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error(`停止评估任务失败: ${response.status}`)
    }
  },

  // 下载报告
  downloadReport: async (filePath: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE}/api/v1/recommend/download-report/${filePath}`)
    if (!response.ok) {
      throw new Error(`下载报告失败: ${response.status}`)
    }
    return response.blob()
  }
}

export { apiClient }
