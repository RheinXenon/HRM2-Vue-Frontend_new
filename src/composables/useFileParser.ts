/**
 * 文件解析 composable
 * 处理简历文件的读取和解析（PDF、Word、TXT）
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { ResumeFile } from '@/types'

export function useFileParser() {
  const selectedFiles = ref<ResumeFile[]>([])
  const isDragOver = ref(false)

  // 计算属性
  const hasParsedFiles = computed(() => selectedFiles.value.some(f => f.status === 'parsed'))
  const parsedFilesCount = computed(() => selectedFiles.value.filter(f => f.status === 'parsed').length)

  // 读取文件为 ArrayBuffer
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsArrayBuffer(file)
    })
  }

  // 读取文件为文本
  const readFileAsText = async (file: File): Promise<string> => {
    const name = file.name.toLowerCase()
    const ext = name.split('.').pop() || ''

    // TXT 文件直接读取
    if (file.type.includes('text') || ext === 'txt') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string || '')
        reader.onerror = () => reject(new Error('文件读取失败'))
        reader.readAsText(file)
      })
    }

    // Word 文件 (.docx) 使用 mammoth 解析
    // 注意：mammoth 只支持 .docx 格式，不支持旧版 .doc
    if (ext === 'docx') {
      try {
        const mammothModule = await import('mammoth')
        // 处理 ESM 和 CJS 模块兼容
        const mammoth = mammothModule.default || mammothModule
        const arrayBuffer = await readFileAsArrayBuffer(file)
        const result = await mammoth.extractRawText({ arrayBuffer })
        return result.value || `[${file.name} 的内容解析为空]`
      } catch (err) {
        console.error('mammoth 解析失败:', err)
        return `[${file.name} - Word 解析失败: ${err}]`
      }
    }

    // 旧版 .doc 文件不支持
    if (ext === 'doc') {
      return `[${file.name} - 旧版 .doc 格式不支持，请转换为 .docx 格式]`
    }

    // PDF 文件使用 pdfjs-dist 解析
    if (ext === 'pdf') {
      try {
        const arrayBuffer = await readFileAsArrayBuffer(file)
        // 动态导入 pdfjs-dist
        const pdfjsLib = await import('pdfjs-dist')
        
        // 使用 Vite 的 ?url 导入本地 worker
        const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
        const pdf = await loadingTask.promise

        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          const strings = content.items.map((item: any) => item.str).join(' ')
          fullText += strings + '\n'
        }

        return fullText.trim() || `[${file.name} 的内容解析为空]`
      } catch (err) {
        console.error('pdf.js 解析失败:', err)
        return `[${file.name} - PDF 解析失败: ${err}]`
      }
    }

    // 其他格式
    return `[${file.name} - 不支持的文件格式]`
  }

  // 解析单个文件内容
  const parseFileContent = async (resumeFile: ResumeFile) => {
    const target = selectedFiles.value.find(f => f.id === resumeFile.id)
    if (!target) return

    target.status = 'parsing'
    try {
      const content = await readFileAsText(resumeFile.file)
      target.content = content.replace(/\s+/g, ' ').trim()
      target.status = 'parsed'
    } catch {
      target.status = 'error'
      target.error = '解析失败'
    }
  }

  // 处理文件列表
  const processFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const isValidType = /\.(pdf|doc|docx|txt)$/i.test(file.name)
      const isValidSize = file.size <= 10 * 1024 * 1024
      if (!isValidType) ElMessage.error(`"${file.name}" 格式不支持`)
      if (!isValidSize) ElMessage.error(`"${file.name}" 超过10MB`)
      return isValidType && isValidSize
    })

    for (const file of validFiles) {
      const resumeFile: ResumeFile = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        content: '',
        status: 'pending'
      }
      selectedFiles.value.push(resumeFile)
      parseFileContent(resumeFile)
    }

    if (validFiles.length > 0) {
      ElMessage.success(`成功添加 ${validFiles.length} 个文件`)
    }

    return validFiles.length
  }

  // 移除文件
  const removeFile = (index: number) => {
    selectedFiles.value.splice(index, 1)
  }

  // 清空所有文件
  const clearAll = () => {
    selectedFiles.value = []
  }

  // 拖拽处理
  const handleDragover = (e: DragEvent) => {
    e.preventDefault()
    isDragOver.value = true
  }

  const handleDragleave = (e: DragEvent) => {
    e.preventDefault()
    isDragOver.value = false
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    isDragOver.value = false
    if (e.dataTransfer?.files) {
      processFiles(Array.from(e.dataTransfer.files))
    }
  }

  return {
    // 状态
    selectedFiles,
    isDragOver,
    // 计算属性
    hasParsedFiles,
    parsedFilesCount,
    // 方法
    processFiles,
    removeFile,
    clearAll,
    handleDragover,
    handleDragleave,
    handleDrop
  }
}
