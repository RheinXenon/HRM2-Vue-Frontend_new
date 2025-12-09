/**
 * Screening 工具函数 composable
 * 提供状态转换、格式化等通用工具
 */
import { marked } from 'marked'
import type { ScreeningScore, ProcessingTask, ResumeScreeningTask } from '@/types'

export function useScreeningUtils() {
  // 渲染 Markdown 内容
  const renderMarkdown = (content: string, isResume = false): string => {
    if (!content) return ''
    
    if (isResume) {
      // 简历内容特殊处理：原文没有换行符，使用 \u200b 作为分隔
      let processed = content
        .replace(/\u200b([^|\u200b]+)\u200b/g, '\n\n**$1**\n')
        .replace(/\u200b/g, '\n\n')
        .replace(/([。！？])\s*/g, '$1\n')
        .replace(/\s*\|\s*/g, ' | ')
        .replace(/(\d{4}-\d{4})\s*(?=[^\d])/g, '$1\n')
        .trim()
      
      return marked(processed) as string
    }
    
    return marked(content) as string
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 获取状态类型
  const getStatusType = (status: string) => {
    const types: Record<string, string> = {
      pending: 'warning',
      running: 'primary',
      completed: 'success',
      failed: 'danger'
    }
    return types[status] || 'info'
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: '队列中',
      running: '处理中',
      completed: '已完成',
      failed: '失败'
    }
    return texts[status] || status
  }

  // 获取分组状态类型
  const getGroupStatusType = (status: string) => {
    const types: Record<string, string> = {
      pending: 'warning',
      interview_analysis: 'primary',
      completed: 'success'
    }
    return types[status] || 'info'
  }

  // 获取分组状态文本
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

  // Agent顺序定义（用于进度显示）
  const AGENT_ORDER = ['User_Proxy', 'Assistant', 'HR_Expert', 'Technical_Expert', 'Project_Manager_Expert', 'Critic']
  const TOTAL_AGENTS = AGENT_ORDER.length
  
  // 获取发言人文本（包含步骤信息）
  const getSpeakerText = (speaker: string) => {
    const speakerNames: Record<string, string> = {
      'User_Proxy': '初始化',
      'Assistant': '协调准备',
      'HR_Expert': 'HR评分中',
      'Technical_Expert': '技术评分中',
      'Project_Manager_Expert': '管理评分中',
      'Critic': '综合评审中'
    }
    
    const stepIndex = AGENT_ORDER.indexOf(speaker)
    const stepNum = stepIndex >= 0 ? stepIndex + 1 : '?'
    const displayName = speakerNames[speaker] || speaker
    
    return `${displayName} (${stepNum}/${TOTAL_AGENTS})`
  }

  // 获取处理任务的评分
  const getItemScore = (item: ProcessingTask): ScreeningScore | null => {
    return item.resume_data?.[0]?.scores || null
  }

  // 获取历史任务名称
  const getHistoryTaskName = (task: ResumeScreeningTask): string => {
    // 1. 优先从 resume_data 获取候选人名称（所有状态都尝试获取）
    if (task.resume_data && task.resume_data.length > 0) {
      const rd = task.resume_data[0] as any
      if (rd?.candidate_name) return rd.candidate_name
    }
    
    // 2. 尝试从 reports 获取文件名
    if (task.reports && task.reports.length > 0) {
      const filename = task.reports[0]?.report_filename
      if (filename) {
        return filename.replace(/\.[^/.]+$/, '')
      }
      // 尝试从 resume_content 中提取（如果有的话）
      if (task.reports[0]?.resume_content) {
        // 简单的提取逻辑，假设简历内容开头可能有姓名
        const content = task.reports[0].resume_content
        const lines = content.split('\n').slice(0, 5)
        for (const line of lines) {
          const trimmed = line.trim()
          // 匹配可能的姓名模式（2-4个中文字符）
          if (/^[\u4e00-\u9fa5]{2,4}$/.test(trimmed)) {
            return trimmed
          }
        }
      }
    }
    
    // 3. 对于失败的任务，显示错误信息的前20个字符
    if (task.status === 'failed' && task.error_message) {
      return `错误: ${task.error_message.substring(0, 20)}${task.error_message.length > 20 ? '...' : ''}`
    }
    
    // 4. 对于没有候选人名称的情况，显示状态和任务ID
    return `${getStatusText(task.status)}任务 ${task.task_id.substring(0, 8)}...`
  }

  // 获取历史任务评分
  const getHistoryTaskScore = (task: ResumeScreeningTask): ScreeningScore | null => {
    if (task.resume_data && task.resume_data.length > 0) {
      return task.resume_data[0]?.scores || null
    }
    return null
  }

  return {
    renderMarkdown,
    formatFileSize,
    formatDate,
    getStatusType,
    getStatusText,
    getGroupStatusType,
    getGroupStatusText,
    getSpeakerText,
    getItemScore,
    getHistoryTaskName,
    getHistoryTaskScore
  }
}
