<template>
  <div class="interview-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">面试辅助系统</h1>
        <p class="page-desc">AI 辅助生成面试问题，实时评估候选人回答</p>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="content-grid">
      <!-- 左侧面板 -->
      <div class="left-panel">
        <!-- 候选人选择 -->
        <el-card class="candidate-card" shadow="hover">
          <template #header>
            <span class="card-title">选择候选人</span>
          </template>
          
          <!-- 简历组选择 -->
          <div class="select-group">
            <label>简历组:</label>
            <el-select
              v-model="selectedGroupId"
              placeholder="请选择简历组"
              style="width: 100%"
              @change="loadGroupResumes"
            >
              <el-option
                v-for="group in availableGroups"
                :key="group.id"
                :label="group.group_name"
                :value="group.id"
              />
            </el-select>
          </div>

          <!-- 候选人选择 -->
          <div class="select-group" v-if="groupResumes.length > 0">
            <label>候选人:</label>
            <el-select
              v-model="selectedResumeId"
              placeholder="请选择候选人"
              style="width: 100%"
              @change="loadResumeDetails"
            >
              <el-option
                v-for="resume in groupResumes"
                :key="resume.id"
                :label="resume.candidate_name || '未知候选人'"
                :value="resume.id"
              />
            </el-select>
          </div>

          <!-- 候选人信息 -->
          <div v-if="selectedResume" class="candidate-info">
            <h4>{{ selectedResume.candidate_name }}</h4>
            <div class="info-row">
              <span class="label">岗位:</span>
              <span>{{ selectedResume.position_title }}</span>
            </div>
            <div v-if="selectedResume.scores" class="info-row">
              <span class="label">综合评分:</span>
              <el-tag type="success">{{ selectedResume.scores.comprehensive_score }}</el-tag>
            </div>
          </div>
        </el-card>

        <!-- 面试配置 -->
        <el-card class="config-card" shadow="hover">
          <template #header>
            <span class="card-title">面试配置</span>
          </template>
          <el-form label-width="80px" size="small">
            <el-form-item label="面试官">
              <el-input v-model="interviewConfig.interviewer" placeholder="面试官姓名" />
            </el-form-item>
            <el-form-item label="面试轮次">
              <el-select v-model="interviewConfig.round" style="width: 100%">
                <el-option label="初面" value="first" />
                <el-option label="技术面" value="technical" />
                <el-option label="终面" value="final" />
              </el-select>
            </el-form-item>
            <el-form-item label="问题数量">
              <el-input-number v-model="interviewConfig.questionCount" :min="3" :max="20" />
            </el-form-item>
          </el-form>
        </el-card>
      </div>

      <!-- 右侧面板 - 面试区域 -->
      <div class="right-panel">
        <el-card class="interview-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">面试问答</span>
              <div class="header-actions">
                <el-button
                  type="primary"
                  :disabled="!selectedResume || isGenerating"
                  :loading="isGenerating"
                  @click="generateQuestions"
                >
                  {{ isGenerating ? '生成中...' : '生成面试题' }}
                </el-button>
                <el-button
                  v-if="questions.length > 0"
                  type="success"
                  @click="exportReport"
                >
                  导出报告
                </el-button>
              </div>
            </div>
          </template>

          <!-- 空状态 -->
          <div v-if="!selectedResume" class="empty-state">
            <el-empty description="请先选择候选人" :image-size="100" />
          </div>

          <div v-else-if="questions.length === 0" class="empty-state">
            <el-empty description="点击「生成面试题」开始面试" :image-size="100" />
          </div>

          <!-- 问题列表 -->
          <div v-else class="questions-list">
            <div
              v-for="(question, index) in questions"
              :key="index"
              class="question-item"
              :class="{ 'is-current': currentQuestionIndex === index }"
            >
              <div class="question-header">
                <span class="question-number">问题 {{ index + 1 }}</span>
                <el-tag :type="getCategoryType(question.category)" size="small">
                  {{ question.category }}
                </el-tag>
                <el-rate
                  v-model="question.difficulty"
                  disabled
                  :max="5"
                  size="small"
                  class="difficulty-rate"
                />
              </div>

              <div class="question-content">
                <p class="question-text">{{ question.question }}</p>
                <div v-if="question.expected_skills?.length" class="expected-skills">
                  <span class="label">考察技能:</span>
                  <el-tag v-for="skill in question.expected_skills" :key="skill" size="small" type="info">
                    {{ skill }}
                  </el-tag>
                </div>
              </div>

              <!-- 回答区域 -->
              <div class="answer-section">
                <el-input
                  v-model="question.answer"
                  type="textarea"
                  :rows="3"
                  placeholder="记录候选人回答..."
                  @focus="currentQuestionIndex = index"
                />
                
                <!-- 评分区域 -->
                <div class="evaluation-section">
                  <div class="eval-item">
                    <span class="label">回答评分:</span>
                    <el-rate v-model="question.score" :max="5" />
                  </div>
                  <el-input
                    v-model="question.comment"
                    placeholder="评价备注"
                    size="small"
                    style="margin-top: 8px"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 面试总结 -->
          <div v-if="questions.length > 0" class="interview-summary">
            <h4>面试总结</h4>
            <el-input
              v-model="interviewSummary"
              type="textarea"
              :rows="4"
              placeholder="填写面试总体评价和建议..."
            />
            <div class="summary-actions">
              <div class="overall-score">
                <span>总体评分:</span>
                <el-rate v-model="overallScore" :max="5" size="large" />
              </div>
              <el-button type="primary" @click="submitInterview">
                提交面试结果
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { screeningApi, positionApi } from '@/api'
import type { ResumeGroup, ResumeData, PositionData } from '@/types'

