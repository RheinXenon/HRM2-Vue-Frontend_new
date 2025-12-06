<template>
  <div class="live-interview-panel">
    <!-- 面试准备区域 -->
    <div class="setup-area" v-if="!isActive">
      <div class="setup-header">
        <div class="icon-wrapper recording">
          <el-icon class="mic-icon"><Microphone /></el-icon>
        </div>
        <h3>真人实时语音面试</h3>
        <p class="desc">面试官实时提问，系统自动转录候选人语音并智能推荐追问</p>
      </div>
      
      <!-- 配置卡片 -->
      <div class="config-cards">
        <div class="config-card">
          <div class="card-icon">
            <el-icon><QuestionFilled /></el-icon>
          </div>
          <div class="card-body">
            <h4>追问数量</h4>
            <p>每轮回答后推荐的追问数量</p>
            <el-slider
              v-model="localConfig.followupCount"
              :min="1"
              :max="5"
              :step="1"
              show-stops
              :marks="{ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }"
            />
          </div>
        </div>
        
        <div class="config-card">
          <div class="card-icon alt">
            <el-icon><Grid /></el-icon>
          </div>
          <div class="card-body">
            <h4>候选问题数</h4>
            <p>不同角度的备选问题数量</p>
            <el-slider
              v-model="localConfig.alternativeCount"
              :min="2"
              :max="6"
              :step="1"
              show-stops
              :marks="{ 2: '2', 3: '3', 4: '4', 5: '5', 6: '6' }"
            />
          </div>
        </div>
        
        <div class="config-card">
          <div class="card-icon timer">
            <el-icon><Timer /></el-icon>
          </div>
          <div class="card-body">
            <h4>推荐延迟</h4>
            <p>回答结束后多少秒显示推荐</p>
            <el-slider
              v-model="suggestionDelaySeconds"
              :min="5"
              :max="30"
              :step="5"
              show-stops
              :marks="{ 5: '5s', 10: '10s', 15: '15s', 20: '20s', 30: '30s' }"
            />
          </div>
        </div>
      </div>
      
      <!-- 准备步骤 -->
      <div class="prep-steps">
        <div class="step" :class="{ 'completed': step1Done }">
          <div class="step-icon">
            <el-icon v-if="step1Done"><Check /></el-icon>
            <span v-else>1</span>
          </div>
          <div class="step-content">
            <h5>检查麦克风</h5>
            <p v-if="!step1Done">确保候选人的麦克风正常工作</p>
            <p v-else class="success">麦克风已就绪</p>
          </div>
          <el-button 
            v-if="!step1Done" 
            size="small" 
            type="primary"
            @click="checkMicrophone"
            :loading="checkingMic"
          >
            检测
          </el-button>
        </div>
        
        <div class="step" :class="{ 'completed': step2Done, 'expanded': showCandidateSelector }">
          <div class="step-icon">
            <el-icon v-if="step2Done"><Check /></el-icon>
            <span v-else>2</span>
          </div>
          <div class="step-content">
            <h5>选择候选人</h5>
            <p v-if="!selectedCandidateInfo">从简历库中选择候选人（可选）</p>
            <p v-else class="success">
              已选择: {{ selectedCandidateInfo.name }}
              <span v-if="selectedCandidateInfo.position"> - {{ selectedCandidateInfo.position }}</span>
            </p>
          </div>
          <div class="step-actions">
            <el-button 
              v-if="!step2Done" 
              size="small"
              type="primary"
              @click="showCandidateSelector = !showCandidateSelector"
            >
              {{ showCandidateSelector ? '收起' : '选择' }}
            </el-button>
            <el-button 
              v-if="!step2Done" 
              size="small"
              @click="skipCandidateSelection"
            >
              跳过
            </el-button>
          </div>
        </div>
        
        <!-- 候选人选择面板 -->
        <transition name="expand">
          <div v-if="showCandidateSelector && !step2Done" class="candidate-selector-panel">
            <div class="selector-header">
              <el-icon><User /></el-icon>
              <span>从简历库选择候选人</span>
            </div>
            <div class="selector-body">
              <div class="select-group">
                <label>选择岗位</label>
                <el-select
                  v-model="selectedPositionId"
                  placeholder="请选择岗位"
                  clearable
                  @change="handlePositionChange"
                >
                  <el-option
                    v-for="pos in positions"
                    :key="pos.id"
                    :label="`${pos.position} (${pos.resume_count || 0}人)`"
                    :value="pos.id"
                  />
                </el-select>
              </div>
              <div class="select-group" v-if="currentResumes.length > 0">
                <label>选择候选人</label>
                <el-select
                  v-model="selectedResumeId"
                  placeholder="请选择候选人"
                  clearable
                  @change="handleResumeChange"
                >
                  <el-option
                    v-for="resume in currentResumes"
                    :key="resume.id"
                    :label="getResumeLabel(resume)"
                    :value="resume.id"
                  />
                </el-select>
              </div>
              <div v-else-if="selectedPositionId" class="no-candidates">
                <el-icon><Warning /></el-icon>
                <span>该岗位暂无候选人</span>
              </div>
              <div class="selector-actions">
                <el-button 
                  type="primary" 
                  :disabled="!selectedResumeId"
                  @click="confirmCandidateSelection"
                >
                  确认选择
                </el-button>
              </div>
            </div>
          </div>
        </transition>
      </div>
      
      <!-- 开始按钮 -->
      <div class="action-area">
        <el-button
          type="primary"
          size="large"
          :disabled="!canStart"
          @click="handleStart"
          class="start-btn"
        >
          <el-icon class="mr-2"><VideoPlay /></el-icon>
          开始实时面试
        </el-button>
      </div>
    </div>
    
    <!-- 面试进行中 -->
    <div class="interview-active" v-else>
      <!-- 顶部状态栏 -->
      <div class="status-bar">
        <div class="status-left">
          <el-tag type="danger" effect="dark" class="live-tag">
            <span class="live-dot"></span>
            LIVE
          </el-tag>
          <span class="status-text">实时面试进行中</span>
        </div>
        <div class="status-right">
          <div class="stat-item">
            <el-icon><QuestionFilled /></el-icon>
            <span>{{ stats.totalQuestions }} 问题</span>
          </div>
          <div class="stat-item">
            <el-icon><ChatLineRound /></el-icon>
            <span>{{ stats.totalFollowups }} 追问</span>
          </div>
          <div class="stat-item">
            <el-icon><Timer /></el-icon>
            <span>{{ formatDuration }}</span>
          </div>
        </div>
      </div>
      
      <!-- 主内容区：两栏布局 -->
      <div class="main-content">
        <!-- 左侧：对话区 -->
        <div class="chat-section">
          <div class="chat-container" ref="chatContainerRef">
            <transition-group name="message" tag="div" class="messages-list">
              <div
                v-for="message in messages"
                :key="message.id"
                class="message-item"
                :class="[`message-${message.role}`, { 'typing': message.isTyping }]"
              >
                <div class="message-avatar">
                  <span v-if="message.role === 'interviewer'">👔</span>
                  <span v-else-if="message.role === 'candidate'">👤</span>
                  <span v-else>🔔</span>
                </div>
                <div class="message-body">
                  <div class="message-header">
                    <span class="role-name">
                      {{ message.role === 'interviewer' ? '面试官' : message.role === 'candidate' ? '候选人' : '系统' }}
                    </span>
                    <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
                  </div>
                  <div class="message-content">{{ message.content }}</div>
                  <!-- 评估结果 -->
                  <transition name="fade">
                    <div v-if="message.evaluation" class="evaluation-badge">
                      <div class="eval-score" :class="getScoreClass(message.evaluation.score)">
                        <span class="score-value">{{ Math.round(message.evaluation.score) }}</span>
                        <span class="score-label">分</span>
                      </div>
                      <div class="eval-info">
                        <span class="recommendation">{{ getRecommendationText(message.evaluation.recommendation) }}</span>
                        <span class="feedback">{{ message.evaluation.feedback }}</span>
                      </div>
                    </div>
                  </transition>
                </div>
              </div>
            </transition-group>
          </div>
          
          <!-- 输入区域 -->
          <div class="input-section">
            <!-- 面试官问题输入 -->
            <div class="interviewer-input">
              <div class="input-label">
                <el-icon><Edit /></el-icon>
                面试官提问
              </div>
              <div class="input-row">
                <el-input
                  v-model="questionInput"
                  type="textarea"
                  :rows="2"
                  placeholder="输入您要问候选人的问题..."
                  :disabled="isPaused"
                  @keydown.enter.ctrl="sendQuestion"
                />
                <el-button
                  type="primary"
                  :icon="Promotion"
                  :disabled="!questionInput.trim()"
                  @click="sendQuestion"
                >
                  提问
                </el-button>
              </div>
            </div>
            
            <!-- 候选人回答输入 -->
            <div class="candidate-input">
              <div class="input-label">
                <el-icon><Microphone /></el-icon>
                候选人回答
                <el-tag v-if="isSpeechListening" type="danger" size="small" effect="plain" class="recording-tag">
                  <span class="rec-dot"></span>
                  录音中
                </el-tag>
                <el-tag v-if="!speechSupported" type="warning" size="small">
                  浏览器不支持语音
                </el-tag>
              </div>
              <div class="input-row">
                <el-input
                  v-model="answerInput"
                  type="textarea"
                  :rows="3"
                  :placeholder="isSpeechListening ? '正在录音，请对着麦克风说话...' : '输入候选人的回答内容，或点击麦克风使用语音输入...'"
                  :disabled="isPaused"
                  :class="{ 'recording-active': isSpeechListening }"
                />
                <div class="input-actions">
                  <el-tooltip :content="speechSupported ? (isSpeechListening ? '停止录音' : '开始语音输入') : '您的浏览器不支持语音识别'" placement="top">
                    <el-button
                      :type="isSpeechListening ? 'danger' : 'default'"
                      circle
                      size="large"
                      :icon="isSpeechListening ? VideoPause : Microphone"
                      @click="toggleRecording"
                      class="mic-btn"
                      :class="{ 'recording': isSpeechListening }"
                      :disabled="!speechSupported"
                    />
                  </el-tooltip>
                  <el-button
                    type="success"
                    :icon="Check"
                    :disabled="!answerInput.trim()"
                    @click="submitAnswer"
                  >
                    提交回答
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 右侧：问题推荐区 -->
        <div class="suggestion-section">
          <QuestionSuggestion
            :suggestions="suggestedQuestions"
            :visible="showSuggestions"
            :countdown="suggestionCountdown"
            :followup-count="localConfig.followupCount"
            :alternative-count="localConfig.alternativeCount"
            @use="handleUseSuggestion"
            @dismiss="$emit('clearSuggestions')"
          />
        </div>
      </div>
      
      <!-- 底部控制栏 -->
      <div class="control-bar">
        <el-button v-if="!isPaused" @click="$emit('pause')" :icon="VideoPause">暂停</el-button>
        <el-button v-else type="primary" @click="$emit('resume')" :icon="VideoPlay">继续</el-button>
        <el-button type="danger" @click="$emit('end')" :icon="Close">结束面试</el-button>
        <el-button @click="$emit('export')" :icon="Download">导出记录</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, reactive, onMounted, onUnmounted } from 'vue'
