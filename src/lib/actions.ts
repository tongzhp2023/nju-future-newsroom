'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type {
  Profile, Department, Article, ArticleWithDetails, ArticleVersion, ArticleLog,
  UserDepartmentRole, UserDepartmentRoleWithDetails,
  WorkflowConfig, WorkflowConfigWithStages, WorkflowStage,
  Topic, TopicWithDetails, TopicReview,
  ArticleWorkflow, Notification, CommonIssue, ArticleComment,
  UserRole, TopicReviewAction, ArticleWorkflowAction, TopicFormField,
} from '@/lib/types'

// ============================================
// 一、用户与个人资料
// ============================================

/** 获取当前用户资料 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data as Profile | null
}

/** 更新个人资料 */
export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const full_name = formData.get('full_name') as string
  const student_id = formData.get('student_id') as string

  await supabase
    .from('profiles')
    .update({ full_name, student_id })
    .eq('id', user.id)

  redirect('/dashboard/profile')
}

// ============================================
// 二、编辑部管理
// ============================================

/** 获取所有编辑部 */
export async function getDepartments(): Promise<Department[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('departments').select('*').order('name')
  return (data ?? []) as Department[]
}

/** 获取编辑部详情 */
export async function getDepartment(id: string): Promise<Department | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('departments').select('*').eq('id', id).single()
  return data as Department | null
}

// ============================================
// 三、用户编辑部角色管理（多对多）
// ============================================

/** 获取当前用户所属的所有编辑部及角色 */
export async function getMyDepartmentRoles(): Promise<UserDepartmentRoleWithDetails[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('user_department_roles')
    .select('*, department:departments(*)')
    .eq('user_id', user.id)
    .order('created_at')

  return (data ?? []) as UserDepartmentRoleWithDetails[]
}

/** 获取用户在指定编辑部的角色列表 */
export async function getUserRolesInDepartment(departmentId: string): Promise<UserRole[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('user_department_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('department_id', departmentId)

  return (data ?? []).map((d: { role: UserRole }) => d.role)
}

/** 获取编辑部所有成员 */
export async function getDepartmentMembers(departmentId: string): Promise<(UserDepartmentRole & { profile: Profile })[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_department_roles')
    .select('*, profile:profiles(*)')
    .eq('department_id', departmentId)
    .order('role')

  return (data ?? []) as (UserDepartmentRole & { profile: Profile })[]
}

/** 添加成员到编辑部 */
export async function addDepartmentMember(departmentId: string, userId: string, role: UserRole) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('user_department_roles')
    .insert({ user_id: userId, department_id: departmentId, role })

  if (error) throw new Error(error.message)
}

/** 移除编辑部成员 */
export async function removeDepartmentMember(departmentId: string, userId: string, role: UserRole) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('user_department_roles')
    .delete()
    .eq('user_id', userId)
    .eq('department_id', departmentId)
    .eq('role', role)

  if (error) throw new Error(error.message)
}

/** 加入编辑部（需审核，默认为 reporter，状态 pending） */
export async function joinDepartment(departmentId: string) {
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error('未登录')

// 检查是否已存在
const { data: existing } = await supabase
.from('user_department_roles')
.select('id')
.eq('user_id', user.id)
.eq('department_id', departmentId)
.eq('role', 'reporter')
.maybeSingle()

if (existing) return // 已加入

const { error } = await supabase
.from('user_department_roles')
.insert({ user_id: user.id, department_id: departmentId, role: 'reporter' })

if (error) throw new Error(error.message)

// 通知责编有新人申请加入
const { data: editors } = await supabase
.from('user_department_roles')
.select('user_id')
.eq('department_id', departmentId)
.in('role', ['editor', 'chief_editor', 'supervisor'])

if (editors?.length) {
  const profile = await getProfile()
  const notifications = editors.map((e: { user_id: string }) => ({
    user_id: e.user_id,
    type: 'member_join_request',
    title: '新成员申请加入',
    content: `${profile?.full_name || '用户'} 申请加入编辑部，请审核`,
    related_entity_type: 'department',
    related_entity_id: departmentId,
  }))
  await supabase.from('notifications').insert(notifications)
}
}

/** 退出编辑部 */
export async function leaveDepartment(departmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { error } = await supabase
    .from('user_department_roles')
    .delete()
    .eq('user_id', user.id)
    .eq('department_id', departmentId)

  if (error) throw new Error(error.message)
}

// ============================================
// 四、审批流配置管理
// ============================================

