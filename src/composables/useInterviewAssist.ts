/**
 * 面试辅助系统核心 composable
 * 支持 AI 模拟面试和真人实时语音面试两种模式
 * 
 * 模式说明：
 * - AI 模拟演示：使用本地模拟的候选人回答，主要用于演示系统功能
 * - 真人实时面试：调用后端 API 进行真实的 LLM 评估和问题推荐
 */
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { interviewAssistApi } from '@/api'
import type { AnswerEvaluation, InterviewQuestion, FollowupSuggestion } from '@/api'

// 类型定义
export interface Message {
  id: string
  role: 'interviewer' | 'candidate' | 'system'
  content: string
  timestamp: Date
  isFollowup?: boolean
  evaluation?: MessageEvaluation
  isTyping?: boolean
}

export interface MessageEvaluation {
  score: number
  recommendation: 'excellent' | 'good' | 'average' | 'needsImprovement'
  feedback: string
  confidenceLevel: 'genuine' | 'uncertain' | 'overconfident'
}

export interface SuggestedQuestion {
  id: string
  question: string
  type: 'followup' | 'alternative'
  angle?: string
  priority: number
}

export interface InterviewConfig {
  mode: 'ai-simulation' | 'live-interview'
  domain: string
  followupCount: number
  alternativeCount: number
  suggestionDelay: number // 毫秒
}

export interface CandidateProfile {
  name: string
  type: 'ideal' | 'junior' | 'nervous' | 'overconfident' | 'random'
  skills: Record<string, number>
  personality: {
    openness: number
    conscientiousness: number
    extraversion: number
    agreeableness: number
    neuroticism: number
  }
}

// AI 模拟候选人配置预设
export const candidatePresets: Record<string, CandidateProfile> = {
  ideal: {
    name: '理想候选人',
    type: 'ideal',
    skills: { 'JavaScript': 9, 'React': 8, 'Node.js': 8, 'TypeScript': 7, '系统设计': 8 },
    personality: { openness: 0.8, conscientiousness: 0.85, extraversion: 0.7, agreeableness: 0.75, neuroticism: 0.2 }
  },
  junior: {
    name: '初级候选人',
    type: 'junior',
    skills: { 'JavaScript': 5, 'React': 4, 'Node.js': 3, 'CSS': 5, 'HTML': 6 },
    personality: { openness: 0.6, conscientiousness: 0.7, extraversion: 0.5, agreeableness: 0.8, neuroticism: 0.4 }
  },
  nervous: {
    name: '紧张型候选人',
    type: 'nervous',
    skills: { 'JavaScript': 7, 'React': 6, 'Node.js': 5, 'TypeScript': 5, 'Git': 6 },
    personality: { openness: 0.5, conscientiousness: 0.8, extraversion: 0.3, agreeableness: 0.7, neuroticism: 0.8 }
  },
  overconfident: {
    name: '过度自信型',
    type: 'overconfident',
    skills: { 'JavaScript': 6, 'React': 5, 'Node.js': 4, 'TypeScript': 4, 'AWS': 3 },
    personality: { openness: 0.7, conscientiousness: 0.5, extraversion: 0.9, agreeableness: 0.4, neuroticism: 0.3 }
  }
}

// 面试问题模板
const questionTemplates = {
  technical: [
    '请介绍一下您对 {skill} 的理解和实际应用经验？',
    '在使用 {skill} 时，您遇到过哪些挑战？如何解决的？',
    '请解释一下 {skill} 的核心原理和最佳实践？',
    '请比较 {skill} 与类似技术的优缺点？'
  ],
  project: [
    '请介绍一个您最引以为傲的项目，您在其中担任什么角色？',
    '在项目中遇到最大的技术挑战是什么？您是如何克服的？',
    '请描述一个您主导的技术方案设计过程？',
    '项目中您是如何保证代码质量的？'
  ],
  behavioral: [
    '您如何与团队成员进行有效沟通和协作？',
    '当团队意见不一致时，您通常如何处理？',
    '请举例说明您如何帮助团队成员成长？',
    '描述一次您在压力下工作的经历？'
  ],
  problemSolving: [
    '遇到复杂问题时，您的分析思路是什么？',
    '请描述一次您快速定位并解决生产问题的经历？',
    '如何平衡项目进度和代码质量？',
    '面对不明确的需求时，您如何处理？'
  ]
}