import {
  Microphone, VideoPlay, VideoPause, Close, Download, Check,
  QuestionFilled, ChatLineRound, Timer, Grid, Edit, Promotion, User, Warning
} from '@element-plus/icons-vue'
import QuestionSuggestion from './QuestionSuggestion.vue'
import type { Message, SuggestedQuestion, InterviewConfig } from '@/composables/useInterviewAssist'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'
import type { PositionData, ResumeData } from '@/types'
import { positionApi } from '@/api'

const props = defineProps<{
  isActive: boolean
  isPaused: boolean
  isRecording: boolean
  messages: Message[]
  suggestedQuestions: SuggestedQuestion[]
  showSuggestions: boolean
  config: InterviewConfig
  stats: {
    totalQuestions: number
    totalFollowups: number
    startTime: Date | null
  }
}>()

const emit = defineEmits<{
  start: []
  pause: []
  resume: []
  end: []
  export: []
  ask: [question: string]
  submit: [answer: string]
  useSuggestion: [suggestion: SuggestedQuestion]
  clearSuggestions: []
  updateConfig: [config: Partial<InterviewConfig>]
  toggleRecording: [isRecording: boolean]
  selectCandidate: [candidate: { name: string; position: string; resumeId: string }]
}>()

// 本地配置（可调节）
const localConfig = reactive({
  followupCount: props.config.followupCount,
  alternativeCount: props.config.alternativeCount
})

