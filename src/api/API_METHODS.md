# API 方法说明

本文件列出并说明 `src/api/index.ts` 中导出的各个 API 对象与方法，包含它们使用的后端路径、HTTP 方法、主要参数、返回值和副作用（如是否会改变简历的筛选/分配状态）。

> 说明中的路径基于 `API_BASE`（由环境变量 `VITE_API_BASE` 提供），所有请求会以 `API_BASE` 作为前缀。

---

## 全局

- **`API_BASE`**: 请求的基础 URL，取自 `import.meta.env.VITE_API_BASE`。
- **`apiClient`**: 使用 `axios.create` 创建的 axios 实例（`baseURL` = `API_BASE`、默认 `Content-Type: application/json`、30s 超时）。前端代码也有直接使用 `fetch` 的实现；`apiClient` 可用于需要 axios 功能（拦截器、上传进度等）的场景。

---

## `positionApi` （岗位设置，后端路径: `/position-settings/`）

- `getCriteria()`
  - 方法: GET
  - 路径: `/position-settings/`
  - 参数: 无
  - 返回: `PositionData`（默认岗位设置）
  - 说明: 获取系统级或默认的岗位设置；向后兼容接口。

- `saveCriteria(data: PositionData)`
  - 方法: POST
  - 路径: `/position-settings/`
  - 参数: 岗位设置对象
  - 返回: void
  - 说明: 保存或更新默认岗位设置（向后兼容）。

- `getPositions(params?: { include_resumes?: boolean })`
  - 方法: GET
  - 路径: `/position-settings/positions/` （可通过查询 `?include_resumes=true` 包含岗位下的简历）
  - 参数: `include_resumes`（可选）
  - 返回: `{ positions: PositionData[], total: number }`
  - 说明: 获取岗位列表；`include_resumes` 会让后端一起返回岗位关联的简历数据（可能用于岗位详情面板）。

- `createPosition(data: Partial<PositionData>)`
  - 方法: POST
  - 路径: `/position-settings/positions/`
  - 参数: 岗位数据（部分字段）
  - 返回: `PositionData`（新建岗位）

- `getPosition(positionId: string, includeResumes = true)`
  - 方法: GET
  - 路径: `/position-settings/positions/{positionId}/?include_resumes={true|false}`
  - 参数: `positionId`, `includeResumes`
  - 返回: `PositionData`

- `updatePosition(positionId: string, data: Partial<PositionData>)`
  - 方法: PUT
  - 路径: `/position-settings/positions/{positionId}/`
  - 参数: 岗位更新字段
  - 返回: `PositionData`

- `deletePosition(positionId: string)`
  - 方法: DELETE
  - 路径: `/position-settings/positions/{positionId}/`
  - 返回: void

- `assignResumes(positionId: string, resumeDataIds: string[])`
  - 方法: POST
  - 路径: `/position-settings/positions/{positionId}/assign-resumes/`
  - 参数: body `{ resume_data_ids: string[] }`
  - 返回: `{ assigned_count: number, total_resumes: number }`
  - 说明: 将一组简历分配到指定岗位。执行后后端通常会把对应 `resume` 标记为已分配（即 `is_assigned = true`），前端需刷新简历数据以看到状态更新。

- `removeResume(positionId: string, resumeId: string)`
  - 方法: DELETE
  - 路径: `/position-settings/positions/{positionId}/remove-resume/{resumeId}/`
  - 返回: void
  - 说明: 从岗位中移除某条简历，后端一般会更新该简历的分配状态（`is_assigned`）。

- `aiGenerate(data: { description: string, documents?: Array<{ name: string; content: string }> })`
  - 方法: POST
  - 路径: `/position-settings/ai/generate/`
  - 参数: 岗位描述与可选文档数组
  - 返回: `PositionData`（AI 生成的岗位要求）
  - 说明: 基于描述调用后端 AI 生成功能，返回适配后的岗位字段。

---

## `screeningApi`（简历筛选，后端路径: `/resume-screening/`）

- `submitScreening(data: { position: Record<string, unknown>, resumes: Array<{ name, content, metadata? }> })`
  - 方法: POST
  - 路径: `/resume-screening/screening/`
  - 参数: 筛选任务数据（岗位 + 多份简历）
  - 返回: `ResumeScreeningTask`（任务信息）
  - 说明: 提交一项批量筛选任务。任务完成后，后端通常会把参与筛选的简历标记为已筛选（`is_screened = true`），并生成评分/报告等结果。

