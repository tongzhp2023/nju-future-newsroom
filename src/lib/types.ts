// ============================================
// 南京大学未来编辑部 - 类型定义
// 基于 PRD v1.0 全面重构
// ============================================

// ============================================
// 一、角色与状态枚举
// ============================================

/** 系统角色：记者 / 责编 / 主编 / 指导老师 / 管理员 */
export type UserRole = 'reporter' | 'editor' | 'chief_editor' | 'supervisor' | 'admin'

/** 稿件状态 */
export type ArticleStatus = 'draft' | 'in_review' | 'returned' | 'published' | 'archived'

/** 选题状态 */
export type TopicStatus = 'draft' | 'pending' | 'approved' | 'needs_revision' | 'rejected'

/** 选题审批操作 */
export type TopicReviewAction = 'approve' | 'request_revision' | 'reject'

/** 稿件审批操作 */
export type ArticleWorkflowAction = 'approve' | 'return_prev' | 'return_reporter' | 'publish'

/** 审批节点角色 */
export type WorkflowRoleRequired = 'editor' | 'chief_editor' | 'supervisor'

/** 审批人指定方式 */
export type AssigneeMode = 'role_based' | 'specific_user'

/** 稿件版本操作类型 */
export type VersionOperationType =
  | 'reporter_submit'
  | 'editor_revision'
  | 'chief_editor_revision'
  | 'supervisor_revision'
  | 'reporter_resubmit'
  | 'auto_save'

// ============================================
// 二、数据库实体类型
// ============================================

/** 编辑部 */
export interface Department {
  id: string
  name: string
  slug: string
  description: string | null
  topic_form_template: TopicFormField[] | null
  active_workflow_id: string | null
  created_at: string
}

/** 选题表单字段配置 */
export interface TopicFormField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'date' | 'file' | 'select'
  required: boolean
  placeholder?: string
  description?: string
  options?: string[]
  section?: string
}

/** 用户资料 */
export interface Profile {
  id: string
  full_name: string | null
  student_id: string | null
  role: UserRole
  department_id: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

/** 用户-编辑部-角色关联 */
export interface UserDepartmentRole {
  id: string
  user_id: string
  department_id: string
  role: UserRole
  created_at: string
}

/** 带扩展信息的用户编辑部角色 */
export interface UserDepartmentRoleWithDetails extends UserDepartmentRole {
  department: Department
  profile?: Profile
}

/** 审批流配置 */
export interface WorkflowConfig {
  id: string
  department_id: string
  version: number
  is_active: boolean
  created_by: string | null
  description: string | null
  created_at: string
}

/** 带节点信息的审批流配置 */
export interface WorkflowConfigWithStages extends WorkflowConfig {
  stages: WorkflowStage[]
}

/** 审批流节点 */
export interface WorkflowStage {
  id: string
  workflow_config_id: string
  stage_order: number
  name: string
  role_required: WorkflowRoleRequired
  assignee_mode: AssigneeMode
  assignee_user_id: string | null
  is_final: boolean
  created_at: string
}

/** 选题 */
export interface Topic {
  id: string
  department_id: string
  author_id: string
  title: string
  form_data: Record<string, unknown>
  status: TopicStatus
  article_id: string | null
  created_at: string
  updated_at: string
}

/** 带扩展信息的选题 */
export interface TopicWithDetails extends Topic {
  author: Profile
  department: Department
  reviews?: TopicReview[]
}

/** 选题审批记录 */
export interface TopicReview {
  id: string
  topic_id: string
  reviewer_id: string
  action: TopicReviewAction
  comment: string | null
  created_at: string
  reviewer?: Profile
}

/** 稿件 */
export interface Article {
  id: string
  title: string
  content: Record<string, unknown> | null
  content_text: string | null
  status: ArticleStatus
  author_id: string
  department_id: string
  topic_id: string | null
  current_stage: number | null
  returned_from_stage: number | null
  workflow_config_id: string | null
  reviewer_id: string | null
  review_comment: string | null
  report_type: string | null
  excellence_level: number | null
  excellence_reason: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

/** 带扩展信息的稿件 */
export interface ArticleWithDetails extends Article {
  author: Profile
  department: Department
  reviewer?: Profile | null
  workflow_config?: WorkflowConfigWithStages | null
  current_stage_info?: WorkflowStage | null
}

/** 稿件版本 */
export interface ArticleVersion {
  id: string
  article_id: string
  version_number: number
  content: Record<string, unknown> | null
  content_text: string | null
  created_by: string
  operation_type: VersionOperationType
  created_at: string
  creator?: Profile
}

/** 稿件审批流转记录 */
export interface ArticleWorkflow {
  id: string
  article_id: string
  user_id: string
  stage_order: number
  action: ArticleWorkflowAction
  comment: string | null
  created_at: string
  user?: Profile
}

/** 稿件操作日志（旧表，保留兼容） */
export interface ArticleLog {
  id: string
  article_id: string
  user_id: string
  action: string
  from_status: string | null
  to_status: string | null
  comment: string | null
  created_at: string
}

/** 共性问题 */
export interface CommonIssue {
  id: string
  article_id: string
  department_id: string
  marked_by: string
  original_text: string
  revision_comment: string
  category: string
  created_at: string
  marker?: Profile
  article?: Article
  department?: Department
}

/** 站内通知 */
export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  content: string | null
  related_entity_type: string | null
  related_entity_id: string | null
  is_read: boolean
  created_at: string
}

// ============================================
// 三、标签与颜色映射
// ============================================

/** 稿件状态中文标签 */
export const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: '草稿',
  in_review: '审批中',
  returned: '退回修改',
  published: '已签发',
  archived: '已归档',
}

