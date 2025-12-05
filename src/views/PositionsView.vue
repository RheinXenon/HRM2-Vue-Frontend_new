<template>
  <div class="positions-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">招聘岗位管理</h1>
        <p class="page-desc">配置多个招聘岗位的基本要求和筛选标准</p>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="content-grid">
      <!-- 左侧：岗位列表 -->
      <el-card class="positions-list-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">岗位列表</span>
            <el-button type="primary" size="small" @click="showCreateDialog">
              <el-icon><Plus /></el-icon> 新建岗位
            </el-button>
          </div>
        </template>

        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>
        <div v-else-if="positions.length === 0" class="empty-positions">
          <el-empty description="暂无岗位，点击上方按钮创建" :image-size="80" />
        </div>
        <div v-else class="positions-list">
          <div
            v-for="pos in positions"
            :key="pos.id"
            class="position-item"
            :class="{ active: selectedPositionId === pos.id }"
            @click="selectPosition(pos)"
          >
            <div class="position-info">
              <div class="position-name">{{ pos.position }}</div>
              <div class="position-meta">
                <el-tag size="small" :type="getStatusType(pos.status)">
                  {{ getStatusText(pos.status) }}
                </el-tag>
                <span class="resume-count">{{ pos.resume_count || 0 }} 份简历</span>
              </div>
            </div>
            <div class="position-actions" @click.stop>
              <el-button
                type="danger"
                size="small"
                link
                @click="handleDeletePosition(pos)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 右侧：岗位详情编辑 -->
      <el-card class="form-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">
              {{ selectedPositionId ? '编辑岗位' : '选择岗位' }}
            </span>
            <div v-if="selectedPositionId" class="header-actions">
              <el-tag :type="hasChanges ? 'warning' : 'success'">
                {{ hasChanges ? '未保存' : '已保存' }}
              </el-tag>
              <el-button type="primary" size="small" :loading="saving" :disabled="!hasChanges" @click="handleSave">
                保存
              </el-button>
            </div>
          </div>
        </template>

        <div v-if="!selectedPositionId" class="no-selection">
          <el-empty description="请从左侧选择一个岗位进行编辑" :image-size="100" />
        </div>

        <el-form
          v-else
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-width="120px"
          label-position="left"
        >
          <!-- 岗位名称 -->
          <el-form-item label="岗位名称" prop="position">
            <el-input
              v-model="formData.position"
              placeholder="请输入岗位名称"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>

          <!-- 岗位描述 -->
          <el-form-item label="岗位描述" prop="description">
            <el-input
              v-model="formData.description"
              type="textarea"
              :rows="3"
              placeholder="请输入岗位描述"
            />
          </el-form-item>

          <!-- 最低工作经验 -->
          <el-form-item label="最低工作经验" prop="min_experience">
            <el-input-number
              v-model="formData.min_experience"
              :min="0"
              :max="20"
              controls-position="right"
            />
            <span class="unit-text">年</span>
          </el-form-item>

          <!-- 薪资范围 -->
          <el-form-item label="薪资范围" prop="salary_range">
            <div class="salary-range">
              <el-input-number
                v-model="formData.salary_range[0]"
                :min="0"
                :max="formData.salary_range[1]"
                controls-position="right"
                placeholder="最低薪资"
              />
              <span class="range-separator">至</span>
              <el-input-number
                v-model="formData.salary_range[1]"
                :min="formData.salary_range[0]"
                :max="100000"
                controls-position="right"
                placeholder="最高薪资"
              />
              <span class="unit-text">元/月</span>
            </div>
          </el-form-item>

          <!-- 必备技能 -->
          <el-form-item label="必备技能" prop="required_skills">
            <el-select
              v-model="formData.required_skills"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="请选择或输入必备技能"
              style="width: 100%"
            >
              <el-option v-for="skill in commonSkills" :key="skill" :label="skill" :value="skill" />
            </el-select>
          </el-form-item>

          <!-- 可选技能 -->
          <el-form-item label="可选技能" prop="optional_skills">
            <el-select
              v-model="formData.optional_skills"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="请选择或输入可选技能"
              style="width: 100%"
            >
              <el-option v-for="skill in commonSkills" :key="skill" :label="skill" :value="skill" />
            </el-select>
          </el-form-item>

          <!-- 学历要求 -->
          <el-form-item label="学历要求" prop="education">
            <el-select v-model="formData.education" multiple placeholder="请选择学历要求" style="width: 100%">
              <el-option label="大专" value="大专" />
              <el-option label="本科" value="本科" />
              <el-option label="硕士" value="硕士" />
              <el-option label="博士" value="博士" />
            </el-select>
          </el-form-item>

          <!-- 证书要求 -->
          <el-form-item label="证书要求" prop="certifications">
            <el-select
              v-model="formData.certifications"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="请选择或输入证书要求"
              style="width: 100%"
            >
              <el-option v-for="cert in commonCertifications" :key="cert" :label="cert" :value="cert" />
            </el-select>
          </el-form-item>

          <!-- 项目经验要求 -->
          <el-form-item label="项目经验要求">
            <div class="project-requirements">
              <div class="requirement-item">
                <span class="label">最少项目数量:</span>
                <el-input-number
                  v-model="formData.project_requirements.min_projects"
                  :min="0"
                  :max="20"
                  controls-position="right"
                />
              </div>
              <div class="requirement-item">
                <el-checkbox v-model="formData.project_requirements.team_lead_experience">
                  要求有团队管理经验
                </el-checkbox>
              </div>
            </div>
          </el-form-item>

          <!-- 分配的简历 -->
          <el-form-item label="已分配简历" v-if="formData.resumes && formData.resumes.length > 0">
            <div class="assigned-resumes">
              <div v-for="resume in formData.resumes" :key="resume.id" class="resume-tag">
                <span>{{ resume.candidate_name || '未知候选人' }}</span>
                <el-tag v-if="resume.screening_score" type="success" size="small">
                  {{ resume.screening_score.comprehensive_score }}
                </el-tag>
              </div>
            </div>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 创建岗位对话框 -->
    <el-dialog v-model="createDialogVisible" title="新建岗位" width="500px">
      <el-form :model="newPositionForm" label-width="80px">
        <el-form-item label="岗位名称" required>
          <el-input v-model="newPositionForm.position" placeholder="请输入岗位名称" />
        </el-form-item>
        <el-form-item label="岗位描述">
          <el-input v-model="newPositionForm.description" type="textarea" :rows="3" placeholder="请输入岗位描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreatePosition">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { positionApi } from '@/api'
