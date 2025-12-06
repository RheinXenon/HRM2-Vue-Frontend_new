<template>
  <div class="question-suggestion" :class="{ 'visible': visible }">
    <!-- 头部 -->
    <div class="suggestion-header">
      <div class="header-title">
        <el-icon class="title-icon"><Promotion /></el-icon>
        <span>智能推荐问题</span>
      </div>
      <div class="header-actions">
        <el-button
          text
          size="small"
          :icon="RefreshRight"
          @click="$emit('refresh')"
          v-if="suggestions.length"
        >
          刷新
        </el-button>
        <el-button
          text
          size="small"
          :icon="Close"
          @click="$emit('dismiss')"
        />
      </div>
    </div>
    
    <!-- 问题列表 -->
    <transition name="fade" mode="out-in">
      <div v-if="loading || waitingForAnswer" class="loading-state" key="loading">
        <div class="loading-icon" :class="{ 'waiting': waitingForAnswer }">
          <el-icon :class="{ 'is-loading': !waitingForAnswer }"><Promotion /></el-icon>
        </div>
        <h4>{{ waitingForAnswer ? '等待候选人回复...' : '正在生成问题...' }}</h4>
        <p>{{ waitingForAnswer ? '面试官已提问，请等待候选人回答' : 'AI 正在分析回答并生成追问建议，请稍候' }}</p>
        <div class="loading-progress">
          <div class="progress-bar"></div>
        </div>
      </div>
      <div v-else-if="visible || unaskedInterestPoints.length" class="suggestions-content" key="content">
        <!-- 简历兴趣点 -->
        <div class="suggestion-group" v-if="unaskedInterestPoints.length">
          <div class="group-header">
            <div class="group-badge interest">
              <el-icon><Star /></el-icon>
            </div>
            <div class="group-info">
              <h4>简历兴趣点</h4>
              <p>基于简历和初筛评估提取的兴趣点问题</p>
            </div>
          </div>
          <transition-group name="list" tag="div" class="question-list interest">
            <div
              v-for="(point, index) in unaskedInterestPoints"
              :key="point.id"
              class="question-card interest"
              :style="{ '--delay': index * 0.1 + 's' }"
              @click="handleUseInterestPoint(point)"
            >
              <div class="card-icon-wrapper">
                <el-icon><Star /></el-icon>
              </div>
              <div class="card-content">
                <p class="interest-content">{{ point.content }}</p>
                <p class="question-text">{{ point.question }}</p>
              </div>
              <div class="card-action">
                <el-icon><Right /></el-icon>
              </div>
            </div>
          </transition-group>
        </div>
        
        <!-- 追问建议 -->
        <div class="suggestion-group" v-if="followupQuestions.length">
          <div class="group-header">
            <div class="group-badge followup">
              <el-icon><ChatDotRound /></el-icon>
            </div>
            <div class="group-info">
              <h4>追问建议</h4>
              <p>深入挖掘候选人的回答细节</p>
            </div>
          </div>
          <transition-group name="list" tag="div" class="question-list">
            <div
              v-for="(q, index) in followupQuestions"
              :key="q.id"
              class="question-card"
              :style="{ '--delay': index * 0.1 + 's' }"
            >
              <div class="card-number">{{ index + 1 }}</div>
              <div class="card-content">
                <p class="question-text">{{ q.question }}</p>
              </div>
              <div class="card-actions">
                <el-tooltip content="编辑后发送" placement="top">
                  <el-button
                    type="info"
                    text
                    size="small"
                    :icon="Edit"
                    @click="handleEdit(q, $event)"
                    class="edit-btn"
                  />
                </el-tooltip>
                <el-tooltip content="直接发送" placement="top">
                  <el-button
                    type="primary"
                    text
                    size="small"
                    :icon="Promotion"
                    @click="handleUse(q)"
                    class="send-btn"
                  />
                </el-tooltip>
              </div>
            </div>
          </transition-group>
        </div>
        
        <!-- 候选问题 -->
        <div class="suggestion-group" v-if="alternativeQuestions.length">
          <div class="group-header">
            <div class="group-badge alternative">
              <el-icon><Grid /></el-icon>
            </div>
            <div class="group-info">
              <h4>候选问题</h4>
              <p>不同角度的备选问题</p>
            </div>
          </div>
          <transition-group name="list" tag="div" class="question-list alternative">
            <div
              v-for="(q, index) in alternativeQuestions"
              :key="q.id"
              class="question-card alt"
              :style="{ '--delay': (followupQuestions.length + index) * 0.1 + 's' }"
            >
              <div class="card-angle">
                <el-tag size="small" type="info">{{ q.angle }}</el-tag>
              </div>
              <div class="card-content">
                <p class="question-text">{{ q.question }}</p>
              </div>
              <div class="card-actions">
                <el-tooltip content="编辑后发送" placement="top">
                  <el-button
                    type="info"
                    text
                    size="small"
                    :icon="Edit"
                    @click="handleEdit(q, $event)"
                    class="edit-btn"
                  />
                </el-tooltip>
                <el-tooltip content="直接发送" placement="top">
                  <el-button
                    type="primary"
                    text
                    size="small"
                    :icon="Promotion"
                    @click="handleUse(q)"
                    class="send-btn"
                  />
                </el-tooltip>
              </div>
            </div>
          </transition-group>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">
          <el-icon><Document /></el-icon>
        </div>
        <h4>等待回答</h4>
        <p>候选人回答后，系统将推荐追问和候选问题</p>
      </div>
    </transition>
    
    <!-- 配置提示 -->
    <div class="config-hint" v-if="visible">
      <el-icon><InfoFilled /></el-icon>
      <span>当前配置：{{ followupCount }} 个追问，{{ alternativeCount }} 个候选问题</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Promotion, RefreshRight, Close, ChatDotRound, Grid,
  Right, Document, InfoFilled, Star, Edit
} from '@element-plus/icons-vue'
import type { SuggestedQuestion, ResumeInterestPoint } from '@/composables/useInterviewAssist'