/** 获取编辑部当前生效的审批流配置（含节点） */
export async function getActiveWorkflow(departmentId: string): Promise<WorkflowConfigWithStages | null> {
  const supabase = await createClient()

  const { data: config } = await supabase
    .from('workflow_configs')
    .select('*')
    .eq('department_id', departmentId)
    .eq('is_active', true)
    .single()

  if (!config) return null

  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('*')
    .eq('workflow_config_id', config.id)
    .order('stage_order')

  return {
    ...(config as WorkflowConfig),
    stages: (stages ?? []) as WorkflowStage[],
  }
}

/** 获取审批流配置历史版本列表 */
export async function getWorkflowHistory(departmentId: string): Promise<WorkflowConfig[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('workflow_configs')
    .select('*')
    .eq('department_id', departmentId)
    .order('version', { ascending: false })

  return (data ?? []) as WorkflowConfig[]
}

/** 获取某个审批流配置的详情（含节点） */
export async function getWorkflowConfig(configId: string): Promise<WorkflowConfigWithStages | null> {
  const supabase = await createClient()

  const { data: config } = await supabase
    .from('workflow_configs')
    .select('*')
    .eq('id', configId)
    .single()

  if (!config) return null

  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('*')
    .eq('workflow_config_id', config.id)
    .order('stage_order')

  return {
    ...(config as WorkflowConfig),
    stages: (stages ?? []) as WorkflowStage[],
  }
}