- `getTaskStatus(taskId: string)`
  - 方法: GET
  - 路径: `/resume-screening/tasks/{taskId}/status/`
  - 返回: `ResumeScreeningTask`（任务当前状态）

- `getTaskHistory(params?: { status?: string, page?: number, page_size?: number })`
  - 方法: GET
  - 路径: `/resume-screening/tasks-history/`（支持 `status`, `page`, `page_size` 查询）
  - 返回: `{ tasks: ResumeScreeningTask[], total: number }`
  - 说明: 用于获取历史任务列表（可用于“任务历史”页）。

- `deleteTask(taskId: string)`
  - 方法: DELETE
  - 路径: `/resume-screening/tasks/{taskId}/`
  - 返回: void

- `getResumeDataStats()`
  - 方法: GET
  - 路径: `/resume-screening/resume-data/?page=1&page_size=1`
  - 返回: `{ total: number }`
  - 说明: 通过请求第一页获取总量统计（后端返回 `total` 字段）。

- `getResumeDetail(resumeId: string)`
  - 方法: GET
  - 路径: `/resume-screening/reports/{resumeId}/detail/`
  - 返回: `ResumeData | null`
  - 说明: 获取单条简历的完整详情（含评分报告），失败时返回 `null`。返回字段会进行映射：`scores` → `screening_score`，`summary` → `screening_summary`。

- `getGroups(params?: { include_resumes?: boolean })`
  - 方法: GET
  - 路径: `/resume-screening/groups/`（可通过 `?include_resumes=true` 包含组内简历）
  - 返回: `ResumeGroup[]`

- `getAvailableResumes()`
  - 方法: GET
  - 路径: `/resume-screening/tasks-history/?status=completed&page_size=100`
  - 返回: `ResumeData[]`
  - 说明: 从已完成的任务中提取可用于创建简历组的简历数据列表。

- `getGroupDetail(groupId: string)`
  - 方法: GET
  - 路径: `/resume-screening/groups/{groupId}/?include_resumes=true`
  - 返回: `ResumeGroup`

- `createGroup(data: { group_name: string, resume_data_ids: string[], description?: string })`
  - 方法: POST
  - 路径: `/resume-screening/groups/create/`
  - 返回: 新建的分组信息（或包含 `group_id` 等字段的对象）

- `addResumeToGroup(data: { group_id: string, resume_data_id: string })`
  - 方法: POST
  - 路径: `/resume-screening/groups/add-resume/`
  - 返回: void

- `downloadReport(reportId: string)`
  - 方法: GET
  - 路径: `/resume-screening/reports/{reportId}/download/`
  - 返回: `Blob`（文件二进制）

- `downloadReportWithFilename(reportId: string)`
  - 方法: GET
  - 路径: `/resume-screening/reports/{reportId}/download/`
  - 返回: `{ blob: Blob; filename: string }`
  - 说明: 除了文件内容外，会尝试从响应头 `Content-Disposition` 中解析文件名；若无法解析则使用默认命名。

- `getResumeData()`
  - 方法: GET
  - 路径: `/resume-screening/data/`
  - 返回: `ResumeData[]`

---

## `videoApi`（视频分析，后端路径: `/video-analysis/`）

- `uploadVideo(formData: FormData)`
  - 方法: POST
  - 路径: `/video-analysis/`
  - 参数: `FormData`（包含视频文件及其它元数据）
  - 返回: `VideoAnalysis`

- `getVideoStatus(videoId: string)`
  - 方法: GET
  - 路径: `/video-analysis/{videoId}/status/`
  - 返回: `VideoAnalysis`

- `getVideoList()`
  - 方法: GET
  - 路径: `/video-analysis/list/`
  - 返回: `VideoAnalysis[]`

---

## `recommendApi`（最终推荐/评估，后端路径: `/final-recommend/`）

- `createEvaluation(groupId: string)`
  - 方法: POST
  - 路径: `/final-recommend/interview-evaluation/`
  - 参数: `{ group_id: string }`
  - 返回: `InterviewEvaluationTask`

- `getEvaluationStatus(taskId: string)`
  - 方法: GET
  - 路径: `/final-recommend/interview-evaluation/{taskId}/`
  - 返回: `InterviewEvaluationTask`

- `getEvaluationByGroup(groupId: string)`
  - 方法: GET
  - 路径: `/final-recommend/interview-evaluation/?group_id={groupId}`
  - 返回: `InterviewEvaluationTask | null`

- `stopEvaluation(taskId: string)`
  - 方法: DELETE
  - 路径: `/final-recommend/interview-evaluation/{taskId}/delete/`
  - 返回: void
  - 说明: 停止并删除评估任务。

