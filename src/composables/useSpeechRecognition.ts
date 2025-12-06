/**
 * 语音识别 Composable
 * 使用 Web Speech API 实现实时语音转文字
 */
import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

// 定义 SpeechRecognition 类型（浏览器兼容）
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onaudiostart: ((this: ISpeechRecognition, ev: Event) => void) | null
  onaudioend: ((this: ISpeechRecognition, ev: Event) => void) | null
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onspeechstart: ((this: ISpeechRecognition, ev: Event) => void) | null
  onspeechend: ((this: ISpeechRecognition, ev: Event) => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition
    webkitSpeechRecognition: new () => ISpeechRecognition
  }
}

export interface SpeechRecognitionOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}) {
  const {
    lang = 'zh-CN',
    continuous = true,
    interimResults = true,
    onResult,
    onError,
    onStart,
    onEnd
  } = options

  // 状态
  const isSupported = ref(false)
  const isListening = ref(false)
  const transcript = ref('')           // 当前识别的完整文本
  const interimTranscript = ref('')    // 临时识别结果（正在说的话）
  const finalTranscript = ref('')      // 最终确认的文本
  const error = ref<string | null>(null)

  // 识别器实例
  let recognition: ISpeechRecognition | null = null

  // 检查浏览器支持
  const checkSupport = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    isSupported.value = !!SpeechRecognitionAPI
    return isSupported.value
  }

  // 初始化识别器
  const initRecognition = () => {
    if (!checkSupport()) {
      error.value = '您的浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器'
      ElMessage.error(error.value)
      return false
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition = new SpeechRecognitionAPI()

    // 配置
    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.maxAlternatives = 1

    // 事件处理
    recognition.onstart = () => {
      isListening.value = true
      error.value = null
      onStart?.()
    }

    recognition.onend = () => {
      isListening.value = false
      // 如果是意外结束且用户没有主动停止，尝试重启
      // 这里我们不自动重启，让用户控制
      onEnd?.()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result) {
          const transcriptText = result[0]?.transcript || ''
          if (result.isFinal) {
            final += transcriptText
          } else {
            interim += transcriptText
          }
        }
      }

      // 更新临时结果
      interimTranscript.value = interim

      // 如果有最终结果，追加到 finalTranscript
      if (final) {
        finalTranscript.value += final
      }

      // 组合完整文本
      transcript.value = finalTranscript.value + interimTranscript.value

      // 回调
      if (final) {
        onResult?.(final, true)
      } else if (interim) {
        onResult?.(interim, false)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = ''
      switch (event.error) {
        case 'no-speech':
          errorMessage = '未检测到语音，请对着麦克风说话'
          break
        case 'audio-capture':
          errorMessage = '未找到麦克风，请确保麦克风已连接'
          break
        case 'not-allowed':
          errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风'
          break
        case 'network':
          errorMessage = '网络错误，语音识别需要网络连接'
          break
        case 'aborted':
          // 用户主动停止，不显示错误
          return
        default:
          errorMessage = `语音识别错误: ${event.error}`
      }
      error.value = errorMessage
      isListening.value = false
      onError?.(errorMessage)
      
      if (event.error !== 'no-speech') {
        ElMessage.warning(errorMessage)
      }
    }

    recognition.onspeechstart = () => {
      // 用户开始说话
    }

    recognition.onspeechend = () => {
      // 用户停止说话
    }

    return true
  }

  // 开始识别
  const start = async () => {
    // 首先请求麦克风权限
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      error.value = '无法访问麦克风，请确保已授予权限'
      ElMessage.error(error.value)
      onError?.(error.value)
      return false
    }

    if (!recognition) {
      if (!initRecognition()) {
        return false
      }
    }

    try {
      // 重置临时结果
      interimTranscript.value = ''
      recognition?.start()
      return true
    } catch (err) {
      // 可能是已经在运行
      console.error('Start recognition error:', err)
      return false
    }
  }

  // 停止识别
  const stop = () => {
    if (recognition && isListening.value) {
      recognition.stop()
    }
  }

  // 重置
  const reset = () => {
    stop()
    transcript.value = ''
    interimTranscript.value = ''
    finalTranscript.value = ''
    error.value = null
  }

  // 清理
  const cleanup = () => {
    stop()
    if (recognition) {
      recognition.onstart = null
      recognition.onend = null
      recognition.onresult = null
      recognition.onerror = null
      recognition = null
    }
  }

  // 组件卸载时清理
  onUnmounted(() => {
    cleanup()
  })

  // 初始化检查支持
  checkSupport()

  return {
    // 状态
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    error,
    
    // 方法
    start,
    stop,
    reset,
    cleanup
  }
}
