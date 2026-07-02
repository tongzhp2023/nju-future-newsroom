import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import {
  getArticle,
  getUserRolesInDepartment,
  getArticleVersions,
  getArticleWorkflows,
  getArticleComments,
  getProfile,
  getDepartment,
} from '@/lib/actions'
import ArticleEditor from './article-editor'

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ deptId: string; id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { deptId, id } = await params

  const [article, userRoles, versions, workflows, comments, profile, department] = await Promise.all([
    getArticle(id),
    getUserRolesInDepartment(deptId),
    getArticleVersions(id),
    getArticleWorkflows(id),
    getArticleComments(id),
    getProfile(),
    getDepartment(deptId),
  ])

  if (!article || article.department_id !== deptId) notFound()

  const isAuthor = article.author_id === user.id

  return (
    <div className="h-full">
      <ArticleEditor
        article={article}
        userRoles={userRoles}
        departmentId={deptId}
        versions={versions}
        workflows={workflows}
        comments={comments}
        isAuthor={isAuthor}
        authorName={profile?.full_name || user.email || 'unknown'}
        deptName={department?.name || ''}
      />
    </div>
  )
}