- `downloadReport(filePath: string)`
  - 方法: GET
  - 路径: `/final-recommend/download-report/{filePath}`
  - 返回: `Blob`
  - 说明: 用于下载最终推荐/面试评估相关的报告文件。

---

## `libraryApi`（简历库，后端路径: `/resume-screening/library/`）

- `getList(params?: { page?: number, page_size?: number, keyword?: string, is_screened?: boolean, is_assigned?: boolean })`
  - 方法: GET
  - 路径: `/resume-screening/library/`（或实现中具体的列表端点）
  - 返回: `{ resumes: LibraryResume[], total: number, page: number, page_size: number }`
  - 说明: 支持按关键字、筛选状态（`is_screened`）、分配状态（`is_assigned`）分页查询。

- `upload(resumes: Array<{ name, content, metadata? }>)`
  - 方法: POST
  - 路径: `/resume-screening/library/upload/`（实现中可能存在此或类似端点）
  - 参数: 多条简历数据
  - 返回: 上传结果汇总（已上传、跳过、计数等）
  - 说明: 后端决定新上传简历的初始 `is_screened` / `is_assigned` 状态（通常为 false）。

- `getDetail(resumeId: string)`
  - 方法: GET
  - 路径: `/resume-screening/library/{resumeId}/`
  - 返回: `LibraryResume`

- `update(resumeId: string, data: { candidate_name?: string, notes?: string })`
  - 方法: PUT
  - 路径: `/resume-screening/library/{resumeId}/`
  - 返回: void
  - 说明: 仅允许更新候选人姓名、备注等元数据；不会在该方法中更改 `is_screened` / `is_assigned`。

- `delete(resumeId: string)`
  - 方法: DELETE
  - 路径: `/resume-screening/library/{resumeId}/`

- `batchDelete(resumeIds: string[])`
  - 方法: POST
  - 路径: `/resume-screening/library/batch-delete/`（或类似端点）

- `checkHashes(hashes: string[])`
  - 方法: POST
  - 路径: `/resume-screening/library/check-hash/`
  - 参数: `{ hashes: string[] }`
  - 返回: `{ exists: Record<string, boolean>, existing_count: number }`
  - 说明: 用于上传前去重检测。

---

## `devToolsApi`（开发/测试工具）

- `generateResumes(params: { position: {...}, count: number })`
  - 方法: POST
  - 路径: `/resume-screening/dev/generate-resumes/`
  - 参数:
    ```json
    {
      "position": {
        "position": "string",
        "description": "string?",
        "required_skills": "string[]?",
        "optional_skills": "string[]?",
        "min_experience": "number?",
        "education": "string[]?"
      },
      "count": "number"
    }
    ```
  - 返回: `{ added: [...], skipped: [...], added_count, skipped_count, requested_count }`
  - 说明: 用于测试时批量自动生成简历数据并添加到简历库。

---

## `interviewAssistApi`（面试辅助，后端路径: `/interview-assist/`）

- `createSession(data: { resume_data_id: string, job_config?: object })`
  - 方法: POST
  - 路径: `/interview-assist/sessions/`
  - 参数: `{ resume_data_id: string, job_config?: Record<string, unknown> }`
  - 返回: `InterviewSession`
  - 说明: 根据简历数据创建面试会话，返回会话信息（含 `session_id`、候选人信息、岗位信息等）。

- `getSession(sessionId: string)`
  - 方法: GET
  - 路径: `/interview-assist/sessions/{sessionId}/`
  - 返回: `InterviewSession`
  - 说明: 获取面试会话详情，包含当前轮次、问答计数、是否完成等状态。

- `endSession(sessionId: string)`
  - 方法: DELETE
  - 路径: `/interview-assist/sessions/{sessionId}/`
  - 返回: void
  - 说明: 结束并删除面试会话。

- `generateQuestions(sessionId: string, params?: {...})`
  - 方法: POST
  - 路径: `/interview-assist/sessions/{sessionId}/generate-questions/`
  - 参数（可选）:
    ```json
    {
      "categories": "string[]?",
      "candidate_level": "string?",
      "count_per_category": "number?",
      "focus_on_resume": "boolean?",
      "interest_point_count": "number? (1-3)"
    }
    ```
  - 返回: `{ question_pool: InterviewQuestion[], resume_highlights: string[], interest_points?: [...] }`
  - 说明: AI 生成面试问题池，可根据分类、候选人级别等参数定制。`interest_points` 包含简历中的兴趣点及对应问题。

