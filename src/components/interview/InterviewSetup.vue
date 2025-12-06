<template>
  <div class="setup-area">
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
        <div class="card-icon interest">
          <el-icon><Star /></el-icon>
        </div>
        <div class="card-body">
          <h4>简历兴趣点</h4>
          <p>从简历中提取的可提问兴趣点数量</p>
          <el-slider
            v-model="localConfig.interestPointCount"
            :min="1"
            :max="3"
            :step="1"
            show-stops
            :marks="{ 1: '1个', 2: '2个', 3: '3个' }"
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
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { Microphone, VideoPlay, QuestionFilled, Grid, Check, User, Warning, Star } from '@element-plus/icons-vue'
import type { InterviewConfig } from '@/composables/useInterviewAssist'
import type { PositionData, ResumeData } from '@/types'
import { positionApi } from '@/api'

const props = defineProps<{
  config: InterviewConfig
}>()

const emit = defineEmits<{
  start: []
  updateConfig: [config: Partial<InterviewConfig>]
  selectCandidate: [candidate: { name: string; position: string; resumeId: string }]
}>()

// 本地配置
const localConfig = reactive({
  followupCount: props.config.followupCount,
  alternativeCount: props.config.alternativeCount,
  interestPointCount: props.config.interestPointCount
})

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

// 计算属性
const canStart = computed(() => step1Done.value && step2Done.value)

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

// 检查麦克风
const checkMicrophone = async () => {
  checkingMic.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1500))
    step1Done.value = true
  } catch {
    // 处理错误
  } finally {
    checkingMic.value = false
  }
}

// 开始面试
const handleStart = () => {
  emit('updateConfig', {
    followupCount: localConfig.followupCount,
    alternativeCount: localConfig.alternativeCount,
    interestPointCount: localConfig.interestPointCount
  })
  emit('start')
}

// 监听配置变化
watch(localConfig, (newConfig) => {
  emit('updateConfig', {
    followupCount: newConfig.followupCount,
    alternativeCount: newConfig.alternativeCount,
    interestPointCount: newConfig.interestPointCount
  })
}, { deep: true })

// 组件挂载时加载岗位
onMounted(() => {
  loadPositions()
})
</script>

<style scoped lang="scss">
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
    &.interest { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    
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

.mr-2 {
  margin-right: 8px;
}

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
}

@media (max-width: 1200px) {
  .config-cards {
    grid-template-columns: 1fr;
  }
}
</style>