const suggestionDelaySeconds = ref(props.config.suggestionDelay / 1000)

// 准备步骤状态
const step1Done = ref(false)
const step2Done = ref(false)
const checkingMic = ref(false)

// 候选人选择状态
const showCandidateSelector = ref(false)
const positions = ref<PositionData[]>([])
const selectedPositionId = ref<string | null>(null)
const selectedResumeId = ref<string | null>(null)
const selectedCandidateInfo = ref<{ name: string; position: string } | null>(null)

// 当前岗位下的简历列表
const currentResumes = computed(() => {
  if (!selectedPositionId.value) return []
  const pos = positions.value.find(p => p.id === selectedPositionId.value)
  return pos?.resumes || []
})

// 输入状态
const questionInput = ref('')
const answerInput = ref('')
const chatContainerRef = ref<HTMLElement | null>(null)

// 倒计时
const suggestionCountdown = ref(0)

// 语音识别相关
const recognizedTextBeforeStart = ref('') // 记录开始录音前输入框的内容

// 初始化语音识别
const {
  isSupported: speechSupported,
  isListening: isSpeechListening,
  transcript: speechTranscript,
  interimTranscript: speechInterim,
  finalTranscript: speechFinal,
  error: speechError,
  start: startSpeech,
  stop: stopSpeech,
  reset: resetSpeech
} = useSpeechRecognition({
  lang: 'zh-CN',
  continuous: true,
  interimResults: true
})