import type { PositionData, PositionStatus } from '@/types'

// 状态
const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)
const creating = ref(false)
const positions = ref<PositionData[]>([])
const selectedPositionId = ref<string | null>(null)
const originalData = ref<PositionData | null>(null)
const createDialogVisible = ref(false)

// 新建岗位表单
const newPositionForm = reactive({
  position: '',
  description: ''
})

// 当前编辑的表单数据
const formData = reactive<PositionData>({
  position: '',
  description: '',
  required_skills: [],
  optional_skills: [],
  min_experience: 0,
  education: [],
  certifications: [],
  salary_range: [0, 0],
  project_requirements: {
    min_projects: 0,
    team_lead_experience: false
  },
  resumes: []
})

// 常用技能选项
const commonSkills = [
  'HTML', 'CSS', 'JavaScript', 'TypeScript', 'Vue.js', 'React',
  'Angular', 'Node.js', 'Python', 'Java', 'PHP', 'MySQL',
  'MongoDB', 'Docker', 'Git', 'Webpack', 'Vite', 'AI', '机器学习'
]

// 常用证书选项
const commonCertifications = [
  '软考中级', '软考高级', 'PMP', 'CET-4', 'CET-6', '托福', '雅思',
  '计算机等级考试', '前端开发工程师', '后端开发工程师'
]

// 表单验证规则
const formRules: FormRules = {
  position: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }]
}

// 计算是否有未保存的更改
const hasChanges = computed(() => {
  if (!originalData.value) return false
  return JSON.stringify(formData) !== JSON.stringify(originalData.value)
})

// 状态映射
const getStatusType = (status?: PositionStatus) => {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
    pending: 'info',
    interview_analysis: 'warning',
    interview_analysis_completed: 'warning',
    comprehensive_screening: 'warning',
    completed: 'success'
  }
  return map[status || 'pending'] || 'info'
}

const getStatusText = (status?: PositionStatus) => {
  const map: Record<string, string> = {
    pending: '待分析',
    interview_analysis: '面试分析中',
    interview_analysis_completed: '面试分析完成',
    comprehensive_screening: '综合筛选中',
    completed: '已完成'
  }
  return map[status || 'pending'] || '待分析'
}

// 加载岗位列表
const loadPositions = async () => {
  loading.value = true
  try {
    const result = await positionApi.getPositions({ include_resumes: true })
    positions.value = result.positions || []
  } catch (err) {
    console.error('加载岗位列表失败:', err)
    ElMessage.error('加载岗位列表失败')
  } finally {
    loading.value = false
  }
}