const props = defineProps<{
  suggestions: SuggestedQuestion[]
  visible: boolean
  loading?: boolean
  waitingForAnswer?: boolean
  followupCount: number
  alternativeCount: number
  interestPoints?: ResumeInterestPoint[]
}>()

const emit = defineEmits<{
  use: [suggestion: SuggestedQuestion]
  edit: [suggestion: SuggestedQuestion]  // 新增：编辑问题
  useInterestPoint: [point: ResumeInterestPoint]
  editInterestPoint: [point: ResumeInterestPoint]  // 新增：编辑兴趣点
  dismiss: []
  refresh: []
}>()

// 计算属性
const followupQuestions = computed(() =>
  props.suggestions.filter(s => s.type === 'followup')
)

const alternativeQuestions = computed(() =>
  props.suggestions.filter(s => s.type === 'alternative')
)

// 未提问的兴趣点
const unaskedInterestPoints = computed(() =>
  (props.interestPoints || []).filter(p => !p.isAsked)
)

// 方法
const handleUse = (suggestion: SuggestedQuestion) => {
  emit('use', suggestion)
}

const handleEdit = (suggestion: SuggestedQuestion, event: Event) => {
  event.stopPropagation()  // 阻止冒泡，避免触发卡片的 click
  emit('edit', suggestion)
}

const handleUseInterestPoint = (point: ResumeInterestPoint) => {
  emit('useInterestPoint', point)
}

const handleEditInterestPoint = (point: ResumeInterestPoint, event: Event) => {
  event.stopPropagation()
  emit('editInterestPoint', point)
}
</script>

<style scoped lang="scss">
@use './styles/interview-common' as common;

.question-suggestion {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #fafbfc 0%, #f3f4f6 100%);
  
  &.visible {
    .suggestions-content {
      opacity: 1;
    }
  }
}