// 监听语音识别结果，实时更新输入框
watch([speechFinal, speechInterim], ([final, interim]) => {
  if (isSpeechListening.value) {
    // 组合：录音前的文字 + 最终确认的文字 + 临时文字
    answerInput.value = recognizedTextBeforeStart.value + final + interim
  }
})

// 加载岗位列表
const loadPositions = async () => {
  try {
    const result = await positionApi.getPositions({ include_resumes: true })
    positions.value = result.positions || []
  } catch (err) {
    console.error('加载岗位列表失败:', err)
  }
}

// 获取简历显示标签
const getResumeLabel = (resume: ResumeData) => {
  const name = resume.candidate_name || '未知候选人'
  const score = resume.screening_score?.comprehensive_score || resume.scores?.comprehensive_score
  return score ? `${name} (${score}分)` : name
}

// 岗位变更处理
const handlePositionChange = () => {
  selectedResumeId.value = null
}

// 简历变更处理
const handleResumeChange = () => {
  // 可以在这里做一些处理
}

// 确认选择候选人
const confirmCandidateSelection = () => {
  const resume = currentResumes.value.find(r => r.id === selectedResumeId.value)
  if (resume) {
    selectedCandidateInfo.value = {
      name: resume.candidate_name,
      position: resume.position_title
    }
    showCandidateSelector.value = false
    step2Done.value = true
    emit('selectCandidate', {
      name: resume.candidate_name,
      position: resume.position_title,
      resumeId: resume.id
    })
  }
}

// 跳过候选人选择
const skipCandidateSelection = () => {
  step2Done.value = true
  showCandidateSelector.value = false
}

// 组件挂载时加载岗位
onMounted(() => {
  loadPositions()
})

// 计算属性
const canStart = computed(() => step1Done.value && step2Done.value)

