-- ============================================
-- 第二阶段重构：采编审稿系统 - 数据库大升级
-- 基于 PRD v1.0 需求全面重构
-- ============================================

-- ============================================
-- 一、角色体系升级：reporter/editor/chief_editor/supervisor/admin
-- ============================================

-- 1.1 修改 profiles 表的 role 约束（移除旧的，添加新的）
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('reporter', 'editor', 'chief_editor', 'supervisor', 'admin'));

-- ============================================
-- 二、多编辑部关联表（多对多，一个用户可在不同编辑部担任不同角色）
-- ============================================

CREATE TABLE public.user_department_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('reporter', 'editor', 'chief_editor', 'supervisor', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, department_id, role)
);

CREATE INDEX idx_udr_user ON public.user_department_roles(user_id);
CREATE INDEX idx_udr_department ON public.user_department_roles(department_id);
CREATE INDEX idx_udr_role ON public.user_department_roles(role);

-- ============================================
-- 三、扩展编辑部表：增加选题模板、审批流配置
-- ============================================

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS topic_form_template jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS active_workflow_id uuid;

-- ============================================
-- 四、审批流配置表
-- ============================================

-- 4.1 审批流配置版本
CREATE TABLE public.workflow_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(department_id, version)
);

CREATE INDEX idx_wc_department ON public.workflow_configs(department_id);
CREATE INDEX idx_wc_active ON public.workflow_configs(is_active);

-- 4.2 审批流节点
CREATE TABLE public.workflow_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_config_id uuid NOT NULL REFERENCES public.workflow_configs(id) ON DELETE CASCADE,
  stage_order integer NOT NULL,
  name text NOT NULL,
  role_required text NOT NULL CHECK (role_required IN ('editor', 'chief_editor', 'supervisor')),
  assignee_mode text NOT NULL DEFAULT 'role_based' CHECK (assignee_mode IN ('role_based', 'specific_user')),
  assignee_user_id uuid REFERENCES public.profiles(id),
  is_final boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workflow_config_id, stage_order)
);

CREATE INDEX idx_ws_config ON public.workflow_stages(workflow_config_id);

-- 4.3 为 departments 添加审批流外键
ALTER TABLE public.departments
  ADD CONSTRAINT fk_departments_active_workflow
  FOREIGN KEY (active_workflow_id) REFERENCES public.workflow_configs(id);

-- ============================================
-- 五、选题管理表
-- ============================================

-- 5.1 选题表
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'needs_revision', 'rejected')),
  article_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_topics_department ON public.topics(department_id);
CREATE INDEX idx_topics_author ON public.topics(author_id);
CREATE INDEX idx_topics_status ON public.topics(status);

-- 5.2 选题审批记录
CREATE TABLE public.topic_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL CHECK (action IN ('approve', 'request_revision', 'reject')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tr_topic ON public.topic_reviews(topic_id);

-- ============================================
-- 六、稿件表升级
-- ============================================

-- 6.1 扩展 articles 表
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.topics(id),
  ADD COLUMN IF NOT EXISTS current_stage integer,
  ADD COLUMN IF NOT EXISTS workflow_config_id uuid REFERENCES public.workflow_configs(id),
  ADD COLUMN IF NOT EXISTS report_type text,
  ADD COLUMN IF NOT EXISTS excellence_level integer CHECK (excellence_level BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS excellence_reason text;

-- 6.2 更新 status 约束以支持新状态
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_status_check
  CHECK (status IN ('draft', 'in_review', 'returned', 'published', 'archived'));

-- ============================================
-- 七、稿件版本管理
-- ============================================

CREATE TABLE public.article_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  content jsonb,
  content_text text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  operation_type text NOT NULL CHECK (operation_type IN (
    'reporter_submit', 'editor_revision', 'chief_editor_revision',
    'supervisor_revision', 'reporter_resubmit', 'auto_save'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(article_id, version_number)
);

CREATE INDEX idx_av_article ON public.article_versions(article_id);

-- ============================================
-- 八、稿件审批流转记录
-- ============================================

CREATE TABLE public.article_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  stage_order integer NOT NULL,
  action text NOT NULL CHECK (action IN ('approve', 'return_prev', 'return_reporter', 'publish')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aw_article ON public.article_workflows(article_id);

-- ============================================
-- 九、共性问题表
-- ============================================

CREATE TABLE public.common_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id),
  marked_by uuid NOT NULL REFERENCES public.profiles(id),
  original_text text NOT NULL,
  revision_comment text NOT NULL,
  category text NOT NULL DEFAULT '其他',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ci_department ON public.common_issues(department_id);
CREATE INDEX idx_ci_category ON public.common_issues(category);

-- ============================================
-- 十、站内通知表
-- ============================================

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  content text,
  related_entity_type text,
  related_entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);

-- ============================================
-- 十一、触发器
-- ============================================

-- topics 更新时自动刷新 updated_at
CREATE TRIGGER set_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 十二、RLS 策略
-- ============================================

-- user_department_roles
ALTER TABLE public.user_department_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "udr_select" ON public.user_department_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "udr_insert" ON public.user_department_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    -- 用户可以自助加入编辑部（仅限 reporter 角色）
    (user_id = auth.uid() AND role = 'reporter')
    OR
    -- 编辑部 supervisor/admin 可以添加任何人
    EXISTS (
      SELECT 1 FROM public.user_department_roles existing
      WHERE existing.user_id = auth.uid()
        AND existing.department_id = user_department_roles.department_id
        AND existing.role IN ('supervisor', 'admin')
    )
    OR
    -- 全局 admin 可以添加任何人
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "udr_delete" ON public.user_department_roles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_department_roles udr2
      WHERE udr2.user_id = auth.uid()
        AND udr2.department_id = user_department_roles.department_id
        AND udr2.role IN ('supervisor', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- workflow_configs
ALTER TABLE public.workflow_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wc_select" ON public.workflow_configs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wc_insert" ON public.workflow_configs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_department_roles
      WHERE user_id = auth.uid()
        AND department_id = workflow_configs.department_id
        AND role IN ('supervisor', 'admin')
    )
  );

-- workflow_stages
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_select" ON public.workflow_stages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ws_insert" ON public.workflow_stages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workflow_configs wc
      JOIN public.user_department_roles udr ON udr.department_id = wc.department_id
      WHERE wc.id = workflow_stages.workflow_config_id
        AND udr.user_id = auth.uid()
        AND udr.role IN ('supervisor', 'admin')
    )
  );

