# 开发日志 - 南京大学未来编辑部·智慧课程平台

> 新会话时请先读取此文件了解项目当前进度，然后继续开发。

## 项目概述

- **项目名**：nju-future-newsroom
- **路径**：~/Desktop/nju-future-newsroom
- **技术栈**：Next.js 16 + TypeScript + Tailwind CSS 4 + Supabase + Vercel + Cloudflare
- **AI 模型**：DeepSeek V4 Pro
- **编辑器**：Tiptap（计划中）
- **包管理器**：pnpm

## Supabase 配置

- Project URL: https://ubrfibowkpwvirapnkan.supabase.co
- 环境变量已配置在 `.env.local`
- RLS 已启用

## 开发阶段规划

- [x] 第一阶段：项目初始化 + 基础框架
- [ ] 第二阶段：采编审稿系统（Tiptap 编辑器、稿件流程、RLS 数据隔离）
- [ ] 第三阶段：AI 助教模块（DeepSeek API、RAG 知识库）
- [ ] 第四阶段：报道数据库 + 部署上线（Vercel + Cloudflare DNS）

---

## 进度记录

### 2026-06-28 — 第一阶段完成

**已完成：**

1. 开发环境搭建
   - Node.js v24.18.0 (nvm)、pnpm 11.9.0、Git 2.50.1
   - 四大平台账号注册完毕（GitHub、Supabase、Vercel、Cloudflare）

2. 项目初始化
   - `pnpm create next-app` 创建项目（TypeScript、Tailwind、App Router、src 目录）
   - 安装 @supabase/supabase-js、@supabase/ssr

3. Supabase 连接配置
   - `.env.local` 环境变量
   - `src/lib/supabase/client.ts` — 浏览器端客户端
   - `src/lib/supabase/server.ts` — 服务端客户端
   - `src/middleware.ts` — 认证中间件（保护 /dashboard 路由）

4. 页面结构
   - `/` — 首页（全屏背景轮播 + 登录/注册入口）
   - `/login` — 登录页（邮箱+密码）
   - `/register` — 注册页（邮箱注册+确认邮件）
   - `/dashboard` — 主面板（三大模块入口卡片：采编审稿、报道数据库、AI助教）
   - `/auth/callback` — OAuth 回调处理

5. 首页设计
   - 两张编辑部合照作为轮播背景（5秒自动切换，淡入淡出）
   - 深色遮罩(60%) + 白色文字 + drop-shadow 保证可读性
   - 底部指示器可手动切换图片

**待做（下次会话继续）：**

- 将代码推送到 GitHub 建立远程仓库
- 开始第二阶段：采编审稿系统
  - 设计数据库表结构（用户角色、编辑部、稿件）
  - 集成 Tiptap 富文本编辑器
  - 实现稿件 CRUD + 审核流程
  - 配置 RLS 策略实现五个编辑部数据隔离

---

## 项目结构

```
nju-future-newsroom/
├── public/
│   ├── hero-1.jpg          # 编辑部大合照
│   └── hero-2.jpg          # 课堂教学照片
├── src/
│   ├── app/
│   │   ├── page.tsx        # 首页（背景轮播）
│   │   ├── layout.tsx      # 全局布局
│   │   ├── globals.css     # 全局样式
│   │   ├── login/page.tsx  # 登录页
│   │   ├── register/page.tsx # 注册页
│   │   ├── dashboard/
│   │   │   ├── page.tsx    # Dashboard 主页
│   │   │   └── logout-button.tsx # 退出按钮
│   │   └── auth/callback/route.ts # 认证回调
│   ├── lib/supabase/
│   │   ├── client.ts       # 浏览器端 Supabase
│   │   └── server.ts       # 服务端 Supabase
│   └── middleware.ts       # 认证中间件
├── .env.local              # 环境变量（不提交到 Git）
├── package.json
├── tsconfig.json
├── next.config.ts
└── DEVLOG.md               # ← 你现在读的这个文件
```

## 启动命令

```bash
cd ~/Desktop/nju-future-newsroom
pnpm dev
# 访问 http://localhost:3000
```