// AI 模拟回答模板
const answerTemplates: Record<string, Record<string, string[]>> = {
  ideal: {
    technical: [
      '在 {skill} 方面，我有 3 年以上的深度实践经验。比如在上一个项目中，我使用 {skill} 实现了高性能的数据处理模块，将处理效率提升了 60%。具体来说...',
      '关于 {skill}，我认为它的核心优势在于...在实际应用中，我会结合项目需求选择合适的设计模式...'
    ],
    project: [
      '我最自豪的项目是一个大型电商平台的重构。作为技术负责人，我主导了前端架构升级，引入了微前端方案，最终将页面加载速度提升 40%，同时支持多团队并行开发...',
      '在这个项目中，最大的挑战是数据一致性问题。我设计了基于事件溯源的解决方案...'
    ]
  },
  nervous: {
    technical: [
      '呃...{skill} 我用过一些，主要是在学校的项目里...可能还不太熟练...',
      '这个...我有学过 {skill}，但是实际经验不是很多，可能需要一些时间来适应...'
    ],
    project: [
      '嗯...我参与过一些项目，主要是做一些功能开发...可能规模不是很大...',
      '项目的话...主要是跟着导师做的，我负责的部分是...'
    ]
  },
  overconfident: {
    technical: [
      '{skill}？这个我精通！基本上没有什么是我不会的，各种框架库我都用过，轻松驾驭！',
      '说实话，{skill} 对我来说太简单了，我可以快速上手任何新技术，这不是问题。'
    ],
    project: [
      '我主导过很多大型项目，基本上都是我一个人搞定核心架构，其他人只是打下手。',
      '那个项目完全是靠我带起来的，如果没有我的技术决策，项目根本不可能成功。'
    ]
  }
}

// 追问模板
const followupTemplates = [
  '您刚才提到的 {point}，能否更详细地说明具体实现方式？',
  '关于 {point}，您能举一个具体的数据或案例来支撑吗？',
  '您提到 {point}，那么在实际中遇到 {challenge} 时如何处理？',
  '能否深入解释一下 {point} 的技术细节？'
]

// 候选问题模板（不同角度）
const alternativeQuestionTemplates = [
  { angle: '深度探索', template: '如果要从底层原理角度来理解您的方案，您会如何解释？' },
  { angle: '实际案例', template: '能否分享一个具体的案例来说明您的观点？' },
  { angle: '反向思考', template: '如果重新做这个决定，您会有什么不同的选择？' },
  { angle: '团队协作', template: '在这个过程中，您是如何与团队其他成员协作的？' },
  { angle: '问题解决', template: '遇到最大的困难是什么？您是如何克服的？' }
]