const formatDuration = computed(() => {
  if (!props.stats.startTime) return '00:00'
  const seconds = Math.floor((Date.now() - props.stats.startTime.getTime()) / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

// 方法
const formatTime = (date: Date) => {
  return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const getScoreClass = (score: number) => {
  if (score >= 80) return 'score-excellent'
  if (score >= 60) return 'score-good'
  if (score >= 40) return 'score-average'
  return 'score-poor'
}

const getRecommendationText = (rec: string) => {
  const texts: Record<string, string> = {
    excellent: '优秀',
    good: '良好',
    average: '一般',
    needsImprovement: '需改进'
  }
  return texts[rec] || rec
}

const checkMicrophone = async () => {
  checkingMic.value = true
  try {
    // 模拟麦克风检测
    await new Promise(resolve => setTimeout(resolve, 1500))
    step1Done.value = true
  } catch {
    // 处理错误
  } finally {
    checkingMic.value = false
  }
}

const handleStart = () => {
  // 更新配置
  emit('updateConfig', {
    followupCount: localConfig.followupCount,
    alternativeCount: localConfig.alternativeCount,
    suggestionDelay: suggestionDelaySeconds.value * 1000
  })
  emit('start')
}

const sendQuestion = () => {
  if (questionInput.value.trim()) {
    emit('ask', questionInput.value.trim())
    questionInput.value = ''
  }
}

const submitAnswer = () => {
  if (answerInput.value.trim()) {
    // 如果正在录音，先停止
    if (isSpeechListening.value) {
      stopSpeech()
    }
    emit('submit', answerInput.value.trim())
    answerInput.value = ''
    // 重置语音识别状态
    resetSpeech()
    recognizedTextBeforeStart.value = ''
  }
}

const toggleRecording = async () => {
  if (isSpeechListening.value) {
    // 停止录音
    stopSpeech()
    emit('toggleRecording', false)
  } else {
    // 开始录音前，保存当前输入框内容
    recognizedTextBeforeStart.value = answerInput.value
    // 重置语音识别的累积文本
    resetSpeech()
    // 开始录音
    const success = await startSpeech()
    if (success) {
      emit('toggleRecording', true)
    }
  }
}

const handleUseSuggestion = (suggestion: SuggestedQuestion) => {
  emit('useSuggestion', suggestion)
}

// 监听配置变化
watch(localConfig, (newConfig) => {
  emit('updateConfig', {
    followupCount: newConfig.followupCount,
    alternativeCount: newConfig.alternativeCount
  })
}, { deep: true })

watch(suggestionDelaySeconds, (newValue) => {
  emit('updateConfig', { suggestionDelay: newValue * 1000 })
})

// 自动滚动
watch(() => props.messages.length, () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  })
})
</script>

<style scoped lang="scss">
.live-interview-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

// 设置区域
.setup-area {
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 900px;
  margin: 0 auto;
  
  .setup-header {
    text-align: center;
    margin-bottom: 40px;
    
    .icon-wrapper {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      
      &.recording {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        animation: pulse-red 2s infinite;
      }
      
      .mic-icon {
        font-size: 40px;
        color: white;
      }
    }
    
    h3 {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 0 0 12px;
    }
    
    .desc {
      font-size: 16px;
      color: #6b7280;
      margin: 0;
    }
  }
}

.config-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  width: 100%;
  margin-bottom: 40px;
}

.config-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  
  .card-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    
    &.alt { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    &.timer { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    
    .el-icon {
      font-size: 24px;
      color: white;
    }
  }
  
  .card-body {
    h4 {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
      margin: 0 0 4px;
    }
    
    p {
      font-size: 13px;
      color: #9ca3af;
      margin: 0 0 16px;
    }
  }
}

.prep-steps {
  width: 100%;
  margin-bottom: 40px;
  
  .step {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: white;
    border-radius: 12px;
    margin-bottom: 12px;
    border: 2px solid #e5e7eb;
    transition: all 0.3s;
    
    &.completed {
      border-color: #10b981;
      background: #f0fdf4;
    }
    
    &.expanded {
      border-color: #667eea;
    }
    
    .step-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #6b7280;
      flex-shrink: 0;
      
      .completed & {
        background: #10b981;
        color: white;
      }
    }
    
    .step-content {
      flex: 1;
      
      h5 {
        font-size: 15px;
        font-weight: 600;
        color: #1a1a2e;
        margin: 0 0 4px;
      }
      
      p {
        font-size: 13px;
        color: #9ca3af;
        margin: 0;
        
        &.success { color: #10b981; }
      }
    }
    
    .step-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
  }
}

// 候选人选择面板
.candidate-selector-panel {
  background: white;
  border-radius: 12px;
  border: 2px solid #667eea;
  margin-bottom: 12px;
  overflow: hidden;
  
  .selector-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-weight: 500;
    
    .el-icon {
      font-size: 18px;
    }
  }
  
  .selector-body {
    padding: 20px;
    
    .select-group {
      margin-bottom: 16px;
      
      label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: #374151;
        margin-bottom: 8px;
      }
      
      .el-select {
        width: 100%;
      }
    }
    
    .no-candidates {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 24px;
      background: #fef3c7;
      border-radius: 8px;
      color: #92400e;
      font-size: 14px;
      margin-bottom: 16px;
    }
    
    .selector-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
    }
  }
}