-- topics
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topics_select" ON public.topics
  FOR SELECT TO authenticated
  USING (
    department_id IN (
      SELECT department_id FROM public.user_department_roles WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "topics_insert" ON public.topics
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND department_id IN (
      SELECT department_id FROM public.user_department_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "topics_update" ON public.topics
  FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_department_roles
      WHERE user_id = auth.uid()
        AND department_id = topics.department_id
        AND role IN ('supervisor', 'admin')
    )
  );

-- topic_reviews
ALTER TABLE public.topic_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tr_select" ON public.topic_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tr_insert" ON public.topic_reviews
  FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- article_versions
ALTER TABLE public.article_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "av_select" ON public.article_versions
  FOR SELECT TO authenticated
  USING (
    article_id IN (
      SELECT id FROM public.articles
      WHERE department_id IN (
        SELECT department_id FROM public.user_department_roles WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "av_insert" ON public.article_versions
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- article_workflows
ALTER TABLE public.article_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aw_select" ON public.article_workflows
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "aw_insert" ON public.article_workflows
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- common_issues
ALTER TABLE public.common_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ci_select" ON public.common_issues
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ci_insert" ON public.common_issues
  FOR INSERT TO authenticated
  WITH CHECK (marked_by = auth.uid());

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notif_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 十三、更新现有 articles 的 RLS 策略
-- ============================================

-- 删除旧的 articles RLS 策略
DROP POLICY IF EXISTS "articles_select" ON public.articles;
DROP POLICY IF EXISTS "articles_insert" ON public.articles;
DROP POLICY IF EXISTS "articles_update" ON public.articles;
DROP POLICY IF EXISTS "articles_delete" ON public.articles;

-- 新的 articles RLS：基于 user_department_roles 多对多关系
CREATE POLICY "articles_select_v2" ON public.articles
  FOR SELECT TO authenticated
  USING (
    department_id IN (
      SELECT department_id FROM public.user_department_roles WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "articles_insert_v2" ON public.articles
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND department_id IN (
      SELECT department_id FROM public.user_department_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "articles_update_v2" ON public.articles
  FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_department_roles
      WHERE user_id = auth.uid()
        AND department_id = articles.department_id
        AND role IN ('editor', 'chief_editor', 'supervisor', 'admin')
    )
  );

CREATE POLICY "articles_delete_v2" ON public.articles
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    AND status = 'draft'
  );

-- ============================================
-- 十四、为每个编辑部创建默认的三级审批流
-- ============================================

-- 使用 DO 块为每个编辑部初始化默认审批流
DO $$
DECLARE
  dept RECORD;
  wc_id uuid;
BEGIN
  FOR dept IN SELECT id FROM public.departments LOOP
    -- 创建默认审批流配置
    INSERT INTO public.workflow_configs (department_id, version, is_active, description)
    VALUES (dept.id, 1, true, '默认三级审批流：责编审核 → 主编审核 → 老师终审签发')
    RETURNING id INTO wc_id;

    -- 创建三个审批节点
    INSERT INTO public.workflow_stages (workflow_config_id, stage_order, name, role_required, is_final)
    VALUES
      (wc_id, 1, '责编审核', 'editor', false),
      (wc_id, 2, '主编审核', 'chief_editor', false),
      (wc_id, 3, '老师终审签发', 'supervisor', true);

    -- 设置编辑部的活跃审批流
    UPDATE public.departments SET active_workflow_id = wc_id WHERE id = dept.id;
  END LOOP;
END $$;
