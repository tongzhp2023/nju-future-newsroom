-- ============================================
-- 第二阶段：采编审稿系统 - 数据库表结构
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

-- 1. 编辑部表 departments
-- 五个校园媒体：新潮、家书、新天地NewEra、核真录、南新记
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,          -- 英文标识，用于 URL
  description text,
  created_at timestamptz not null default now()
);

-- 插入五个校园媒体
insert into public.departments (name, slug, description) values
  ('新潮',          'xinchao',    '南京大学新潮传媒，以新闻报道和深度评论见长'),
  ('家书',          'jiashu',     '南京大学家书传媒，关注校园人物故事和情感表达'),
  ('新天地NewEra',  'newera',     '南京大学新天地NewEra，聚焦校园文化与生活'),
  ('核真录',        'hezhenlv',   '南京大学核真录，专注事实核查与调查报道'),
  ('南新记',        'nanxinji',   '南京大学南新记，记录南大新闻与校园动态');

-- 2. 用户资料表 profiles
-- 与 auth.users 一对一关联
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  student_id text,                     -- 学号
  role text not null default 'reporter' check (role in ('reporter', 'editor', 'admin')),
  department_id uuid references public.departments(id),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 新用户注册时自动创建 profile（通过触发器）
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. 稿件表 articles
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null default '无标题稿件',
  content jsonb,                       -- Tiptap JSON 格式
  content_text text,                   -- 纯文本版本，用于搜索
  status text not null default 'draft' check (status in ('draft', 'pending', 'revision', 'published', 'archived')),
  author_id uuid not null references public.profiles(id) on delete cascade,
  department_id uuid not null references public.departments(id),
  reviewer_id uuid references public.profiles(id),
  review_comment text,                 -- 审核意见
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. 稿件操作日志 article_logs
-- 记录稿件状态变更历史
create table public.article_logs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  action text not null,                -- 'create', 'edit', 'submit', 'approve', 'reject', 'publish'
  from_status text,
  to_status text,
  comment text,
  created_at timestamptz not null default now()
);

-- 5. 创建索引
create index idx_articles_author on public.articles(author_id);
create index idx_articles_department on public.articles(department_id);
create index idx_articles_status on public.articles(status);
create index idx_articles_created on public.articles(created_at desc);
create index idx_article_logs_article on public.article_logs(article_id);
create index idx_profiles_department on public.profiles(department_id);

-- 6. 自动更新 updated_at 的触发器
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger set_articles_updated_at
  before update on public.articles
  for each row execute function public.update_updated_at();

-- ============================================
-- RLS 策略
-- ============================================

-- 启用 RLS
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.article_logs enable row level security;

-- departments: 所有登录用户可读
create policy "departments_select" on public.departments
  for select to authenticated using (true);

-- profiles: 自己可读写，同编辑部成员可读
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (true);  -- 所有人可看所有 profile（名字/角色信息是公开的）

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid());

-- articles: 基于编辑部的数据隔离
-- 查看：只能看自己编辑部的稿件
create policy "articles_select" on public.articles
  for select to authenticated
  using (
    department_id in (
      select department_id from public.profiles where id = auth.uid()
    )
    or
    -- admin 可以看所有
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 创建：只能在自己的编辑部创建
create policy "articles_insert" on public.articles
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and department_id in (
      select department_id from public.profiles where id = auth.uid()
    )
  );

-- 更新：作者可以更新自己的草稿/修改中的稿件，editor/admin 可以审核
create policy "articles_update" on public.articles
  for update to authenticated
  using (
    -- 作者更新自己的稿件
    (author_id = auth.uid())
    or
    -- editor 审核同编辑部的稿件
    (exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('editor', 'admin')
        and department_id = articles.department_id
    ))
  );

-- 删除：只有作者可以删除自己的草稿
create policy "articles_delete" on public.articles
  for delete to authenticated
  using (
    author_id = auth.uid()
    and status = 'draft'
  );

-- article_logs: 同编辑部可读，操作人可写
create policy "article_logs_select" on public.article_logs
  for select to authenticated
  using (
    article_id in (
      select a.id from public.articles a
      where a.department_id in (
        select department_id from public.profiles where id = auth.uid()
      )
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "article_logs_insert" on public.article_logs
  for insert to authenticated
  with check (user_id = auth.uid());