interface Question {
  question: string
  category: string
  difficulty: number
  expected_skills: string[]
  answer: string
  score: number
  comment: string
}

// 响应式数据
const availableGroups = ref<ResumeGroup[]>([])
const selectedGroupId = ref('')
const groupResumes = ref<ResumeData[]>([])
const selectedResumeId = ref('')
const selectedResume = ref<ResumeData | null>(null)
const positionData = ref<PositionData | null>(null)

// 面试配置
const interviewConfig = reactive({
  interviewer: '',
  round: 'first',
  questionCount: 5
})

// 面试数据
const questions = ref<Question[]>([])
const currentQuestionIndex = ref(0)
const isGenerating = ref(false)
const interviewSummary = ref('')
const overallScore = ref(0)

// 加载简历组
const loadGroups = async () => {
  try {
    availableGroups.value = await screeningApi.getGroups()
  } catch (err) {
    console.error('加载简历组失败:', err)
  }
}

// 加载岗位信息
const loadPositionData = async () => {
  try {
    positionData.value = await positionApi.getCriteria()
  } catch (err) {
    console.error('加载岗位数据失败:', err)
  }
}

// 加载简历组中的简历
const loadGroupResumes = async () => {
  if (!selectedGroupId.value) {
    groupResumes.value = []
    return
  }

  try {
    const group = await screeningApi.getGroupDetail(selectedGroupId.value)
    groupResumes.value = group.resumes || []
    selectedResumeId.value = ''
    selectedResume.value = null
  } catch (err) {
    console.error('加载简历失败:', err)
  }
}

// 加载简历详情
const loadResumeDetails = () => {
  if (!selectedResumeId.value) {
    selectedResume.value = null
    return
  }
  selectedResume.value = groupResumes.value.find(r => r.id === selectedResumeId.value) || null
  // 重置问题
  questions.value = []
}

// 生成面试问题
const generateQuestions = async () => {
  if (!selectedResume.value || !positionData.value) return

  isGenerating.value = true
  try {
    // 模拟生成问题（实际应调用后端 API）
    await new Promise(resolve => setTimeout(resolve, 1500))

    const skills = positionData.value.required_skills || []
    const categories = ['技术能力', '项目经验', '团队协作', '问题解决', '职业规划']

    questions.value = Array.from({ length: interviewConfig.questionCount }, (_, i) => ({
      question: generateSampleQuestion(categories[i % categories.length], skills),
      category: categories[i % categories.length],
      difficulty: Math.floor(Math.random() * 3) + 2,
      expected_skills: skills.slice(0, 2),
      answer: '',
      score: 0,
      comment: ''
    }))

    ElMessage.success('面试题已生成')
  } catch (err) {
    ElMessage.error('生成面试题失败')
  } finally {
    isGenerating.value = false
  }
}

