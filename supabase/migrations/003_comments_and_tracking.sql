-- ============================================
-- 003: 批注与修订模式支持
-- ============================================

-- 稿件批注表
CREATE TABLE IF NOT EXISTS article_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  -- 批注关联的文本选择范围（ProseMirror pos）
  -- 注意：pos 是文档位置，版本变更后可能失效，仅作参考
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  parent_id UUID REFERENCES article_comments(id) ON DELETE CASCADE, -- 支持回复
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;

-- 所有登录用户可以查看批注
CREATE POLICY "Comments are viewable by authenticated users"
  ON article_comments FOR SELECT
  TO authenticated
  USING (true);

-- 用户可以创建批注
CREATE POLICY "Users can create comments"
  ON article_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- 作者或管理员可以更新批注
CREATE POLICY "Users can update own comments"
  ON article_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id OR auth.uid() = resolved_by);

-- 作者或管理员可以删除批注
CREATE POLICY "Users can delete own comments"
  ON article_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER article_comments_updated_at
  BEFORE UPDATE ON article_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 索引
CREATE INDEX IF NOT EXISTS idx_article_comments_article_id ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent_id ON article_comments(parent_id);
