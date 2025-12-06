<template>
  <div class="interview-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <span class="title-icon">🎯</span>
            面试辅助系统
          </h1>
          <p class="page-desc">智能追问推荐 · 实时语音转录 · AI 模拟演示</p>
        </div>
        <div class="header-right">
          <el-tag v-if="isInterviewActive" type="success" effect="dark" size="large" class="status-tag">
            <span class="status-dot"></span>
            面试进行中
          </el-tag>
        </div>
      </div>
      
      <!-- 模式切换标签 -->
      <div class="mode-tabs">
        <div
          class="mode-tab"
          :class="{ 'active': currentMode === 'ai-simulation' }"
          @click="switchMode('ai-simulation')"
        >
          <div class="tab-icon">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="tab-content">
            <span class="tab-title">AI 模拟演示</span>
            <span class="tab-desc">虚拟候选人，体验系统功能</span>
          </div>
        </div>
        <div
          class="mode-tab"
          :class="{ 'active': currentMode === 'live-interview' }"
          @click="switchMode('live-interview')"
        >
          <div class="tab-icon live">
            <el-icon><Microphone /></el-icon>
          </div>
          <div class="tab-content">
            <span class="tab-title">真人实时面试</span>
            <span class="tab-desc">语音转文字，智能追问推荐</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-container">
      <transition name="slide-fade" mode="out-in">
        <!-- AI 模拟面板 -->
        <AISimulationPanel
          v-if="currentMode === 'ai-simulation'"
          key="ai-simulation"
          :is-active="isInterviewActive && config.mode === 'ai-simulation'"
          :is-paused="isPaused"
          :messages="messages"
          :is-a-i-typing="isAITyping"
          :selected-candidate="selectedCandidate"
          :candidate-presets="candidatePresets"
          :stats="stats"
          @start="handleStartAI"
          @pause="pauseInterview"
          @resume="resumeInterview"
          @end="endInterview"
          @export="exportRecord"
          @ask="askQuestion"
        />
        
        <!-- 真人面试面板 -->
        <LiveInterviewPanel
          v-else
          key="live-interview"
          :is-active="isInterviewActive && config.mode === 'live-interview'"
          :is-paused="isPaused"
          :is-recording="isRecording"
          :messages="messages"
          :suggested-questions="suggestedQuestions"
          :show-suggestions="showSuggestions"
          :is-loading-questions="isLoadingQuestions"
          :is-waiting-for-answer="isWaitingForAnswer"
          :config="config"
          :interest-points="interestPoints"
          :stats="stats"
          @start="handleStartLive"
          @pause="pauseInterview"
          @resume="resumeInterview"
          @quit="quitInterview"
          @end-and-save="endAndSaveInterview"
          @export="exportRecord"
          @ask="askQuestion"
          @submit="submitAnswer"
          @use-suggestion="useSuggestedQuestion"
          @use-interest-point="askInterestPointQuestion"
          @clear-suggestions="clearSuggestions"
          @update-config="updateConfig"
          @toggle-recording="toggleRecording"
          @select-candidate="handleSelectCandidate"
        />
      </transition>
    </div>
    
    <!-- 浮动问题推荐（AI模式下显示） -->
    <transition name="slide-up">
      <div
        v-if="currentMode === 'ai-simulation' && showSuggestions && isInterviewActive"
        class="floating-suggestions"
      >
        <div class="suggestions-header">
          <el-icon><Promotion /></el-icon>
          <span>推荐追问</span>
          <el-button text size="small" @click="clearSuggestions">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <div class="suggestions-list">
          <div
            v-for="(q, index) in suggestedQuestions.slice(0, 3)"
            :key="q.id"
            class="suggestion-item"
            @click="useSuggestedQuestion(q)"
          >
            <span class="item-number">{{ index + 1 }}</span>
            <span class="item-text">{{ q.question }}</span>
            <el-icon class="item-arrow"><Right /></el-icon>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Monitor, Microphone, Promotion, Close, Right } from '@element-plus/icons-vue'

// 组件导入
import { AISimulationPanel, LiveInterviewPanel } from '@/components/interview'

// Composables
import { useInterviewAssist, candidatePresets } from '@/composables/useInterviewAssist'

// 使用面试辅助 composable
const {
  config,
  updateConfig,
  isInterviewActive,
  isPaused,
  messages,
  isRecording,
  isAITyping,
  selectedCandidate,
  suggestedQuestions,
  showSuggestions,
  isLoadingQuestions,
  isWaitingForAnswer,
  interestPoints,
  askInterestPointQuestion,
  stats,
  createSession,
  fetchQuestionPool,
  startInterview,
  pauseInterview,
  resumeInterview,
  quitInterview,
  endAndSaveInterview,
  endInterview,
  askQuestion,
  submitAnswer,
  useSuggestedQuestion,
  clearSuggestions,
  exportRecord
} = useInterviewAssist()

