<template>
  <el-card class="form-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="card-title">
          {{ selectedPositionId ? '编辑岗位' : '选择岗位' }}
        </span>
        <div v-if="selectedPositionId" class="header-actions">
          <!-- AI 工具按钮组 -->
          <div class="tool-buttons">
            <el-tooltip content="AI 智能生成岗位要求" placement="top">
              <el-button size="small" @click="showAIDrawer = true">
                <el-icon><MagicStick /></el-icon>
                AI 生成
              </el-button>
            </el-tooltip>
            <el-tooltip content="查看当前表单的 JSON 数据" placement="top">
              <el-button size="small" @click="showJsonDialog = true">
                <el-icon><Document /></el-icon>
                显示 JSON
              </el-button>
            </el-tooltip>
          </div>
          <el-divider direction="vertical" />
          <el-tag :type="hasChanges ? 'warning' : 'success'">
            {{ hasChanges ? '未保存' : '已保存' }}
          </el-tag>
          <el-button type="primary" size="small" :loading="saving" :disabled="!hasChanges" @click="$emit('save')">
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
            v-model="salaryMin"
            :min="0"
            :max="salaryMax"
            controls-position="right"
            placeholder="最低薪资"
          />
          <span class="range-separator">至</span>
          <el-input-number
            v-model="salaryMax"
            :min="salaryMin"
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
              v-model="projectMinProjects"
              :min="0"
              :max="20"
              controls-position="right"
            />
          </div>
          <div class="requirement-item">
            <el-checkbox v-model="projectTeamLead">
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

    <!-- AI 生成抽屉 -->
    <PositionAIGenerateDrawer
      v-model="showAIDrawer"
      @apply="handleAIApply"
    />

    <!-- JSON 显示对话框 -->
    <PositionJsonDialog
      v-model="showJsonDialog"
      :form-data="formData"
    />
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { MagicStick, Document } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { PositionData } from '@/types'
import PositionAIGenerateDrawer from './PositionAIGenerateDrawer.vue'
import PositionJsonDialog from './PositionJsonDialog.vue'

const props = defineProps<{
  formData: PositionData
  selectedPositionId: string | null
  hasChanges: boolean
  saving: boolean
}>()

defineEmits<{
  save: []
}>()

const formRef = ref<FormInstance>()
const showAIDrawer = ref(false)
const showJsonDialog = ref(false)

// 处理AI生成结果应用
const handleAIApply = (data: PositionData) => {
  // 将AI生成的数据应用到表单
  Object.assign(props.formData, {
    position: data.position || props.formData.position,
    description: data.description || '',
    required_skills: data.required_skills || [],
    optional_skills: data.optional_skills || [],
    min_experience: data.min_experience ?? 0,
    education: data.education || [],
    certifications: data.certifications || [],
    salary_range: data.salary_range || [0, 0],
    project_requirements: data.project_requirements || {
      min_projects: 0,
      team_lead_experience: false
    }
  })
}

// 表单验证规则
const formRules: FormRules = {
  position: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }]
}

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

// 薪资范围（用计算属性避免 undefined）
const salaryMin = computed({
  get: () => props.formData.salary_range?.[0] ?? 0,
  set: (val) => {
    if (props.formData.salary_range) {
      props.formData.salary_range[0] = val
    }
  }
})

const salaryMax = computed({
  get: () => props.formData.salary_range?.[1] ?? 0,
  set: (val) => {
    if (props.formData.salary_range) {
      props.formData.salary_range[1] = val
    }
  }
})

// 项目经验要求（用计算属性避免 undefined）
const projectMinProjects = computed({
  get: () => props.formData.project_requirements?.min_projects ?? 0,
  set: (val) => {
    if (props.formData.project_requirements) {
      props.formData.project_requirements.min_projects = val
    }
  }
})

const projectTeamLead = computed({
  get: () => props.formData.project_requirements?.team_lead_experience ?? false,
  set: (val) => {
    if (props.formData.project_requirements) {
      props.formData.project_requirements.team_lead_experience = val
    }
  }
})

// 暴露表单验证方法
const validate = async () => {
  if (!formRef.value) return true
  return formRef.value.validate()
}

defineExpose({ validate })
</script>

<style scoped lang="scss">
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
  
  .tool-buttons {
    display: flex;
    gap: 8px;
  }
  
  .el-divider--vertical {
    height: 20px;
    margin: 0 4px;
  }
}

.form-card {
  :deep(.el-card__header) {
    padding: 16px 20px;
    background-color: #fafafa;
    border-bottom: 1px solid #e4e7ed;
  }
}

.no-selection {
  padding: 40px 20px;
  text-align: center;
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
</style>
