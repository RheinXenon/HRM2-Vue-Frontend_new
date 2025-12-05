/**
 * 通用类型定义
 */

// API 响应类型
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 分页响应
export interface PaginatedResponse<T> {
  results: T[]
  count: number
  next: string | null
  previous: string | null
}

/**
 * 岗位设置模块
 */
export interface ProjectRequirements {
  min_projects: number
  team_lead_experience: boolean
}

export interface PositionData {
  position: string
  required_skills: string[]
  optional_skills: string[]
  min_experience: number
  education: string[]
  certifications: string[]
  salary_range: [number, number]
  project_requirements: ProjectRequirements
}

/**
 * 简历筛选模块
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface ScreeningScore {
  hr_score: number
  technical_score: number
  manager_score: number
  comprehensive_score: number
}

export interface ResumeScreeningTask {
  task_id: string
  status: TaskStatus
  progress: number
  current_step?: number
  total_steps?: number
  error_message?: string
  current_speaker?: string
  created_at: string
  updated_at?: string
  reports?: ReportInfo[]
  resume_data?: ResumeDataScore[]
}

export interface ReportInfo {
  report_id: string
  report_filename: string
  download_url: string
  resume_content?: string
  position_info?: PositionData
}

export interface ResumeDataScore {
  scores?: ScreeningScore
}

export type ResumeGroupStatus =
  | 'pending'
  | 'interview_analysis'
  | 'interview_analysis_completed'
  | 'comprehensive_screening'
  | 'completed'

export interface ResumeGroup {
  id: string
  position_title: string
  position_details?: Record<string, unknown>
  group_name: string
  description?: string
  resume_count: number
  status: ResumeGroupStatus
  created_at: string
  updated_at?: string
  resumes?: ResumeData[]
}

export interface ResumeData {
  id: string
  position_title: string
  candidate_name: string
  resume_content: string
  scores?: ScreeningScore
  summary?: string
  report_md_url?: string
  report_json_url?: string
  video_analysis_status?: string
  video_analysis_result?: VideoAnalysisResult
  created_at: string
}

/**
 * 视频分析模块
 */
export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface VideoAnalysisResult {
  fraud_score: number
  neuroticism_score: number
  extraversion_score: number
  openness_score: number
  agreeableness_score: number
  conscientiousness_score: number
}

export interface VideoAnalysis {
  id: string
  video_name: string
  video_file: string
  file_size?: number
  candidate_name: string
  position_applied: string
  status: VideoStatus
  error_message?: string
  fraud_score?: number
  neuroticism_score?: number
  extraversion_score?: number
  openness_score?: number
  agreeableness_score?: number
  conscientiousness_score?: number
  confidence_score?: number
  summary?: string
  created_at: string
  updated_at?: string
}

/**
 * 最终推荐模块
 */
export type EvaluationStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface InterviewEvaluationTask {
  task_id: string
  group_id: string
  status: EvaluationStatus
  progress?: number
  current_speaker?: string
  result_file?: string
  result_summary?: string
  error_message?: string
  created_at: string
  updated_at?: string
}

/**
 * 简历文件类型
 */
export interface ResumeFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  content: string
  status: 'pending' | 'parsing' | 'parsed' | 'error'
  error?: string
}

/**
 * 处理队列项类型
 */
export interface ProcessingTask {
  name: string
  task_id: string | null
  status: TaskStatus
  progress: number
  created_at: string
  applied_position?: string
  error_message?: string
  current_speaker?: string
  report_id?: string
  reports?: ReportInfo[]
  resume_data?: ResumeDataScore[]
}

/**
 * 导航项类型
 */
export interface NavItem {
  key: string
  label: string
  icon?: string
  path: string
}