/** 稿件状态颜色 */
export const STATUS_COLORS: Record<ArticleStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  returned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

/** 选题状态中文标签 */
export const TOPIC_STATUS_LABELS: Record<TopicStatus, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已通过',
  needs_revision: '需修改',
  rejected: '已驳回',
}

/** 选题状态颜色 */
export const TOPIC_STATUS_COLORS: Record<TopicStatus, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  needs_revision: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

/** 角色中文标签 */
export const ROLE_LABELS: Record<UserRole, string> = {
  reporter: '学生记者',
  editor: '责任编辑',
  chief_editor: '主编/副主编',
  supervisor: '指导老师',
  admin: '系统管理员',
}

/** 角色颜色 */
export const ROLE_COLORS: Record<UserRole, string> = {
  reporter: 'bg-gray-100 text-gray-700',
  editor: 'bg-blue-100 text-blue-700',
  chief_editor: 'bg-indigo-100 text-indigo-700',
  supervisor: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
}

/** 审批节点角色中文标签 */
export const WORKFLOW_ROLE_LABELS: Record<WorkflowRoleRequired, string> = {
  editor: '责任编辑',
  chief_editor: '主编/副主编',
  supervisor: '指导老师',
}

/** 默认选题表单字段（专业新闻报题单） */
export const DEFAULT_TOPIC_FORM_FIELDS: TopicFormField[] = [
  // ---- 基本信息 ----
  { key: 'report_type', label: '报道类型', type: 'select', required: true, section: '基本信息', description: '选择本次报道的体裁类型', options: ['消息', '深度报道', '调查报道', '人物专访', '评论', '数据新闻', '融媒体作品'] },
  { key: 'topic_source', label: '选题线索来源', type: 'select', required: true, section: '基本信息', description: '选题最初从哪里获得', options: ['社会热点', '政策发布', '实地发现', '网络舆情', '读者反馈', '课程指定', '其他'] },
  // ---- 选题论证 ----
  { key: 'background', label: '选题背景', type: 'textarea', required: true, section: '选题论证', placeholder: '简述事件/话题的来龙去脉和社会背景', description: '帮助审批人快速了解报道的宏观语境' },
  { key: 'news_value', label: '新闻价值分析', type: 'textarea', required: true, section: '选题论证', placeholder: '从时效性、重要性、接近性、显著性、趣味性等维度分析该选题的新闻价值', description: '运用新闻价值五要素分析该选题为何值得报道' },
  { key: 'angle', label: '报道角度', type: 'textarea', required: true, section: '选题论证', placeholder: '请阐述你的独特切入点和报道视角', description: '区别于其他媒体的独特视角和切入点' },
  { key: 'significance', label: '报道意义', type: 'textarea', required: false, section: '选题论证', placeholder: '阐述该选题的社会价值和传播意义', description: '该报道对公众、社会、校园的价值和影响' },
  // ---- 采访计划 ----
  { key: 'interviewees', label: '拟采访对象', type: 'textarea', required: true, section: '采访计划', placeholder: '列出拟采访对象、采访方式和信息获取渠道（每行一个）', description: '包括采访对象姓名/身份、联系方式、采访形式等' },
  { key: 'reporting_plan', label: '采访方案', type: 'textarea', required: true, section: '采访计划', placeholder: '描述具体的采访步骤和时间安排', description: '包含实地走访、电话采访、资料搜集等具体行动计划' },
  // ---- 预期成果 ----
  { key: 'output_form', label: '预期成果形式', type: 'select', required: true, section: '预期成果', description: '最终交付的稿件体裁', options: ['文字稿件', '短视频', '图文报道', '音频播客', '数据可视化', '多媒体融合'] },
  { key: 'deadline', label: '计划完成时间', type: 'date', required: true, section: '预期成果', description: '预计初稿完成提交的日期' },
  // ---- 风险与伦理 ----
  { key: 'risks', label: '风险与伦理考量', type: 'textarea', required: false, section: '风险与伦理', placeholder: '涉及的伦理问题、采访风险、信息核实要点', description: '如隐私保护、信源可靠性、采访安全等问题' },
  { key: 'references', label: '参考资料', type: 'textarea', required: false, section: '风险与伦理', placeholder: '列出相关的参考报道、学术文献或数据来源', description: '为审批人提供背景参考' },
]

/** 稿件批注 */
export interface ArticleComment {
  id: string
  article_id: string
  author_id: string
  content: string
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  parent_id: string | null
  created_at: string
  updated_at: string
  author?: Profile
  replies?: ArticleComment[]
}

/** 共性问题默认分类 */
export const COMMON_ISSUE_CATEGORIES = [
  '结构问题',
  '导语薄弱',
  '引用不规范',
  '逻辑混乱',
  '语言表达',
  '事实准确性',
  '标题问题',
  '其他',
] as const