// 生成示例问题
const generateSampleQuestion = (category: string, skills: string[]) => {
  const templates: Record<string, string[]> = {
    '技术能力': [
      `请介绍一下您对 ${skills[0] || '前端技术'} 的理解和实际应用经验？`,
      `在使用 ${skills[0] || '相关技术'} 时，您遇到过哪些挑战？如何解决的？`,
      `请解释一下 ${skills[0] || '这项技术'} 的核心原理？`
    ],
    '项目经验': [
      '请介绍一个您最引以为傲的项目，您在其中担任什么角色？',
      '在项目中遇到最大的技术挑战是什么？您是如何克服的？',
      '请描述一个您主导的技术方案设计过程？'
    ],
    '团队协作': [
      '您如何与团队成员进行有效沟通和协作？',
      '当团队意见不一致时，您通常如何处理？',
      '请举例说明您如何帮助团队成员成长？'
    ],
    '问题解决': [
      '遇到复杂问题时，您的分析思路是什么？',
      '请描述一次您快速定位并解决生产问题的经历？',
      '如何平衡项目进度和代码质量？'
    ],
    '职业规划': [
      '您未来3-5年的职业规划是什么？',
      '为什么选择加入我们公司？',
      '您期望在新岗位上获得什么样的成长？'
    ]
  }

  const categoryQuestions = templates[category] || templates['技术能力']
  return categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)]
}

// 获取分类标签类型
const getCategoryType = (category: string) => {
  const types: Record<string, string> = {
    '技术能力': 'primary',
    '项目经验': 'success',
    '团队协作': 'warning',
    '问题解决': 'danger',
    '职业规划': 'info'
  }
  return types[category] || 'info'
}

// 导出报告
const exportReport = () => {
  const report = {
    candidate: selectedResume.value?.candidate_name,
    position: selectedResume.value?.position_title,
    interviewer: interviewConfig.interviewer,
    round: interviewConfig.round,
    questions: questions.value,
    summary: interviewSummary.value,
    overallScore: overallScore.value,
    date: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `interview_report_${selectedResume.value?.candidate_name || 'unknown'}.json`
  a.click()
  URL.revokeObjectURL(url)

  ElMessage.success('报告已导出')
}

// 提交面试结果
const submitInterview = () => {
  if (!interviewSummary.value) {
    ElMessage.warning('请填写面试总结')
    return
  }
  if (overallScore.value === 0) {
    ElMessage.warning('请给出总体评分')
    return
  }

  // 实际应调用后端 API 保存面试结果
  ElMessage.success('面试结果已提交')
}

// 生命周期
onMounted(() => {
  loadGroups()
  loadPositionData()
})
</script>

<style scoped lang="scss">
.interview-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  .page-title {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
  }

  .page-desc {
    margin: 0;
    font-size: 14px;
    color: #909399;
  }
}

.content-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  align-items: start;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 8px;
}

// 左侧面板
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.select-group {
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    color: #606266;
  }
}

.candidate-info {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;

  h4 {
    margin: 0 0 12px 0;
    font-size: 15px;
    color: #303133;
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 13px;

    .label {
      color: #909399;
    }
  }
}

// 右侧面板
.empty-state {
  padding: 40px 0;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.question-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border-left: 3px solid #e4e7ed;
  transition: all 0.2s;

  &.is-current {
    border-left-color: #409eff;
    background: #ecf5ff;
  }
}

.question-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  .question-number {
    font-weight: 600;
    color: #303133;
  }

  .difficulty-rate {
    margin-left: auto;
  }
}

.question-content {
  margin-bottom: 12px;

  .question-text {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #303133;
    line-height: 1.6;
  }

  .expected-skills {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    .label {
      font-size: 12px;
      color: #909399;
    }
  }
}

.answer-section {
  margin-top: 12px;
}

.evaluation-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e4e7ed;

  .eval-item {
    display: flex;
    align-items: center;
    gap: 12px;

    .label {
      font-size: 13px;
      color: #606266;
    }
  }
}

// 面试总结
.interview-summary {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;

  h4 {
    margin: 0 0 12px 0;
    font-size: 15px;
    color: #303133;
  }
}

.summary-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;

  .overall-score {
    display: flex;
    align-items: center;
    gap: 12px;

    span {
      font-size: 14px;
      color: #606266;
    }
  }
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
