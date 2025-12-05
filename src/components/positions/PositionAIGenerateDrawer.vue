<template>
  <el-drawer
    v-model="visible"
    title="AI 智能生成岗位要求"
    direction="rtl"
    size="520px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="ai-generate-content">
      <!-- 使用说明 -->
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="usage-tip"
      >
        <template #title>
          <span>输入岗位描述，AI将自动生成完整的招聘要求。支持上传参考文档以获得更精准的结果。</span>
        </template>
      </el-alert>

      <!-- 岗位描述输入 -->
      <div class="input-section">
        <div class="section-title">
          <span class="required">*</span>
          岗位描述
        </div>
        <el-input
          v-model="description"
          type="textarea"
          :rows="6"
          placeholder="请输入岗位描述，可以是简短的一句话，也可以是详细的需求说明。&#10;&#10;例如：&#10;- 需要一名3年以上经验的前端开发工程师&#10;- 招聘Python后端开发，要求熟悉Django框架，有分布式系统经验优先"
          maxlength="2000"
          show-word-limit
          :disabled="generating"
        />
      </div>

      <!-- 文档上传 -->
      <div class="input-section">
        <div class="section-title">
          参考文档
          <span class="optional-text">(可选)</span>
        </div>
        <el-upload
          ref="uploadRef"
          v-model:file-list="fileList"
          class="document-upload"
          drag
          multiple
          :auto-upload="false"
          :accept="acceptFileTypes"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :disabled="generating"
        >
          <div class="upload-content">
            <el-icon class="upload-icon"><Upload /></el-icon>
            <div class="upload-text">
              <span>拖拽文件到此处，或</span>
              <em>点击上传</em>
            </div>
            <div class="upload-hint">
              支持 PDF、Word、TXT 等文档格式
            </div>
          </div>
        </el-upload>
      </div>

      <!-- 已解析的文档预览 -->
      <div v-if="parsedDocuments.length > 0" class="parsed-documents">
        <div class="section-title">已解析文档</div>
        <div class="document-list">
          <div
            v-for="(doc, index) in parsedDocuments"
            :key="index"
            class="document-item"
          >
            <el-icon class="doc-icon"><Document /></el-icon>
            <span class="doc-name">{{ doc.name }}</span>
            <el-tag size="small" type="success">
              {{ formatFileSize(doc.content.length) }}
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 生成按钮 -->
      <div class="action-section">
        <el-button
          type="primary"
          size="large"
          :loading="generating"
          :disabled="!description.trim()"
          @click="handleGenerate"
          class="generate-btn"
        >
          <el-icon v-if="!generating"><MagicStick /></el-icon>
          {{ generating ? '正在生成...' : 'AI 生成岗位要求' }}
        </el-button>
      </div>

      <!-- 生成结果预览 -->
      <div v-if="generatedResult" class="result-section">
        <div class="section-title">
          <el-icon><SuccessFilled /></el-icon>
          生成结果预览
        </div>
        <div class="result-preview">
          <div class="result-item">
            <span class="label">岗位名称：</span>
            <span class="value">{{ generatedResult.position }}</span>
          </div>
          <div v-if="generatedResult.description" class="result-item">
            <span class="label">岗位描述：</span>
            <span class="value">{{ generatedResult.description }}</span>
          </div>
          <div class="result-item">
            <span class="label">工作经验：</span>
            <span class="value">{{ generatedResult.min_experience }} 年以上</span>
          </div>
          <div class="result-item">
            <span class="label">学历要求：</span>
            <span class="value">{{ generatedResult.education?.join('、') || '不限' }}</span>
          </div>
          <div class="result-item">
            <span class="label">必备技能：</span>
            <div class="skill-tags">
              <el-tag
                v-for="skill in generatedResult.required_skills"
                :key="skill"
                size="small"
                type="danger"
              >
                {{ skill }}
              </el-tag>
            </div>
          </div>
          <div v-if="generatedResult.optional_skills?.length" class="result-item">
            <span class="label">可选技能：</span>
            <div class="skill-tags">
              <el-tag
                v-for="skill in generatedResult.optional_skills"
                :key="skill"
                size="small"
                type="info"
              >
                {{ skill }}
              </el-tag>
            </div>
          </div>
          <div v-if="generatedResult.salary_range" class="result-item">
            <span class="label">薪资范围：</span>
            <span class="value">
              {{ generatedResult.salary_range[0] }} - {{ generatedResult.salary_range[1] }} 元/月
            </span>
          </div>
        </div>
        <div class="result-actions">
          <el-button type="primary" @click="handleApply">
            应用到表单
          </el-button>
          <el-button @click="handleRegenerate">
            重新生成
          </el-button>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Document, MagicStick, SuccessFilled } from '@element-plus/icons-vue'