// 当前模式
const currentMode = ref<'ai-simulation' | 'live-interview'>('ai-simulation')

// 切换模式
const switchMode = (mode: 'ai-simulation' | 'live-interview') => {
  if (isInterviewActive.value) {
    // 如果面试进行中，提示用户
    return
  }
  currentMode.value = mode
  updateConfig({ mode })
}

// 开始 AI 模拟面试
const handleStartAI = (candidateType: string) => {
  updateConfig({ mode: 'ai-simulation' })
  startInterview(candidateType)
}

// 开始真人面试
const handleStartLive = () => {
  updateConfig({ mode: 'live-interview' })
  startInterview()
}

// 选择候选人后创建会话并获取兴趣点
const handleSelectCandidate = async (candidate: { name: string; position: string; resumeId: string }) => {
  // 尝试创建后端会话
  await createSession(candidate.resumeId)
  // 无论后端是否成功，都获取问题池和兴趣点（失败时使用本地模拟）
  await fetchQuestionPool()
}

// 切换录音状态（由子组件控制，这里只同步状态）
const toggleRecording = (recording: boolean) => {
  isRecording.value = recording
}

// 计时器更新
let durationTimer: number | null = null

watch(isInterviewActive, (active) => {
  if (active) {
    durationTimer = window.setInterval(() => {
      // 触发响应式更新
    }, 1000)
  } else if (durationTimer) {
    clearInterval(durationTimer)
  }
})

onUnmounted(() => {
  if (durationTimer) {
    clearInterval(durationTimer)
  }
})
</script>

<style scoped lang="scss">
.interview-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: calc(100vh - 140px);
  position: relative;
}

// 页面头部
.page-header {
  background: white;
  border-radius: 20px;
  padding: 28px 32px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 28px;
  }
  
  .header-left {
    .page-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 8px;
      font-size: 28px;
      font-weight: 700;
      color: #1a1a2e;
      
      .title-icon {
        font-size: 32px;
      }
    }
    
    .page-desc {
      margin: 0;
      font-size: 15px;
      color: #6b7280;
      letter-spacing: 0.5px;
    }
  }
  
  .header-right {
    .status-tag {
      padding: 8px 16px;
      font-size: 14px;
      border-radius: 20px;
      
      .status-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: white;
        margin-right: 8px;
        animation: pulse 1.5s infinite;
      }
    }
  }
}

// 模式切换标签
.mode-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: #f8fafc;
  border-radius: 16px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    background: #f1f5f9;
    transform: translateY(-2px);
  }
  
  &.active {
    background: white;
    border-color: #667eea;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
    
    .tab-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      
      &.live {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      }
      
      .el-icon {
        color: white;
      }
    }
    
    .tab-title {
      color: #1a1a2e;
    }
  }
  
  .tab-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
    
    .el-icon {
      font-size: 26px;
      color: #9ca3af;
      transition: color 0.3s;
    }
  }
  
  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    
    .tab-title {
      font-size: 16px;
      font-weight: 600;
      color: #6b7280;
      transition: color 0.3s;
    }
    
    .tab-desc {
      font-size: 13px;
      color: #9ca3af;
    }
  }
}

// 主内容区域
.main-container {
  flex: 1;
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  min-height: 600px;
}

// 浮动问题推荐
.floating-suggestions {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 380px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  z-index: 1000;
  
  .suggestions-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-weight: 600;
    
    .el-button {
      margin-left: auto;
      color: white;
    }
  }
  
  .suggestions-list {
    padding: 12px;
    
    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: #f3f4f6;
        
        .item-arrow {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      .item-number {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #667eea;
        color: white;
        font-size: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .item-text {
        flex: 1;
        font-size: 14px;
        color: #374151;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .item-arrow {
        color: #667eea;
        opacity: 0;
        transform: translateX(-8px);
        transition: all 0.2s;
      }
    }
  }
}

// 动画
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.slide-fade-enter-active {
  transition: all 0.4s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-up-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-leave-active {
  transition: all 0.3s ease-in;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

// 响应式
@media (max-width: 768px) {
  .mode-tabs {
    grid-template-columns: 1fr;
  }
  
  .floating-suggestions {
    left: 16px;
    right: 16px;
    width: auto;
    bottom: 16px;
  }
}
</style>