/** 创建新的审批流配置版本 */
export async function createWorkflowConfig(
  departmentId: string,
  stages: { name: string; role_required: string; is_final: boolean }[],
  description?: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  // 验证节点合法性
  const finalStages = stages.filter(s => s.is_final)
  if (finalStages.length !== 1) throw new Error('审批流必须有且仅有一个终审签发节点')
  if (!stages[stages.length - 1].is_final) throw new Error('终审签发节点必须是最后一个节点')
  if (stages.length < 1) throw new Error('审批流至少需要一个节点')

  // 获取当前最大版本号
  const { data: latest } = await supabase
    .from('workflow_configs')
    .select('version')
    .eq('department_id', departmentId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const newVersion = (latest?.version ?? 0) + 1

  // 将旧版本标记为非活跃
  await supabase
    .from('workflow_configs')
    .update({ is_active: false })
    .eq('department_id', departmentId)

  // 创建新配置
  const { data: config, error: configError } = await supabase
    .from('workflow_configs')
    .insert({
      department_id: departmentId,
      version: newVersion,
      is_active: true,
      created_by: user.id,
      description: description || `审批流 v${newVersion}`,
    })
    .select()
    .single()

  if (configError || !config) throw new Error(configError?.message ?? '创建审批流失败')

  // 创建节点
  const stageRecords = stages.map((s, i) => ({
    workflow_config_id: config.id,
    stage_order: i + 1,
    name: s.name,
    role_required: s.role_required,
    is_final: s.is_final,
  }))

  const { error: stagesError } = await supabase
    .from('workflow_stages')
    .insert(stageRecords)

  if (stagesError) throw new Error(stagesError.message)

  // 更新编辑部的活跃审批流
  await supabase
    .from('departments')
    .update({ active_workflow_id: config.id })
    .eq('id', departmentId)

  return config as WorkflowConfig
}

// ============================================
// 五、选题管理
// ============================================

/** 获取编辑部选题列表 */
export async function getTopics(departmentId: string, status?: string): Promise<TopicWithDetails[]> {
  const supabase = await createClient()
  let query = supabase
    .from('topics')
    .select('*, author:profiles!topics_author_id_fkey(*), department:departments(*)')
    .eq('department_id', departmentId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data } = await query
  return (data ?? []) as TopicWithDetails[]
}

/** 获取选题详情 */
export async function getTopic(id: string): Promise<TopicWithDetails | null> {
  const supabase = await createClient()

  const { data: topic } = await supabase
    .from('topics')
    .select('*, author:profiles!topics_author_id_fkey(*), department:departments(*)')
    .eq('id', id)
    .single()

  if (!topic) return null

  // 获取审批记录
  const { data: reviews } = await supabase
    .from('topic_reviews')
    .select('*, reviewer:profiles!topic_reviews_reviewer_id_fkey(*)')
    .eq('topic_id', id)
    .order('created_at', { ascending: false })

  return {
    ...(topic as TopicWithDetails),
    reviews: (reviews ?? []) as TopicReview[],
  }
}

/** 创建选题 */
export async function createTopic(departmentId: string, title: string, formData: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { data, error } = await supabase
    .from('topics')
    .insert({
      department_id: departmentId,
      author_id: user.id,
      title,
      form_data: formData,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 通知编辑部指导老师
  const { data: supervisors } = await supabase
    .from('user_department_roles')
    .select('user_id')
    .eq('department_id', departmentId)
    .eq('role', 'supervisor')

  if (supervisors?.length) {
    const notifications = supervisors.map((s: { user_id: string }) => ({
      user_id: s.user_id,
      type: 'topic_submitted',
      title: '新选题待审批',
      content: `记者提交了选题「${title}」，请审阅`,
      related_entity_type: 'topic',
      related_entity_id: data.id,
    }))

    await supabase.from('notifications').insert(notifications)
  }

  return data as Topic
}

/** 保存选题草稿 */
export async function saveTopicDraft(departmentId: string, title: string, formData: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { data, error } = await supabase
    .from('topics')
    .insert({
      department_id: departmentId,
      author_id: user.id,
      title: title || '未命名选题',
      form_data: formData,
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Topic
}

/** 更新选题草稿 */
export async function updateTopicDraft(id: string, title: string, formData: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { error } = await supabase
    .from('topics')
    .update({ title: title || '未命名选题', form_data: formData })
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('status', 'draft')

  if (error) throw new Error(error.message)
}

/** 更新草稿选题内容并提交（先保存再提交） */
export async function submitTopicWithUpdate(id: string, title: string, formData: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  // 先更新内容
  const { error: updateError } = await supabase
    .from('topics')
    .update({ title: title || '未命名选题', form_data: formData })
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('status', 'draft')

  if (updateError) throw new Error(updateError.message)

  // 然后提交
  return submitTopicDraft(id)
}

/** 提交草稿选题（从 draft 变为 pending） */
export async function submitTopicDraft(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { data, error } = await supabase
    .from('topics')
    .update({ status: 'pending' })
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('status', 'draft')
    .select('*, department:departments(*)')
    .single()

  if (error) throw new Error(error.message)

  // 通知编辑部指导老师
  const { data: supervisors } = await supabase
    .from('user_department_roles')
    .select('user_id')
    .eq('department_id', data.department_id)
    .eq('role', 'supervisor')

  if (supervisors?.length) {
    const notifications = supervisors.map((s: { user_id: string }) => ({
      user_id: s.user_id,
      type: 'topic_submitted',
      title: '新选题待审批',
      content: `记者提交了选题「${data.title}」，请审阅`,
      related_entity_type: 'topic',
      related_entity_id: data.id,
    }))

    await supabase.from('notifications').insert(notifications)
  }

  return data
}

/** 更新选题内容并重新提交（已驳回/需修改 → pending） */
export async function resubmitTopic(id: string, title: string, formData: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { data, error } = await supabase
    .from('topics')
    .update({ title, form_data: formData, status: 'pending' })
    .eq('id', id)
    .eq('author_id', user.id)
    .in('status', ['rejected', 'needs_revision'])
    .select('*, department:departments(*)')
    .single()

  if (error) throw new Error(error.message)

  // 通知编辑部指导老师
  const { data: supervisors } = await supabase
    .from('user_department_roles')
    .select('user_id')
    .eq('department_id', data.department_id)
    .eq('role', 'supervisor')

  if (supervisors?.length) {
    const notifications = supervisors.map((s: { user_id: string }) => ({
      user_id: s.user_id,
      type: 'topic_submitted',
      title: '选题重新提交',
      content: `记者修改并重新提交了选题「${data.title}」，请审阅`,
      related_entity_type: 'topic',
      related_entity_id: data.id,
    }))
    await supabase.from('notifications').insert(notifications)
  }

  return data
}

/** 将已驳回的选题重新保存为草稿 */
export async function revertTopicToDraft(id: string, title: string, formData: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { error } = await supabase
    .from('topics')
    .update({ title, form_data: formData, status: 'draft' })
    .eq('id', id)
    .eq('author_id', user.id)
    .in('status', ['rejected', 'needs_revision'])

  if (error) throw new Error(error.message)
}

/** 更新选题（兼容旧调用） */
export async function updateTopic(id: string, title: string, formData: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { error } = await supabase
    .from('topics')
    .update({ title, form_data: formData, status: 'pending' })
    .eq('id', id)
    .eq('author_id', user.id)

  if (error) throw new Error(error.message)
}

/** 审批选题 */
export async function reviewTopic(topicId: string, action: TopicReviewAction, comment?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  // 映射操作到状态
  const statusMap: Record<TopicReviewAction, string> = {
    approve: 'approved',
    request_revision: 'needs_revision',
    reject: 'rejected',
  }

  // 创建审批记录
  await supabase.from('topic_reviews').insert({
    topic_id: topicId,
    reviewer_id: user.id,
    action,
    comment: comment || null,
  })

  // 更新选题状态
  const { data: topic } = await supabase
    .from('topics')
    .update({ status: statusMap[action] })
    .eq('id', topicId)
    .select('*, author:profiles!topics_author_id_fkey(full_name)')
    .single()

  if (!topic) throw new Error('选题不存在')

  // 通知记者
  const actionLabels: Record<TopicReviewAction, string> = {
    approve: '已通过',
    request_revision: '需修改',
    reject: '已驳回',
  }

  await supabase.from('notifications').insert({
    user_id: topic.author_id,
    type: 'topic_reviewed',
    title: `选题${actionLabels[action]}`,
    content: `你的选题「${topic.title}」${actionLabels[action]}${comment ? `，审批意见：${comment}` : ''}`,
    related_entity_type: 'topic',
    related_entity_id: topicId,
  })

  // 如果通过，自动创建关联稿件
  if (action === 'approve') {
    const { data: article } = await supabase
      .from('articles')
      .insert({
        title: topic.title,
        author_id: topic.author_id,
        department_id: topic.department_id,
        topic_id: topicId,
        status: 'draft',
      })
      .select()
      .single()

    if (article) {
      // 更新选题关联的稿件 ID
      await supabase.from('topics').update({ article_id: article.id }).eq('id', topicId)

      // 记录日志
      await supabase.from('article_logs').insert({
        article_id: article.id,
        user_id: user.id,
        action: 'create',
        to_status: 'draft',
        comment: `选题「${topic.title}」通过审批，自动创建稿件`,
      })
    }
  }
}

// ============================================
// 六、稿件管理
// ============================================

/** 创建稿件 */
export async function createArticle(departmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { data, error } = await supabase
    .from('articles')
    .insert({
      title: '无标题稿件',
      author_id: user.id,
      department_id: departmentId,
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 记录日志
  await supabase.from('article_logs').insert({
    article_id: data.id,
    user_id: user.id,
    action: 'create',
    to_status: 'draft',
  })

  redirect(`/dashboard/dept/${departmentId}/articles/${data.id}/edit`)
}

/** 获取编辑部稿件列表 */
export async function getArticles(departmentId: string, status?: string): Promise<ArticleWithDetails[]> {
const supabase = await createClient()
let query = supabase
.from('articles')
.select('*, author:profiles!articles_author_id_fkey(*), department:departments(*)')
.eq('department_id', departmentId)
.order('updated_at', { ascending: false })

if (status && status !== 'all') {
query = query.eq('status', status)
}

const { data } = await query
const articles = (data ?? []) as ArticleWithDetails[]

// 为审批中的稿件填充 current_stage_info
const inReviewArticles = articles.filter(a => a.status === 'in_review' && a.workflow_config_id && a.current_stage)
if (inReviewArticles.length > 0) {
  const configIds = [...new Set(inReviewArticles.map(a => a.workflow_config_id!))]
  const configs: Record<string, WorkflowConfigWithStages> = {}
  for (const configId of configIds) {
    const config = await getWorkflowConfig(configId)
    if (config) configs[configId] = config
  }
  for (const article of inReviewArticles) {
    const config = configs[article.workflow_config_id!]
    if (config) {
      article.current_stage_info = config.stages.find(s => s.stage_order === article.current_stage) ?? null
    }
  }
}

return articles
}

/** 获取稿件详情 */
export async function getArticle(id: string): Promise<ArticleWithDetails | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('articles')
    .select('*, author:profiles!articles_author_id_fkey(*), department:departments(*), reviewer:profiles!articles_reviewer_id_fkey(*)')
    .eq('id', id)
    .single()

  if (!data) return null

  const article = data as ArticleWithDetails

  // 如果有绑定的审批流，获取审批流配置
  if (article.workflow_config_id) {
    article.workflow_config = await getWorkflowConfig(article.workflow_config_id)
    if (article.current_stage && article.workflow_config) {
      article.current_stage_info = article.workflow_config.stages.find(
        s => s.stage_order === article.current_stage
      ) ?? null
    }
  }

  return article
}

/** 更新稿件内容 */
export async function updateArticle(id: string, data: { title?: string; content?: Record<string, unknown>; content_text?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('articles').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}

/** 删除稿件（仅草稿） */
export async function deleteArticle(id: string, departmentId: string) {
const supabase = await createClient()
const { error } = await supabase.from('articles').delete().eq('id', id).eq('status', 'draft')
if (error) throw new Error(error.message)
redirect(`/dashboard/dept/${departmentId}/articles`)
}

/** 提交稿件进入审批流 */
export async function submitArticle(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  // 获取稿件
  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (!article) throw new Error('稿件不存在')
  if (article.status !== 'draft' && article.status !== 'returned') {
    throw new Error('只有草稿或退回修改状态的稿件可以提交')
  }

  // 获取编辑部当前生效的审批流
  const workflow = await getActiveWorkflow(article.department_id)
  if (!workflow || workflow.stages.length === 0) {
    throw new Error('编辑部尚未配置审批流')
  }

  const firstStage = workflow.stages[0]

  // 创建版本快照
  const { data: versionCount } = await supabase
    .from('article_versions')
    .select('version_number')
    .eq('article_id', id)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const newVersionNumber = (versionCount?.version_number ?? 0) + 1

  await supabase.from('article_versions').insert({
    article_id: id,
    version_number: newVersionNumber,
    content: article.content,
    content_text: article.content_text,
    created_by: user.id,
    operation_type: article.status === 'returned' ? 'reporter_resubmit' : 'reporter_submit',
  })

  // 更新稿件状态
  // "谁退回谁审批"：如果是退回修改后重新提交，直接回到退回来源节点
  const fromStatus = article.status
  const targetStageOrder = (fromStatus === 'returned' && article.returned_from_stage)
    ? article.returned_from_stage
    : firstStage.stage_order
  const targetStage = workflow.stages.find(s => s.stage_order === targetStageOrder) || firstStage

  await supabase
    .from('articles')
    .update({
      status: 'in_review',
      current_stage: targetStage.stage_order,
      workflow_config_id: workflow.id,
      returned_from_stage: null, // 清除退回来源标记
    })
    .eq('id', id)

  // 记录日志
  await supabase.from('article_logs').insert({
    article_id: id,
    user_id: user.id,
    action: 'submit',
    from_status: fromStatus,
    to_status: 'in_review',
    comment: `提交审核，进入「${targetStage.name}」环节`,
  })

  // 通知目标审批节点的审批人
  await notifyStageReviewers(article.department_id, targetStage, article.title, id)
}

/** 稿件审批操作（通过/退回上一级/退回记者/签发） */
export async function transitionArticle(
  articleId: string,
  action: ArticleWorkflowAction,
  comment?: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  // 获取稿件
  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .single()

  if (!article) throw new Error('稿件不存在')
  if (article.status !== 'in_review') throw new Error('稿件不在审核状态')
  if (!article.workflow_config_id || !article.current_stage) {
    throw new Error('稿件缺少审批流配置')
  }

  // 获取审批流
  const workflow = await getWorkflowConfig(article.workflow_config_id)
  if (!workflow) throw new Error('审批流配置不存在')

  const currentStage = workflow.stages.find(s => s.stage_order === article.current_stage)
  if (!currentStage) throw new Error('当前审批节点不存在')

  // 校验操作人是否有权限
  const userRoles = await getUserRolesInDepartment(article.department_id)
  const profile = await getProfile()
  const isAdmin = profile?.role === 'admin'
  if (!isAdmin && !userRoles.includes(currentStage.role_required as UserRole)) {
    throw new Error(`当前节点需要「${currentStage.role_required}」角色`)
  }

  // 记录审批流转
  await supabase.from('article_workflows').insert({
    article_id: articleId,
    user_id: user.id,
    stage_order: article.current_stage,
    action,
    comment: comment || null,
  })

  // 创建版本快照（审批人修订时）
  const { data: latestVersion } = await supabase
    .from('article_versions')
    .select('version_number')
    .eq('article_id', articleId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const roleToOpType: Record<string, string> = {
    editor: 'editor_revision',
    chief_editor: 'chief_editor_revision',
    supervisor: 'supervisor_revision',
  }

  await supabase.from('article_versions').insert({
    article_id: articleId,
    version_number: (latestVersion?.version_number ?? 0) + 1,
    content: article.content,
    content_text: article.content_text,
    created_by: user.id,
    operation_type: roleToOpType[currentStage.role_required] || 'editor_revision',
  })

  // 根据操作类型执行流转
  if (action === 'approve') {
    // 通过：流转至下一个节点
    const nextStage = workflow.stages.find(s => s.stage_order === article.current_stage + 1)

    if (currentStage.is_final || !nextStage) {
      // 终审节点通过 = 签发
      await supabase.from('articles').update({
        status: 'published',
        current_stage: null,
        reviewer_id: user.id,
        review_comment: comment || null,
        published_at: new Date().toISOString(),
      }).eq('id', articleId)

      await supabase.from('article_logs').insert({
        article_id: articleId,
        user_id: user.id,
        action: 'publish',
        from_status: 'in_review',
        to_status: 'published',
        comment: `「${currentStage.name}」审批通过，稿件签发`,
      })

      // 通知全链路
      await notifyArticlePublished(articleId, article)
    } else {
      // 非终审节点通过，流转下一级
      await supabase.from('articles').update({
        current_stage: nextStage.stage_order,
      }).eq('id', articleId)

      await supabase.from('article_logs').insert({
        article_id: articleId,
        user_id: user.id,
        action: 'approve',
        from_status: 'in_review',
        to_status: 'in_review',
        comment: `「${currentStage.name}」通过，进入「${nextStage.name}」`,
      })

      await notifyStageReviewers(article.department_id, nextStage, article.title, articleId)
    }

  } else if (action === 'return_prev') {
    // 退回上一级
    const prevStage = workflow.stages.find(s => s.stage_order === article.current_stage - 1)

    if (!prevStage) {
      // 已经是第一个节点，退回给记者 —— 同样记录退回来源节点
      await supabase.from('articles').update({
        status: 'returned',
        current_stage: null,
        returned_from_stage: article.current_stage,
        review_comment: comment || null,
      }).eq('id', articleId)

      await supabase.from('article_logs').insert({
        article_id: articleId, user_id: user.id,
        action: 'reject', from_status: 'in_review', to_status: 'returned',
        comment: `「${currentStage.name}」退回记者修改：${comment || ''}`,
      })

      await notifyUser(article.author_id, 'article_returned', '稿件被退回',
        `你的稿件「${article.title}」被「${currentStage.name}」退回修改${comment ? `，意见：${comment}` : ''}`,
        'article', articleId)
    } else {
      // 退回上一级审批节点
      await supabase.from('articles').update({
        current_stage: prevStage.stage_order,
      }).eq('id', articleId)

      await supabase.from('article_logs').insert({
        article_id: articleId, user_id: user.id,
        action: 'reject', from_status: 'in_review', to_status: 'in_review',
        comment: `「${currentStage.name}」退回至「${prevStage.name}」：${comment || ''}`,
      })

      await notifyStageReviewers(article.department_id, prevStage, article.title, articleId)
    }

  } else if (action === 'return_reporter') {
    // 直接退回记者 —— 记录退回来源节点，实现"谁退回谁审批"
    await supabase.from('articles').update({
      status: 'returned',
      current_stage: null,
      returned_from_stage: article.current_stage,
      review_comment: comment || null,
    }).eq('id', articleId)

    await supabase.from('article_logs').insert({
      article_id: articleId, user_id: user.id,
      action: 'reject', from_status: 'in_review', to_status: 'returned',
      comment: `「${currentStage.name}」直接退回记者修改：${comment || ''}`,
    })

    await notifyUser(article.author_id, 'article_returned', '稿件被退回',
      `你的稿件「${article.title}」被直接退回修改${comment ? `，意见：${comment}` : ''}`,
      'article', articleId)
  }
}

// ============================================
// 七、稿件版本管理
// ============================================

/** 获取稿件版本历史 */
export async function getArticleVersions(articleId: string): Promise<ArticleVersion[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('article_versions')
    .select('*, creator:profiles!article_versions_created_by_fkey(*)')
    .eq('article_id', articleId)
    .order('version_number', { ascending: false })

  return (data ?? []) as ArticleVersion[]
}

/** 获取稿件操作日志 */
export async function getArticleLogs(articleId: string): Promise<ArticleLog[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('article_logs')
    .select('*')
    .eq('article_id', articleId)
    .order('created_at', { ascending: false })

  return (data ?? []) as ArticleLog[]
}

/** 获取稿件审批流转记录 */
export async function getArticleWorkflows(articleId: string): Promise<ArticleWorkflow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('article_workflows')
    .select('*, user:profiles!article_workflows_user_id_fkey(*)')
    .eq('article_id', articleId)
    .order('created_at')

  return (data ?? []) as ArticleWorkflow[]
}

// ============================================
// 八、通知系统
// ============================================

/** 获取当前用户的通知 */
export async function getNotifications(unreadOnly = false): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data } = await query
  return (data ?? []) as Notification[]
}

/** 获取未读通知数 */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return count ?? 0
}

/** 标记通知已读 */
export async function markNotificationRead(id: string) {
  const supabase = await createClient()
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
}

/** 全部标记已读 */
export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
}

// ============================================
// 九、共性问题与优秀稿件
// ============================================

/** 标记共性问题 */
export async function markCommonIssue(
  articleId: string,
  departmentId: string,
  originalText: string,
  revisionComment: string,
  category: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { error } = await supabase.from('common_issues').insert({
    article_id: articleId,
    department_id: departmentId,
    marked_by: user.id,
    original_text: originalText,
    revision_comment: revisionComment,
    category,
  })

  if (error) throw new Error(error.message)
}

/** 获取共性问题列表 */
export async function getCommonIssues(departmentId?: string, category?: string): Promise<CommonIssue[]> {
  const supabase = await createClient()
  let query = supabase
    .from('common_issues')
    .select('*, marker:profiles!common_issues_marked_by_fkey(*), article:articles(*), department:departments(*)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (departmentId) query = query.eq('department_id', departmentId)
  if (category) query = query.eq('category', category)

  const { data } = await query
  return (data ?? []) as CommonIssue[]
}

/** 标记优秀稿件 */
export async function markExcellence(articleId: string, level: number, reason: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('articles')
    .update({ excellence_level: level, excellence_reason: reason })
    .eq('id', articleId)

  if (error) throw new Error(error.message)
}

/** 获取优秀稿件列表 */
export async function getExcellentArticles(departmentId?: string): Promise<ArticleWithDetails[]> {
  const supabase = await createClient()
  let query = supabase
    .from('articles')
    .select('*, author:profiles!articles_author_id_fkey(*), department:departments(*)')
    .not('excellence_level', 'is', null)
    .eq('status', 'published')
    .order('excellence_level', { ascending: false })

  if (departmentId) query = query.eq('department_id', departmentId)

  const { data } = await query
  return (data ?? []) as ArticleWithDetails[]
}

// ============================================
// 十、内部辅助函数
// ============================================

/** 通知某个审批节点的审批人 */
async function notifyStageReviewers(
  departmentId: string,
  stage: WorkflowStage,
  articleTitle: string,
  articleId: string,
) {
  const supabase = await createClient()

  if (stage.assignee_mode === 'specific_user' && stage.assignee_user_id) {
    await notifyUser(stage.assignee_user_id, 'article_pending_review', `待审核：${stage.name}`,
      `稿件「${articleTitle}」进入「${stage.name}」环节，请审核`,
      'article', articleId)
  } else {
    // 按角色通知
    const { data: reviewers } = await supabase
      .from('user_department_roles')
      .select('user_id')
      .eq('department_id', departmentId)
      .eq('role', stage.role_required)

    if (reviewers?.length) {
      const notifications = reviewers.map((r: { user_id: string }) => ({
        user_id: r.user_id,
        type: 'article_pending_review',
        title: `待审核：${stage.name}`,
        content: `稿件「${articleTitle}」进入「${stage.name}」环节，请审核`,
        related_entity_type: 'article',
        related_entity_id: articleId,
      }))
      await supabase.from('notifications').insert(notifications)
    }
  }
}

/** 通知稿件签发 */
async function notifyArticlePublished(articleId: string, article: Record<string, unknown>) {
  const supabase = await createClient()

  // 通知作者
  await notifyUser(
    article.author_id as string, 'article_published', '稿件已签发',
    `你的稿件「${article.title}」已通过终审签发`,
    'article', articleId)

  // 通知所有参与审批的人
  const { data: workflows } = await supabase
    .from('article_workflows')
    .select('user_id')
    .eq('article_id', articleId)

  if (workflows?.length) {
    const uniqueUserIds = [...new Set(workflows.map((w: { user_id: string }) => w.user_id))]
      .filter(uid => uid !== article.author_id)

    if (uniqueUserIds.length) {
      const notifications = uniqueUserIds.map(uid => ({
        user_id: uid,
        type: 'article_published',
        title: '稿件已签发',
        content: `稿件「${article.title}」已通过终审签发`,
        related_entity_type: 'article',
        related_entity_id: articleId,
      }))
      await supabase.from('notifications').insert(notifications)
    }
  }
}

/** 发送单条通知 */
async function notifyUser(
  userId: string, type: string, title: string, content: string,
  entityType?: string, entityId?: string,
) {
  const supabase = await createClient()
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    content,
    related_entity_type: entityType || null,
    related_entity_id: entityId || null,
  })
}

// ============================================
// 十一、选题模板配置
// ============================================

/** 更新编辑部的选题表单模板 */
export async function updateTopicFormTemplate(departmentId: string, template: TopicFormField[]) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('departments')
    .update({ topic_form_template: template })
    .eq('id', departmentId)

  if (error) throw new Error(error.message)
}

// ============================================
// 十二、报道数据库与教学展示
// ============================================

/** 获取所有已签发稿件（报道数据库） */
export async function getPublishedArticles(departmentId?: string): Promise<ArticleWithDetails[]> {
  const supabase = await createClient()
  let query = supabase
    .from('articles')
    .select('*, author:profiles!articles_author_id_fkey(*), department:departments(*)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (departmentId) query = query.eq('department_id', departmentId)

  const { data } = await query
  return (data ?? []) as ArticleWithDetails[]
}

/** 获取教学统计数据 */
export async function getTeachingStats() {
  const supabase = await createClient()

  const [articlesResult, publishedResult, topicsResult, membersResult, deptsResult] = await Promise.all([
    supabase.from('articles').select('id, department_id, status', { count: 'exact', head: false }),
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('topics').select('id, department_id, status', { count: 'exact', head: false }),
    supabase.from('user_department_roles').select('user_id, department_id, role', { count: 'exact', head: false }),
    supabase.from('departments').select('id, name, slug'),
  ])

  const articles = articlesResult.data ?? []
  const topics = topicsResult.data ?? []
  const members = membersResult.data ?? []
  const departments = deptsResult.data ?? []

  // 按编辑部统计
  const deptStats = departments.map((dept: { id: string; name: string; slug: string }) => {
    const deptArticles = articles.filter((a: { department_id: string }) => a.department_id === dept.id)
    const deptPublished = deptArticles.filter((a: { status: string }) => a.status === 'published').length
    const deptTopics = topics.filter((t: { department_id: string }) => t.department_id === dept.id)
    const deptApprovedTopics = deptTopics.filter((t: { status: string }) => t.status === 'approved').length
    const deptMembers = members.filter((m: { department_id: string }) => m.department_id === dept.id)

    return {
      id: dept.id,
      name: dept.name,
      slug: dept.slug,
      totalArticles: deptArticles.length,
      publishedArticles: deptPublished,
      totalTopics: deptTopics.length,
      approvedTopics: deptApprovedTopics,
      memberCount: deptMembers.length,
    }
  })

  return {
    totalArticles: articles.length,
    publishedArticles: publishedResult.count ?? 0,
    totalTopics: topics.length,
    approvedTopics: topics.filter((t: { status: string }) => t.status === 'approved').length,
    totalMembers: new Set(members.map((m: { user_id: string }) => m.user_id)).size,
    departmentCount: departments.length,
    deptStats,
  }
}

// ============================================
// 十三、稿件批注管理
// ============================================

/** 获取稿件的所有批注 */
export async function getArticleComments(articleId: string): Promise<ArticleComment[]> {
  const supabase = await createClient()

  // 获取顶级批注
  const { data: comments } = await supabase
    .from('article_comments')
    .select('*, author:profiles!article_comments_author_id_fkey(*)')
    .eq('article_id', articleId)
    .is('parent_id', null)
    .order('created_at', { ascending: true })

  if (!comments || comments.length === 0) return []

  // 获取回复
  const commentIds = comments.map((c: { id: string }) => c.id)
  const { data: replies } = await supabase
    .from('article_comments')
    .select('*, author:profiles!article_comments_author_id_fkey(*)')
    .in('parent_id', commentIds)
    .order('created_at', { ascending: true })

  const result = comments as ArticleComment[]
  const replyList = (replies ?? []) as ArticleComment[]

  // 将回复挂到对应批注下
  result.forEach(comment => {
    comment.replies = replyList.filter(r => r.parent_id === comment.id)
  })

  return result
}

/** 创建批注 */
export async function createArticleComment(
  articleId: string,
  content: string,
  parentId?: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')
  if (!content.trim()) throw new Error('批注内容不能为空')

  const { data, error } = await supabase
    .from('article_comments')
    .insert({
      article_id: articleId,
      author_id: user.id,
      content: content.trim(),
      parent_id: parentId || null,
    })
    .select('*, author:profiles!article_comments_author_id_fkey(*)')
    .single()

  if (error) throw new Error(error.message)

  // 如果是回复，通知原批注作者
  if (parentId) {
    const { data: parentComment } = await supabase
      .from('article_comments')
      .select('author_id')
      .eq('id', parentId)
      .single()

    if (parentComment && parentComment.author_id !== user.id) {
      await notifyUser(
        parentComment.author_id,
        'comment_reply',
        '收到批注回复',
        `你的批注收到了新的回复`,
        'article',
        articleId,
      )
    }
  } else {
    // 新批注通知稿件作者
    const { data: article } = await supabase
      .from('articles')
      .select('author_id, title')
      .eq('id', articleId)
      .single()

    if (article && article.author_id !== user.id) {
      await notifyUser(
        article.author_id,
        'comment_new',
        '稿件收到新批注',
        `你的稿件「${article.title}」收到了新的批注`,
        'article',
        articleId,
      )
    }
  }

  return data as ArticleComment
}

/** 解决/取消解决批注 */
export async function resolveArticleComment(commentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { data: comment } = await supabase
    .from('article_comments')
    .select('resolved')
    .eq('id', commentId)
    .single()

  if (!comment) throw new Error('批注不存在')

  const { error } = await supabase
    .from('article_comments')
    .update({
      resolved: !comment.resolved,
      resolved_by: !comment.resolved ? user.id : null,
      resolved_at: !comment.resolved ? new Date().toISOString() : null,
    })
    .eq('id', commentId)

  if (error) throw new Error(error.message)
}

/** 删除批注 */
export async function deleteArticleComment(commentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { error } = await supabase
    .from('article_comments')
    .delete()
    .eq('id', commentId)
    .eq('author_id', user.id)

  if (error) throw new Error(error.message)
}