import type { UploadFile, UploadInstance } from 'element-plus'
import { positionApi } from '@/api'
import type { PositionData } from '@/types'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'apply': [data: PositionData]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const uploadRef = ref<UploadInstance>()
const description = ref('')
const fileList = ref<UploadFile[]>([])
const parsedDocuments = ref<Array<{ name: string; content: string }>>([])
const generating = ref(false)
const generatedResult = ref<PositionData | null>(null)

const acceptFileTypes = '.pdf,.doc,.docx,.txt,.md'

// 处理文件变更
const handleFileChange = async (uploadFile: UploadFile) => {
  if (!uploadFile.raw) return
  
  try {
    const content = await readFileContent(uploadFile.raw)
    parsedDocuments.value.push({
      name: uploadFile.name,
      content
    })
  } catch (err) {
    ElMessage.error(`文件 ${uploadFile.name} 读取失败`)
    // 移除失败的文件
    const index = fileList.value.findIndex(f => f.uid === uploadFile.uid)
    if (index > -1) {
      fileList.value.splice(index, 1)
    }
  }
}

// 处理文件移除
const handleFileRemove = (uploadFile: UploadFile) => {
  const index = parsedDocuments.value.findIndex(d => d.name === uploadFile.name)
  if (index > -1) {
    parsedDocuments.value.splice(index, 1)
  }
}

// 读取文件内容
const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      resolve(content)
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

// 格式化文件大小
const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} 字符`
  return `${(size / 1024).toFixed(1)} KB`
}

// 生成岗位要求
const handleGenerate = async () => {
  if (!description.value.trim()) {
    ElMessage.warning('请输入岗位描述')
    return
  }
  
  generating.value = true
  generatedResult.value = null
  
  try {
    const result = await positionApi.aiGenerate({
      description: description.value,
      documents: parsedDocuments.value.length > 0 ? parsedDocuments.value : undefined
    })
    
    generatedResult.value = result
    ElMessage.success('生成成功')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'AI生成失败，请重试'
    ElMessage.error(errorMessage)
  } finally {
    generating.value = false
  }
}

// 重新生成
const handleRegenerate = () => {
  generatedResult.value = null
  handleGenerate()
}

// 应用到表单
const handleApply = () => {
  if (generatedResult.value) {
    emit('apply', generatedResult.value)
    visible.value = false
    ElMessage.success('已应用到表单')
  }
}

// 关闭抽屉
const handleClose = () => {
  // 保留数据不重置，方便用户再次打开继续操作
}

// 重置状态（供外部调用）
const reset = () => {
  description.value = ''
  fileList.value = []
  parsedDocuments.value = []
  generatedResult.value = null
  generating.value = false
}

defineExpose({ reset })
</script>

<style scoped lang="scss">
.ai-generate-content {
  padding: 0 4px;
}

.usage-tip {
  margin-bottom: 20px;
  
  :deep(.el-alert__content) {
    font-size: 13px;
    line-height: 1.5;
  }
}

.input-section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  
  .required {
    color: #f56c6c;
  }
  
  .optional-text {
    font-size: 12px;
    font-weight: normal;
    color: #909399;
  }
  
  .el-icon {
    color: #67c23a;
    margin-right: 4px;
  }
}

.document-upload {
  :deep(.el-upload-dragger) {
    padding: 20px;
    border-radius: 8px;
  }
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 36px;
  color: #c0c4cc;
}

.upload-text {
  font-size: 14px;
  color: #606266;
  
  em {
    color: #409eff;
    font-style: normal;
  }
}

.upload-hint {
  font-size: 12px;
  color: #909399;
}

.parsed-documents {
  margin-bottom: 20px;
}

.document-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  
  .doc-icon {
    color: #409eff;
    font-size: 18px;
  }
  
  .doc-name {
    flex: 1;
    font-size: 13px;
    color: #303133;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.action-section {
  margin: 24px 0;
}

.generate-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
}

.result-section {
  padding: 16px;
  background: linear-gradient(135deg, #f0f9eb 0%, #e1f3d8 100%);
  border-radius: 8px;
  border: 1px solid #e1f3d8;
}

.result-preview {
  margin: 12px 0 16px;
}

.result-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 10px;
  font-size: 13px;
  
  .label {
    flex-shrink: 0;
    width: 80px;
    color: #606266;
  }
  
  .value {
    flex: 1;
    color: #303133;
  }
  
  &:last-child {
    margin-bottom: 0;
  }
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.result-actions {
  display: flex;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #c6e6b3;
}
</style>
