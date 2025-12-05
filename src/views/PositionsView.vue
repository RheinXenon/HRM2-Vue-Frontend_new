<template>
  <div class="positions-view">
    <!-- 页面标题和操作区域 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">招聘岗位设置</h1>
        <p class="page-desc">配置招聘岗位的基本要求和筛选标准</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" :loading="saving" :disabled="!hasChanges" @click="handleSave">
          {{ saving ? '保存中...' : '保存设置' }}
        </el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button @click="handleRefresh">刷新数据</el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <el-alert :title="error" type="error" show-icon @close="error = ''" />
      <el-button type="primary" @click="loadPositionData" class="retry-btn">
        重新加载
      </el-button>
    </div>

    <!-- 主内容区域 -->
    <div v-else class="content-grid">
      <!-- 左侧：表单区域 -->
      <el-card class="form-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">岗位基本信息</span>
            <el-tag :type="hasChanges ? 'warning' : 'success'">
              {{ hasChanges ? '未保存' : '已保存' }}
            </el-tag>
          </div>
        </template>

        <el-form
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
              <el-option
                v-for="skill in commonSkills"
                :key="skill"
                :label="skill"
                :value="skill"
              />
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
              <el-option
                v-for="skill in commonSkills"
                :key="skill"
                :label="skill"
                :value="skill"
              />
            </el-select>
          </el-form-item>

          <!-- 学历要求 -->
          <el-form-item label="学历要求" prop="education">
            <el-select
              v-model="formData.education"
              multiple
              placeholder="请选择学历要求"
              style="width: 100%"
            >
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
              <el-option
                v-for="cert in commonCertifications"
                :key="cert"
                :label="cert"
                :value="cert"
              />
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
        </el-form>
      </el-card>

      <!-- 右侧：数据预览 -->
      <el-card class="preview-card" shadow="hover">
        <template #header>
          <span class="card-title">数据预览 (JSON格式)</span>
        </template>
        <pre class="json-preview">{{ JSON.stringify(formData, null, 2) }}</pre>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { positionApi } from '@/api'
import type { PositionData } from '@/types'

// 表单引用和状态
const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const originalData = ref<PositionData | null>(null)

// 表单数据
const formData = reactive<PositionData>({
  position: '',
  required_skills: [],
  optional_skills: [],
  min_experience: 0,
  education: [],
  certifications: [],
  salary_range: [0, 0],
  project_requirements: {
    min_projects: 0,
    team_lead_experience: false
  }
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
  position: [
    { required: true, message: '请输入岗位名称', trigger: 'blur' }
  ],
  required_skills: [
    { type: 'array', required: true, message: '请至少选择一项必备技能', trigger: 'change' }
  ]
}

// 计算是否有未保存的更改
const hasChanges = computed(() => {
  if (!originalData.value) return false
  return JSON.stringify(formData) !== JSON.stringify(originalData.value)
})

// 默认数据
const defaultData: PositionData = {
  position: '前端开发工程师',
  required_skills: ['HTML', 'JavaScript', 'CSS'],
  optional_skills: ['Vue3', 'React', 'Vue.js', 'AI'],
  min_experience: 2,
  education: ['本科', '硕士', '大专'],
  certifications: [],
  salary_range: [8000, 20000],
  project_requirements: {
    min_projects: 2,
    team_lead_experience: true
  }
}

// 加载数据
const loadPositionData = async () => {
  loading.value = true
  error.value = ''

  try {
    const data = await positionApi.getCriteria()
    
    originalData.value = JSON.parse(JSON.stringify(data))
    Object.assign(formData, data)
    
    ElMessage.success({ message: '数据加载成功', duration: 1500 })
  } catch (err) {
    console.error('数据加载失败:', err)
    
    // 使用默认数据
    originalData.value = JSON.parse(JSON.stringify(defaultData))
    Object.assign(formData, defaultData)
    
    ElMessage.warning({ message: '使用默认数据', duration: 1500 })
  } finally {
    loading.value = false
  }
}

// 保存数据
const savePositionData = async () => {
  saving.value = true

  try {
    if (!formRef.value) return
    const valid = await formRef.value.validate()
    if (!valid) return

    await positionApi.saveCriteria(formData)
    
    originalData.value = JSON.parse(JSON.stringify(formData))
    ElMessage.success('数据保存成功')
  } catch (err) {
    console.error('数据保存失败:', err)
    ElMessage.error('数据保存失败')
  } finally {
    saving.value = false
  }
}

// 处理保存
const handleSave = async () => {
  if (!hasChanges.value) {
    ElMessage.warning('没有检测到更改')
    return
  }

  try {
    await ElMessageBox.confirm('确定要保存当前的岗位设置吗？', '确认保存', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await savePositionData()
  } catch {
    // 用户取消
  }
}

// 处理重置
const handleReset = () => {
  if (!originalData.value) return

  ElMessageBox.confirm('确定要重置所有更改吗？未保存的更改将会丢失。', '确认重置', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    Object.assign(formData, originalData.value)
    ElMessage.success('重置成功')
  }).catch(() => {})
}

// 处理刷新
const handleRefresh = () => {
  if (hasChanges.value) {
    ElMessageBox.confirm('当前有未保存的更改，刷新将丢失这些更改。是否继续？', '确认刷新', {
      confirmButtonText: '继续',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      loadPositionData()
    }).catch(() => {})
  } else {
    loadPositionData()
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadPositionData()
})
</script>

<style scoped lang="scss">
.positions-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
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

.header-actions {
  display: flex;
  gap: 12px;
}

.loading-container,
.error-container {
  padding: 40px;
  text-align: center;
}

.retry-btn {
  margin-top: 20px;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 400px;
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

.form-card,
.preview-card {
  :deep(.el-card__header) {
    padding: 16px 20px;
    background-color: #fafafa;
    border-bottom: 1px solid #e4e7ed;
  }
}

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

.json-preview {
  background-color: #f6f8fa;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #303133;
  max-height: 500px;
  overflow: auto;
  white-space: pre-wrap;
  margin: 0;
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