.suggestion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #e5e7eb;
  
  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #1a1a2e;
    
    .title-icon {
      font-size: 20px;
      color: #667eea;
    }
  }
  
  .header-actions {
    display: flex;
    gap: 4px;
  }
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  
  .countdown-ring {
    position: relative;
    width: 100px;
    height: 100px;
    margin-bottom: 24px;
    
    svg {
      transform: rotate(-90deg);
      
      circle {
        fill: none;
        stroke-width: 6;
        stroke-linecap: round;
      }
      
      .ring-bg {
        stroke: #e5e7eb;
      }
      
      .ring-progress {
        stroke: url(#gradient);
        stroke: #667eea;
        stroke-dasharray: 283;
        transition: stroke-dashoffset 1s ease;
      }
    }
    
    .countdown-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 24px;
      font-weight: 700;
      color: #667eea;
    }
  }
  
  .loading-text {
    font-size: 14px;
    color: #6b7280;
    text-align: center;
    animation: pulse 2s infinite;
  }
}

.suggestions-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.suggestion-group {
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .group-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    
    .group-badge {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &.followup {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      
      &.alternative {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }
      
      &.interest {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      }
      
      .el-icon {
        font-size: 20px;
        color: white;
      }
    }
    
    .group-info {
      h4 {
        font-size: 15px;
        font-weight: 600;
        color: #1a1a2e;
        margin: 0 0 2px;
      }
      
      p {
        font-size: 12px;
        color: #9ca3af;
        margin: 0;
      }
    }
  }
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.question-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  animation: slideInRight 0.4s ease backwards;
  animation-delay: var(--delay, 0s);
  
  &:hover {
    border-color: #667eea;
    transform: translateX(4px);
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
    
    .card-action {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  &.alt {
    &:hover {
      border-color: #10b981;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15);
    }
  }
  
  &.interest {
    &:hover {
      border-color: #f59e0b;
      box-shadow: 0 4px 16px rgba(245, 158, 11, 0.15);
    }
    
    .card-icon-wrapper {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      .el-icon {
        font-size: 16px;
        color: white;
      }
    }
    
    .interest-content {
      font-size: 12px;
      color: #f59e0b;
      margin: 0 0 4px;
      font-weight: 500;
    }
  }
  
  .card-number {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .card-angle {
    flex-shrink: 0;
  }
  
  .card-content {
    flex: 1;
    min-width: 0;
    
    .question-text {
      font-size: 14px;
      color: #374151;
      line-height: 1.5;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }
  
  .card-action {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 0;
    transform: translateX(-8px);
    transition: all 0.25s ease;
    
    .el-icon {
      font-size: 14px;
      color: #667eea;
    }
  }
  
  .card-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    opacity: 0;
    transform: translateX(-8px);
    transition: all 0.25s ease;
    
    .edit-btn, .send-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      transition: all 0.2s ease;
      
      &:hover {
        transform: scale(1.1);
      }
    }
    
    .edit-btn {
      background: #f3f4f6;
      
      &:hover {
        background: #e5e7eb;
      }
    }
    
    .send-btn {
      background: #eff6ff;
      
      &:hover {
        background: #dbeafe;
      }
    }
  }
  
  &:hover .card-actions {
    opacity: 1;
    transform: translateX(0);
  }
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  
  .loading-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    
    .el-icon {
      font-size: 40px;
      color: #667eea;
      animation: spin 1.5s linear infinite;
    }
  }
  
  h4 {
    font-size: 16px;
    font-weight: 600;
    color: #667eea;
    margin: 0 0 8px;
  }
  
  p {
    font-size: 14px;
    color: #9ca3af;
    margin: 0 0 20px;
    text-align: center;
    max-width: 240px;
  }
  
  .loading-progress {
    width: 200px;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    overflow: hidden;
    
    .progress-bar {
      height: 100%;
      width: 30%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 2px;
      animation: progress 1.5s ease-in-out infinite;
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes progress {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(200%); }
  100% { transform: translateX(-100%); }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  
  .empty-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    
    .el-icon {
      font-size: 40px;
      color: #9ca3af;
    }
  }
  
  h4 {
    font-size: 16px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 8px;
  }
  
  p {
    font-size: 14px;
    color: #9ca3af;
    margin: 0;
    text-align: center;
    max-width: 240px;
  }
}

.config-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px;
  background: #f3f4f6;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
  color: #9ca3af;
  
  .el-icon {
    font-size: 14px;
  }
}

// 动画定义（scoped 样式需要本地定义）
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.list-enter-active {
  transition: all 0.3s ease;
}

.list-leave-active {
  transition: all 0.2s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