export function useInterviewAssist() {
  // 配置状态
  const config = reactive<InterviewConfig>({
    mode: 'ai-simulation',
    domain: 'tech',
    followupCount: 2,
    alternativeCount: 3,
    suggestionDelay: 10000 // 10秒
  })

  // 会话状态（后端集成）
  const sessionId = ref<string | null>(null)
  const resumeDataId = ref<string | null>(null)
  const questionPool = ref<InterviewQuestion[]>([])
  const resumeHighlights = ref<string[]>([])
  const useBackendApi = ref(true) // 是否使用后端 API

  // 面试状态
  const isInterviewActive = ref(false)
  const isPaused = ref(false)
  const messages = ref<Message[]>([])
  const currentQuestion = ref('')
  const currentQuestionData = ref<Partial<InterviewQuestion> | null>(null)
  const currentAnswer = ref('')
  const isProcessing = ref(false)
  const isRecording = ref(false)

  // AI 模拟状态
  const selectedCandidate = ref<CandidateProfile | null>(null)
  const isAITyping = ref(false)

  // 问题建议状态
  const suggestedQuestions = ref<SuggestedQuestion[]>([])
  const showSuggestions = ref(false)
  const suggestionTimer = ref<number | null>(null)

  // 统计数据
  const stats = reactive({
    totalQuestions: 0,
    totalFollowups: 0,
    averageScore: 0,
    startTime: null as Date | null,
    duration: 0
  })

  // 生成唯一 ID
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // 添加消息
  const addMessage = (
    role: Message['role'],
    content: string,
    options?: Partial<Message>
  ) => {
    const message: Message = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      ...options
    }
    messages.value.push(message)
    return message
  }

  // 模拟打字效果
  const simulateTyping = async (content: string, role: Message['role']) => {
    const message = addMessage(role, '', { isTyping: true })
    const chars = content.split('')
    
    for (let i = 0; i < chars.length; i++) {
      message.content += chars[i]
      await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30))
    }
    
    message.isTyping = false
    return message
  }

  // 生成追问和候选问题
  const generateSuggestions = (
    questionContext: string,
    answerContext: string
  ): SuggestedQuestion[] => {
    const suggestions: SuggestedQuestion[] = []
    
    // 生成追问
    const keywords = answerContext.match(/[\u4e00-\u9fa5a-zA-Z]+/g)?.slice(0, 3) || ['这个问题']
    for (let i = 0; i < config.followupCount; i++) {
      const template = followupTemplates[i % followupTemplates.length]
      const point = keywords[i % keywords.length] || '这个问题'
      suggestions.push({
        id: generateId(),
        question: template?.replace('{point}', point).replace('{challenge}', '性能瓶颈') || '',
        type: 'followup',
        priority: i + 1
      })
    }
    
    // 生成候选问题（不同角度）
    const shuffled = [...alternativeQuestionTemplates].sort(() => Math.random() - 0.5)
    for (let i = 0; i < config.alternativeCount; i++) {
      const item = shuffled[i]
      if (item) {
        suggestions.push({
          id: generateId(),
          question: item.template,
          type: 'alternative',
          angle: item.angle,
          priority: config.followupCount + i + 1
        })
      }
    }
    
    return suggestions
  }

  // 启动问题建议计时器
  const startSuggestionTimer = (questionContext: string, answerContext: string) => {
    if (suggestionTimer.value) {
      clearTimeout(suggestionTimer.value)
    }
    
    showSuggestions.value = false
    
    suggestionTimer.value = window.setTimeout(() => {
      suggestedQuestions.value = generateSuggestions(questionContext, answerContext)
      showSuggestions.value = true
    }, config.suggestionDelay)
  }

  // 评估回答（本地模拟 - AI演示模式使用）
  const evaluateAnswerLocal = (answer: string): MessageEvaluation => {
    const length = answer.length
    const hasNumbers = /\d+/.test(answer)
    const hasSpecificTerms = /项目|技术|实现|优化|提升|方案|架构/.test(answer)
    
    let score = 50
    let recommendation: MessageEvaluation['recommendation'] = 'average'
    let confidenceLevel: MessageEvaluation['confidenceLevel'] = 'genuine'
    
    if (length > 200 && hasSpecificTerms) {
      score = 75 + Math.random() * 20
      recommendation = score > 85 ? 'excellent' : 'good'
    } else if (length > 100) {
      score = 60 + Math.random() * 15
      recommendation = 'good'
    } else if (length < 50) {
      score = 30 + Math.random() * 20
      recommendation = 'needsImprovement'
    }
    
    if (hasNumbers) score += 5
    
    if (/精通|轻松|简单|没问题|都会/.test(answer) && length < 100) {
      confidenceLevel = 'overconfident'
      score -= 10
    }
    
    if (/可能|也许|不太确定|大概/.test(answer)) {
      confidenceLevel = 'uncertain'
    }
    
    return {
      score: Math.min(100, Math.max(0, score)),
      recommendation,
      feedback: generateFeedback(recommendation),
      confidenceLevel
    }
  }

  // 评估回答（调用后端 API - 真人面试模式使用）
  const evaluateAnswerApi = async (
    question: string, 
    answer: string,
    questionData?: Partial<InterviewQuestion>
  ): Promise<{ evaluation: MessageEvaluation; suggestions: SuggestedQuestion[]; hrHints: string[] }> => {
    if (!sessionId.value) {
      // 没有会话，使用本地评估
      return {
        evaluation: evaluateAnswerLocal(answer),
        suggestions: generateSuggestions(question, answer),
        hrHints: []
      }
    }

    try {
      const result = await interviewAssistApi.recordQA(sessionId.value, {
        question: {
          content: question,
          source: questionData?.source || 'hr_custom',
          category: questionData?.category || '',
          expected_skills: questionData?.expected_skills || [],
          difficulty: questionData?.difficulty || 5
        },
        answer: {
          content: answer
        }
      })

      // 转换后端评估结果为前端格式
      const backendEval = result.evaluation
      const score = backendEval.normalized_score
      let recommendation: MessageEvaluation['recommendation'] = 'average'
      if (score >= 80) recommendation = 'excellent'
      else if (score >= 65) recommendation = 'good'
      else if (score < 45) recommendation = 'needsImprovement'

      const evaluation: MessageEvaluation = {
        score,
        recommendation,
        feedback: backendEval.feedback,
        confidenceLevel: backendEval.confidence_level
      }

      // 转换追问建议
      const suggestions: SuggestedQuestion[] = []
      const followups = result.followup_recommendation.suggested_followups || []
      followups.forEach((f: FollowupSuggestion, i: number) => {
        suggestions.push({
          id: generateId(),
          question: f.question,
          type: 'followup',
          priority: i + 1
        })
      })

      return {
        evaluation,
        suggestions,
        hrHints: result.hr_action_hints || []
      }
    } catch (error) {
      console.error('后端评估失败，使用本地评估:', error)
      return {
        evaluation: evaluateAnswerLocal(answer),
        suggestions: generateSuggestions(question, answer),
        hrHints: []
      }
    }
  }

  // 统一的评估入口
  const evaluateAnswer = (answer: string): MessageEvaluation => {
    return evaluateAnswerLocal(answer)
  }

  // 生成反馈
  const generateFeedback = (recommendation: MessageEvaluation['recommendation']): string => {
    const feedbacks = {
      excellent: '回答非常专业，有具体案例支撑，展现了深厚的技术功底',
      good: '回答较为完整，建议可以补充更多具体数据或案例',
      average: '回答基本到位，但深度不足，建议追问以了解更多细节',
      needsImprovement: '回答过于简略，需要进一步挖掘候选人能力'
    }
    return feedbacks[recommendation]
  }

  // AI 模拟模式 - 生成候选人回答
  const generateAIResponse = async (question: string): Promise<string> => {
    if (!selectedCandidate.value) return ''
    
    const type = selectedCandidate.value.type
    const category = question.includes('项目') ? 'project' : 'technical'
    const templates = answerTemplates[type]?.[category] || answerTemplates.ideal?.technical || []
    const template = templates[Math.floor(Math.random() * templates.length)] || ''
    
    const skills = Object.keys(selectedCandidate.value.skills)
    const skill = skills[Math.floor(Math.random() * skills.length)] || 'JavaScript'
    
    return template.replace(/{skill}/g, skill)
  }

  // 创建后端会话
  const createSession = async (resumeId: string): Promise<boolean> => {
    try {
      const session = await interviewAssistApi.createSession({
        resume_data_id: resumeId,
        interviewer_name: '面试官'
      })
      sessionId.value = session.session_id
      resumeDataId.value = resumeId
      resumeHighlights.value = session.resume_highlights || []
      return true
    } catch (error) {
      console.error('创建会话失败:', error)
      return false
    }
  }

  // 从后端获取问题池
  const fetchQuestionPool = async (): Promise<void> => {
    if (!sessionId.value) return

    try {
      const result = await interviewAssistApi.generateQuestions(sessionId.value, {
        categories: ['简历相关', '专业能力', '行为面试'],
        candidate_level: 'senior',
        count_per_category: 2,
        focus_on_resume: true
      })
      questionPool.value = result.question_pool
      resumeHighlights.value = result.resume_highlights
    } catch (error) {
      console.error('获取问题池失败:', error)
    }
  }

  // 开始面试
  const startInterview = async (candidateType?: string) => {
    isInterviewActive.value = true
    isPaused.value = false
    messages.value = []
    stats.startTime = new Date()
    stats.totalQuestions = 0
    stats.totalFollowups = 0
    
    if (config.mode === 'ai-simulation' && candidateType) {
      selectedCandidate.value = candidatePresets[candidateType] || null
      useBackendApi.value = false // AI模拟模式不使用后端
    } else {
      useBackendApi.value = true // 真人面试模式使用后端
    }
    
    // 开场白
    const greeting = config.mode === 'ai-simulation' && selectedCandidate.value
      ? `你好${selectedCandidate.value.name}，欢迎参加今天的面试。我是您的面试官，我们现在开始吧。`
      : '面试已开始，请面试官提问。系统将在候选人回答后自动推荐追问和候选问题。'
    
    addMessage('system', greeting)
    
    // 真人面试模式：如果有会话，获取问题池
    if (config.mode === 'live-interview' && sessionId.value) {
      await fetchQuestionPool()
      if (questionPool.value.length > 0) {
        addMessage('system', `已根据简历生成 ${questionPool.value.length} 个候选问题，可从问题池中选择或自由提问。`)
      }
    }
    
    ElMessage.success('面试已开始')
  }

  // 开始带简历的真人面试
  const startLiveInterviewWithResume = async (resumeId: string): Promise<boolean> => {
    const success = await createSession(resumeId)
    if (success) {
      config.mode = 'live-interview'
      await startInterview()
      return true
    }
    return false
  }

  // 暂停面试
  const pauseInterview = () => {
    isPaused.value = true
    if (suggestionTimer.value) {
      clearTimeout(suggestionTimer.value)
    }
    ElMessage.info('面试已暂停')
  }

  // 继续面试
  const resumeInterview = () => {
    isPaused.value = false
    ElMessage.info('面试继续')
  }

  // 结束面试
  const endInterview = async () => {
    // 结束后端会话
    if (sessionId.value && useBackendApi.value) {
      try {
        await interviewAssistApi.endSession(sessionId.value)
      } catch (error) {
        console.error('结束会话失败:', error)
      }
    }

    isInterviewActive.value = false
    isPaused.value = false
    
    if (suggestionTimer.value) {
      clearTimeout(suggestionTimer.value)
    }
    
    // 计算持续时间
    if (stats.startTime) {
      stats.duration = Math.round((Date.now() - stats.startTime.getTime()) / 1000 / 60)
    }
    
    addMessage('system', `面试已结束。共进行了 ${stats.totalQuestions} 个问题，${stats.totalFollowups} 次追问，用时 ${stats.duration} 分钟。`)
    
    // 清理会话状态
    sessionId.value = null
    questionPool.value = []
    
    ElMessage.success('面试已结束')
  }

  // 生成最终报告
  const generateReport = async (hrNotes?: string): Promise<{ success: boolean; reportUrl?: string }> => {
    if (!sessionId.value) {
      return { success: false }
    }

    try {
      const result = await interviewAssistApi.generateReport(sessionId.value, {
        include_conversation_log: true,
        hr_notes: hrNotes
      })
      return {
        success: true,
        reportUrl: result.report_file_url || undefined
      }
    } catch (error) {
      console.error('生成报告失败:', error)
      return { success: false }
    }
  }

  // 面试官提问
  const askQuestion = async (question: string, questionData?: Partial<InterviewQuestion>) => {
    if (!isInterviewActive.value || isPaused.value) return
    
    currentQuestion.value = question
    currentQuestionData.value = questionData || null
    showSuggestions.value = false
    stats.totalQuestions++
    
    await simulateTyping(question, 'interviewer')
    
    // AI 模拟模式：自动生成候选人回答
    if (config.mode === 'ai-simulation' && selectedCandidate.value) {
      isAITyping.value = true
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
      
      const response = await generateAIResponse(question)
      const message = await simulateTyping(response, 'candidate')
      
      // 评估回答
      const evaluation = evaluateAnswerLocal(response)
      message.evaluation = evaluation
      
      isAITyping.value = false
      
      // 启动问题建议计时器
      startSuggestionTimer(question, response)
    }
  }

  // 从问题池选择问题提问
  const askFromPool = async (poolQuestion: InterviewQuestion) => {
    await askQuestion(poolQuestion.question, poolQuestion)
  }

  // 处理候选人回答（真人面试模式）
  const submitAnswer = async (answer: string) => {
    if (!isInterviewActive.value || isPaused.value || !answer.trim()) return
    
    isProcessing.value = true
    
    const message = addMessage('candidate', answer)
    
    // 根据模式选择评估方式
    if (useBackendApi.value && sessionId.value) {
      // 使用后端 API 评估（真人面试模式）
      try {
        const result = await evaluateAnswerApi(
          currentQuestion.value, 
          answer,
          currentQuestionData.value || undefined
        )
        message.evaluation = result.evaluation
        
        // 使用后端返回的追问建议
        if (result.suggestions.length > 0) {
          suggestedQuestions.value = result.suggestions
          showSuggestions.value = true
        } else {
          // 后端没有返回建议，使用本地生成
          startSuggestionTimer(currentQuestion.value, answer)
        }
      } catch (error) {
        console.error('API评估失败:', error)
        message.evaluation = evaluateAnswerLocal(answer)
        startSuggestionTimer(currentQuestion.value, answer)
      }
    } else {
      // 使用本地评估（AI模拟模式）
      await new Promise(resolve => setTimeout(resolve, 500))
      message.evaluation = evaluateAnswerLocal(answer)
      startSuggestionTimer(currentQuestion.value, answer)
    }
    
    // 更新统计
    const scores = messages.value
      .filter(m => m.evaluation)
      .map(m => m.evaluation!.score)
    stats.averageScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    
    currentAnswer.value = ''
    currentQuestionData.value = null
    isProcessing.value = false
  }

  // 使用建议的问题
  const useSuggestedQuestion = (suggestion: SuggestedQuestion) => {
    if (suggestion.type === 'followup') {
      stats.totalFollowups++
    }
    askQuestion(suggestion.question)
    showSuggestions.value = false
  }

  // 清除问题建议
  const clearSuggestions = () => {
    showSuggestions.value = false
    suggestedQuestions.value = []
  }

  // 更新配置
  const updateConfig = (updates: Partial<InterviewConfig>) => {
    Object.assign(config, updates)
  }

  // 导出面试记录
  const exportRecord = () => {
    const record = {
      config: { ...config },
      messages: messages.value,
      stats: { ...stats },
      exportTime: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `interview_record_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('面试记录已导出')
  }

  return {
    // 配置
    config,
    updateConfig,
    candidatePresets,
    
    // 会话状态（后端集成）
    sessionId,
    resumeDataId,
    questionPool,
    resumeHighlights,
    useBackendApi,
    
    // 状态
    isInterviewActive,
    isPaused,
    messages,
    currentQuestion,
    currentAnswer,
    isProcessing,
    isRecording,
    isAITyping,
    selectedCandidate,
    
    // 问题建议
    suggestedQuestions,
    showSuggestions,
    
    // 统计
    stats,
    
    // 方法
    createSession,
    startInterview,
    startLiveInterviewWithResume,
    pauseInterview,
    resumeInterview,
    endInterview,
    generateReport,
    askQuestion,
    askFromPool,
    submitAnswer,
    useSuggestedQuestion,
    clearSuggestions,
    exportRecord,
    addMessage,
    evaluateAnswer,
    fetchQuestionPool
  }
}