// 展开动画
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
  transform: translateY(-10px);
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 400px;
}

.action-area {
  .start-btn {
    padding: 16px 48px;
    font-size: 18px;
    border-radius: 12px;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    border: none;
    
    &:hover:not(:disabled) {
      transform: scale(1.05);
    }
  }
}

// 面试进行中
.interview-active {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border-radius: 16px;
  overflow: hidden;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  
  .status-left {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .live-tag {
      .live-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: white;
        margin-right: 6px;
        animation: pulse 1s infinite;
      }
    }
    
    .status-text {
      font-weight: 500;
      color: #374151;
    }
  }
  
  .status-right {
    display: flex;
    gap: 24px;
    
    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #6b7280;
      font-size: 14px;
    }
  }
}

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 0;
  overflow: hidden;
}

.chat-section {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e5e7eb;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  
  .messages-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
}

.message-item {
  display: flex;
  gap: 14px;
  animation: slideIn 0.3s ease;
  
  &.message-system {
    justify-content: center;
    
    .message-avatar { display: none; }
    
    .message-body {
      background: #fef3c7;
      border-radius: 8px;
      padding: 10px 16px;
      
      .message-header { display: none; }
      
      .message-content {
        color: #92400e;
        font-size: 14px;
        text-align: center;
      }
    }
  }
  
  &.message-interviewer {
    .message-body {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
    }
  }
  
  &.message-candidate {
    .message-body {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
    }
  }
  
  .message-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    flex-shrink: 0;
  }
  
  .message-body {
    flex: 1;
    padding: 16px;
    border-radius: 12px;
    
    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      
      .role-name {
        font-weight: 600;
        color: #374151;
        font-size: 14px;
      }
      
      .timestamp {
        font-size: 12px;
        color: #9ca3af;
      }
    }
    
    .message-content {
      color: #4b5563;
      line-height: 1.6;
    }
  }
}

.evaluation-badge {
  margin-top: 12px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  
  .eval-score {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    &.score-excellent { background: linear-gradient(135deg, #10b981, #059669); }
    &.score-good { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    &.score-average { background: linear-gradient(135deg, #f59e0b, #d97706); }
    &.score-poor { background: linear-gradient(135deg, #ef4444, #dc2626); }
    
    .score-value {
      font-size: 18px;
      font-weight: 700;
      color: white;
    }
    
    .score-label {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.8);
    }
  }
  
  .eval-info {
    flex: 1;
    
    .recommendation {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      background: #e5e7eb;
      color: #374151;
      margin-bottom: 6px;
    }
    
    .feedback {
      display: block;
      font-size: 13px;
      color: #6b7280;
      line-height: 1.5;
    }
  }
}

.input-section {
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #e5e7eb;
  
  .interviewer-input,
  .candidate-input {
    margin-bottom: 16px;
    
    &:last-child { margin-bottom: 0; }
    
    .input-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #6b7280;
      margin-bottom: 8px;
    }
    
    .input-row {
      display: flex;
      gap: 12px;
      
      .el-textarea { flex: 1; }
      
      .input-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        
        .mic-btn {
          width: 48px;
          height: 48px;
          transition: all 0.3s ease;
          
          &.recording {
            animation: pulse-recording 1.5s infinite;
            box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3);
          }
        }
      }
      
      // 录音时的输入框样式
      :deep(.recording-active) {
        .el-textarea__inner {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
          animation: border-pulse 2s infinite;
        }
      }
    }
  }
  
  .recording-tag {
    animation: tag-pulse 1s infinite;
  }
}

@keyframes pulse-recording {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.15);
  }
}

@keyframes border-pulse {
  0%, 100% { 
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
  }
  50% { 
    border-color: #f87171;
    box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.1);
  }
}

@keyframes tag-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.suggestion-section {
  background: white;
  overflow-y: auto;
}

.control-bar {
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
  gap: 12px;
}

.rec-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef4444;
  margin-right: 4px;
  animation: pulse 1s infinite;
}

// 动画
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-enter-active,
.message-leave-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.mr-2 {
  margin-right: 8px;
}

@media (max-width: 1200px) {
  .config-cards {
    grid-template-columns: 1fr;
  }
  
  .main-content {
    grid-template-columns: 1fr;
    
    .suggestion-section {
      display: none;
    }
  }
}
</style>
