import { getProfile, getMyDepartmentRoles } from '@/lib/actions'

export default async function AITutorPage() {
  const [profile, deptRoles] = await Promise.all([
    getProfile(),
    getMyDepartmentRoles(),
  ])

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">AI 助教</h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          基于 DeepSeek 的智能写作辅助，提供新闻写作建议、事实核查、语言润色等功能
        </p>
      </div>

      {/* 功能卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <FeatureCard
          icon="edit"
          title="写作辅助"
          description="智能分析稿件结构，提出改进建议，优化新闻写作逻辑与表达"
          status="coming"
        />
        <FeatureCard
          icon="check"
          title="事实核查"
          description="交叉验证稿件中的关键事实、数据和引用，标记潜在不准确信息"
          status="coming"
        />
        <FeatureCard
          icon="sparkle"
          title="语言润色"
          description="AI 辅助语言优化，提升文章可读性，符合新闻报道规范"
          status="coming"
        />
        <FeatureCard
          icon="search"
          title="选题推荐"
          description="基于热点趋势和编辑部历史选题，推荐有价值的新闻报道方向"
          status="coming"
        />
      </div>

      {/* 占位说明 */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">AI 助教即将上线</h3>
        <p className="text-sm text-[var(--muted)] max-w-md mx-auto leading-relaxed">
          我们正在接入 DeepSeek V4 Pro 模型，打造专属新闻写作智能助教。届时将提供写作建议、事实核查、语言润色等丰富功能，敬请期待。
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface-active)] text-xs text-[var(--muted)]">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          开发中 · 预计第六阶段上线
        </div>
      </div>

      {/* 已加入编辑部提示 */}
      {deptRoles.length > 0 && (
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl p-4">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <span className="font-medium">提示：</span>
            AI 助教上线后，将根据你所在的编辑部（{deptRoles.map(dr => dr.department.name).join('、')}）提供定制化的写作指导。
          </p>
        </div>
      )}
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  status,
}: {
  icon: string
  title: string
  description: string
  status: 'coming' | 'active'
}) {
  const icons: Record<string, React.ReactNode> = {
    edit: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
      </svg>
    ),
    check: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    sparkle: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    search: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-5 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-[var(--surface-active)] flex items-center justify-center text-[var(--foreground)]">
          {icons[icon]}
        </div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {status === 'coming' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 font-medium">
            即将上线
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--muted)] leading-relaxed">{description}</p>
    </div>
  )
}