// 选择岗位
const selectPosition = async (pos: PositionData) => {
  if (hasChanges.value) {
    try {
      await ElMessageBox.confirm('当前有未保存的更改，是否放弃？', '提示', {
        confirmButtonText: '放弃',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return
    }
  }

  selectedPositionId.value = pos.id || null
  
  // 加载岗位详情
  if (pos.id) {
    try {
      const detail = await positionApi.getPosition(pos.id)
      Object.assign(formData, {
        ...detail,
        salary_range: detail.salary_range || [0, 0],
        project_requirements: detail.project_requirements || { min_projects: 0, team_lead_experience: false }
      })
      originalData.value = JSON.parse(JSON.stringify(formData))
    } catch (err) {
      console.error('加载岗位详情失败:', err)
      ElMessage.error('加载岗位详情失败')
    }
  }
}

// 显示创建对话框
const showCreateDialog = () => {
  newPositionForm.position = ''
  newPositionForm.description = ''
  createDialogVisible.value = true
}

// 创建岗位
const handleCreatePosition = async () => {
  if (!newPositionForm.position.trim()) {
    ElMessage.warning('请输入岗位名称')
    return
  }

  creating.value = true
  try {
    const newPos = await positionApi.createPosition({
      position: newPositionForm.position,
      description: newPositionForm.description,
      required_skills: [],
      optional_skills: [],
      min_experience: 0,
      education: [],
      certifications: []
    })
    
    ElMessage.success('岗位创建成功')
    createDialogVisible.value = false
    await loadPositions()
    
    // 自动选中新创建的岗位
    if (newPos.id) {
      selectPosition(newPos)
    }
  } catch (err: any) {
    console.error('创建岗位失败:', err)
    ElMessage.error(err.message || '创建岗位失败')
  } finally {
    creating.value = false
  }
}

// 删除岗位
const handleDeletePosition = async (pos: PositionData) => {
  if (!pos.id) return

  try {
    await ElMessageBox.confirm(`确定要删除岗位"${pos.position}"吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'danger'
    })

    await positionApi.deletePosition(pos.id)
    ElMessage.success('岗位已删除')
    
    // 如果删除的是当前选中的岗位，清空选择
    if (selectedPositionId.value === pos.id) {
      selectedPositionId.value = null
      originalData.value = null
    }
    
    await loadPositions()
  } catch (err: any) {
    if (err !== 'cancel') {
      console.error('删除岗位失败:', err)
      ElMessage.error('删除岗位失败')
    }
  }
}

// 保存岗位
const handleSave = async () => {
  if (!selectedPositionId.value || !hasChanges.value) return

  saving.value = true
  try {
    if (formRef.value) {
      const valid = await formRef.value.validate()
      if (!valid) return
    }

    await positionApi.updatePosition(selectedPositionId.value, formData)
    originalData.value = JSON.parse(JSON.stringify(formData))
    ElMessage.success('保存成功')
    
    // 更新列表中的数据
    await loadPositions()
  } catch (err) {
    console.error('保存失败:', err)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadPositions()
})
</script>

<style scoped lang="scss">
.positions-view {
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
  align-items: center;
  gap: 12px;
}

.positions-list-card,
.form-card {
  :deep(.el-card__header) {
    padding: 16px 20px;
    background-color: #fafafa;
    border-bottom: 1px solid #e4e7ed;
  }
}

.loading-container {
  padding: 20px;
}

.empty-positions,
.no-selection {
  padding: 40px 20px;
  text-align: center;
}

// 岗位列表样式
.positions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.position-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f0f2f5;
  }

  &.active {
    background: #ecf5ff;
    border-color: #409eff;
  }

  .position-info {
    flex: 1;

    .position-name {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 6px;
    }

    .position-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #909399;
    }
  }
}

// 表单样式
.unit-text {
  margin-left: 12px;
  color: #909399;
  font-size: 14px;
}

.salary-range {
  display: flex;
  align-items: center;
  gap: 8px;

  .range-separator {
    color: #909399;
  }
}

.project-requirements {
  .requirement-item {
    margin-bottom: 16px;

    .label {
      display: inline-block;
      width: 100px;
      color: #606266;
      font-size: 14px;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }
}

// 分配的简历
.assigned-resumes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .resume-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #f4f4f5;
    border-radius: 4px;
    font-size: 13px;
  }
}

@media (max-width: 1000px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
