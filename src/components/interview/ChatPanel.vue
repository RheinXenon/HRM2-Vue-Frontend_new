<template>
  <div class="chat-section">
    <!-- 消息列表 -->
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
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Microphone, VideoPause, Check, Edit, Promotion } from '@element-plus/icons-vue'
import type { Message } from '@/composables/useInterviewAssist'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'

const props = defineProps<{
  messages: Message[]
  isPaused: boolean
}>()

const emit = defineEmits<{
  ask: [question: string]
  submit: [answer: string]
  toggleRecording: [isRecording: boolean]
}>()

// 输入状态
const questionInput = ref('')
const answerInput = ref('')
const chatContainerRef = ref<HTMLElement | null>(null)

// 语音识别相关
const recognizedTextBeforeStart = ref('')

// 初始化语音识别
const {
  isSupported: speechSupported,
  isListening: isSpeechListening,
  finalTranscript: speechFinal,
  interimTranscript: speechInterim,
  start: startSpeech,
  stop: stopSpeech,
  reset: resetSpeech
} = useSpeechRecognition({
  lang: 'zh-CN',
  continuous: true,
  interimResults: true
})

// 监听语音识别结果
watch([speechFinal, speechInterim], ([final, interim]) => {
  if (isSpeechListening.value) {
    answerInput.value = recognizedTextBeforeStart.value + final + interim
  }
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

const sendQuestion = () => {
  if (questionInput.value.trim()) {
    emit('ask', questionInput.value.trim())
    questionInput.value = ''
  }
}

const submitAnswer = () => {
  if (answerInput.value.trim()) {
    if (isSpeechListening.value) {
      stopSpeech()
    }
    emit('submit', answerInput.value.trim())
    answerInput.value = ''
    resetSpeech()
    recognizedTextBeforeStart.value = ''
  }
}

const toggleRecording = async () => {
  if (isSpeechListening.value) {
    stopSpeech()
    emit('toggleRecording', false)
  } else {
    recognizedTextBeforeStart.value = answerInput.value
    resetSpeech()
    const success = await startSpeech()
    if (success) {
      emit('toggleRecording', true)
    }
  }
}

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

.rec-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef4444;
  margin-right: 4px;
  animation: pulse 1s infinite;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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
</style>