- `recordQA(sessionId: string, data: {...})`
  - 方法: POST
  - 路径: `/interview-assist/sessions/{sessionId}/record-qa/`
  - 参数:
    ```json
    {
      "question": {
        "content": "string",
        "expected_skills": "string[]?",
        "difficulty": "number?"
      },
      "answer": { "content": "string" },
      "skip_evaluation": "boolean? (default: true)",
      "followup_count": "number?",
      "alternative_count": "number?"
    }
    ```
  - 返回: `{ round_number, evaluation: AnswerEvaluation | null, candidate_questions: CandidateQuestion[], hr_action_hints: string[] }`
  - 说明: 记录一轮问答并生成候选提问。当 `skip_evaluation` 为 `false` 时，返回 `evaluation` 评估结果；默认跳过评估以加快响应。`candidate_questions` 为 LLM 生成的下一步候选问题。

- `generateReport(sessionId: string, params?: {...})`
  - 方法: POST
  - 路径: `/interview-assist/sessions/{sessionId}/generate-report/`
  - 参数（可选）:
    ```json
    {
      "include_conversation_log": "boolean?",
      "hr_notes": "string?"
    }
    ```
  - 返回: `{ report: InterviewReport, report_file_url: string | null }`
  - 说明: 生成面试最终报告，包含整体评估、维度分析、技能评估、亮点、红旗等。

---

## 关于 `is_screened` 与 `is_assigned` 状态的变更来源

- `is_screened`（是否已筛选）通常由筛选任务驱动：调用 `screeningApi.submitScreening` 并在任务完成后，后端将参与筛选的简历标记为已筛选。前端应在任务完成后重新调用相关列表查询（例如 `libraryApi.getList`）来获取最新状态。
- `is_assigned`（是否已分配）由岗位分配接口改变：`positionApi.assignResumes` 会把简历分配到岗位，后端通常把这些简历的 `is_assigned` 设为 `true`；`positionApi.removeResume` 会取消分配并将其设为 `false`。

---

## 使用建议

- 阅读并参考后端 API 文档以确认精确的端点路径与返回结构（本说明基于 `src/api/index.ts` 的实现约定整理）。
- 在触发会修改简历状态的操作（如分配/筛选）后，务必调用 `useResumeLibrary` 中的刷新方法（如 `loadResumes`）或 `libraryApi.getList` 来同步 UI 状态。

---

## 类型定义

### `LibraryResume`（简历库简历）
```typescript
interface LibraryResume {
  id: string
  filename: string
  file_hash: string
  file_size: number
  file_type: string
  content?: string
  content_preview?: string
  candidate_name: string | null
  is_screened: boolean
  is_assigned: boolean
  notes: string | null
  created_at: string
  updated_at?: string
}
```

### `InterviewSession`（面试会话）
```typescript
interface InterviewSession {
  session_id: string
  candidate_name: string
  position_title: string
  current_round: number
  qa_count?: number
  is_completed: boolean
  created_at: string
  updated_at?: string
  resume_summary?: {
    candidate_name: string
    position_title: string
    screening_score?: number
    screening_summary?: string
  }
  has_final_report?: boolean
  final_report_summary?: string
}
```

### `InterviewQuestion`（面试问题）
```typescript
interface InterviewQuestion {
  question: string
  category: string
  difficulty: number
  expected_skills: string[]
  source: 'resume_based' | 'skill_based' | 'hr_custom'
  related_point?: string
}
```

### `AnswerEvaluation`（回答评估）
```typescript
interface AnswerEvaluation {
  normalized_score: number
  dimension_scores: {
    technical_depth: number
    practical_experience: number
    answer_specificity: number
    logical_clarity: number
    honesty: number
    communication: number
  }
  confidence_level: 'genuine' | 'uncertain' | 'overconfident'
  should_followup: boolean
  followup_reason?: string
  feedback: string
}
```

### `CandidateQuestion`（候选问题）
```typescript
interface CandidateQuestion {
  question: string
  purpose: string
  expected_skills: string[]
  source: 'followup' | 'resume' | 'job'
}
```

### `InterviewReport`（面试报告）
```typescript
interface InterviewReport {
  overall_assessment: {
    recommendation_score: number
    recommendation: string
    summary: string
  }
  dimension_analysis: Record<string, { score: number; comment: string }>
  skill_assessment: Array<{ skill: string; level: string; evidence: string }>
  highlights: string[]
  red_flags: string[]
  overconfidence_detected: boolean
  suggested_next_steps: string[]
}
```
