# 开发日志 - 南京大学未来编辑部·智慧课程平台

> 新会话时请先读取此文件了解项目当前进度，然后继续开发。

## 项目概述

- **项目名**：nju-future-newsroom
- **路径**：~/Desktop/nju-future-newsroom
- **GitHub**：https://github.com/tongzhp2023/nju-future-newsroom
- **技术栈**：Next.js 16 + TypeScript + Tailwind CSS 4 + Supabase + Vercel + Cloudflare
- **AI 模型**：DeepSeek V4 Pro
- **编辑器**：Tiptap 3.27（已集成）
- **包管理器**：pnpm
- **数据库直连**：`postgresql://postgres:87cwlArk!tzp@db.ubrfibowkpwvirapnkan.supabase.co:5432/postgres`

## Supabase 配置

- Project URL: https://ubrfibowkpwvirapnkan.supabase.co
- 环境变量已配置在 `.env.local`
- RLS 已启用
- service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicmZpYm93a3B3dmlyYXBua2FuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjYzNDYwMCwiZXhwIjoyMDk4MjEwNjAwfQ._8M1D-A-1AJPPJqjBlZe8gkCszd7FBEWlXnVhHUHtPo

## 编辑部（校园媒体）

五个校园媒体，已正确录入数据库：
- **新潮** (xinchao) — 新闻报道和深度评论
- **家书** (jiashu) — 人物故事和情感表达
- **新天地NewEra** (newera) — 校园文化与生活
- **核真录** (hezhenlv) — 事实核查与调查报道
- **南新记** (nanxinji) — 南大新闻与校园动态

## 开发阶段规划

- [x] 第一阶段：项目初始化 + 基础框架
- [x] 第二阶段：采编审稿系统（PRD v1.0 第一阶段 — 基础框架与核心流程）
- [x] 第三阶段：UI/UX 大改版（侧边栏重构 + 专业报题单 + 选题-稿件联动）
- [x] 第三阶段续：UI 简约化重构（去南大紫 → Light/Dark 双模式 + 侧边栏收起 bug 修复 + 选题表单 fallback）
- [x] 第三阶段末：UI 精细化调整（全宽顶栏布局 + Dark Mode 修复 + 草稿功能 + 退出编辑部 + 头像下拉）
- [x] 第四阶段：富文本编辑器增强（Track Changes、批注模式、Word 上传解析、参考飞书/学城）+ 侧边栏模块页面补全
- [ ] 第五阶段：采编审稿系统补全（共性问题/优秀稿件展示、数据大屏、报道归档）
- [ ] 第六阶段：AI 助教模块（DeepSeek API、RAG 知识库）
- [ ] 第七阶段：报道数据库 + 部署上线（Vercel + Cloudflare DNS）

---

## 测试账号

> 所有测试账号均已加入**南新记**编辑部（department_id: `78aa3126-dacd-4269-a4e9-924b3fc13ca2`）

| 角色 | 邮箱 | 密码 | 姓名 | 说明 |
|------|------|------|------|------|
| 学生记者 (reporter) | 2500914533@qq.com | Test123456 | 童展鹏 | 可申报选题、写稿、修改稿件 |
| 责任编辑 (editor) | editor_test@nju.edu.cn | Editor@2024 | 测试责编 | 可审核稿件、修订批注 |
| 主编 (chief_editor) | chief_editor_test@nju.edu.cn | ChiefEditor@2024 | 张文华 | 高级审核 |
| 指导老师 (supervisor) | supervisor_test@nju.edu.cn | Supervisor@2024 | 李明远 | 终审签发、选题审批 |

---

## 进度记录

### 2026-07-03（第十六轮）— A4 分页 + 格式刷修复 + 字体扩充 + 段落面板 + 表格右键菜单 + 气泡工具栏重设计

**系统性修复了用户反馈的全部 9 项问题**，引入社区分页扩展实现 A4 自动分页，重写了格式刷、段落面板、表格菜单和气泡工具栏。

#### A4 分页（tiptap-community-pages）

安装社区免费分页扩展 `tiptap-community-pages`（MIT 协议），替换此前的静态 A4 div 方案：

- `Pagination` 扩展：自动计算内容高度并插入分页符，内容跨页流动
- `PageBreak` 扩展：`Ctrl+Enter` 手动分页
- `<PageWrapper>` React 组件：渲染 A4 纸页视觉效果（794×1123px，灰底间隙，阴影）
- 页边距按钮通过 `editor.commands.setMargins()` 动态切换 4 种预设
- `globals.css` 添加 `tiptap-community-pages/styles.css` 引入

#### 格式刷重写（mousedown → mouseup 架构）

旧方案使用 `onSelectionUpdate` 事件响应选区变化，无法正确处理拖拽选择。新方案：

- 在 `editorProps.handleDOMEvents.mouseup` 中检测选区并应用格式
- `requestAnimationFrame` 延迟确保 ProseMirror 先更新选区
- 双击格式刷按钮 → 锁定模式（对应状态 `formatPainterLocked`）
- 再次单击格式刷按钮（toggle）或按 ESC → 随时取消
- `painterRef` 跨渲染周期保持格式刷状态，避免闭包过期

#### 字体库扩充（25 款）

扫描 5 个字体目录提取可用字体文件：
- WPS 自带：`FangS-SC.ttf`（仿宋）、`HYKaiTiJ.ttf`（汉仪楷体）、`HYQiHei-55J.ttf`（汉仪旗黑）、`HYZhongJianHeiJ.ttf`（汉仪中简黑）、`ShuS-SC.ttf`（书宋）
- 系统字体：`Songti.ttc`（宋体）、`STHeiti`（华文黑体）、`Hiragino Sans GB`（冬青黑体）
- 西文：Arial, Times New Roman, Georgia, Verdana, Courier New, Tahoma, Trebuchet MS, Impact, Comic Sans MS, Helvetica, Futura, Gill Sans, Didot, Baskerville, Palatino, Copperplate

全部配置完整的 CSS font-family fallback 链。

#### 段落面板重设计

将原来的行距下拉扩展为 5 区完整段落面板（参考 Word 段落对话框）：

| 区 | 功能 | 单位 |
|---|---|---|
| 行距 | 单倍/1.5/2.0/2.5/3.0 按钮组 | — |
| 段前间距 | 0/0.5/1/1.5/2/2.5/3 按钮组 | 行 |
| 段后间距 | 0/0.5/1/1.5/2/2.5/3 按钮组 | 行 |
| 首行缩进 | 0/0.5/1/1.5/2 按钮组 | 字符 |
| 左右缩进 | 减少/增加两个按钮 | — |

通过 `editor.chain().focus().updateAttributes('paragraph', { marginTop: '2em' })` 直接修改段落属性。

#### 无序/有序列表修复

根因：StarterKit 中默认启用的列表扩展与其他扩展冲突。修复方案：
- 安装独立包 `@tiptap/extension-bullet-list`、`@tiptap/extension-ordered-list`、`@tiptap/extension-list-item`
- 在 StarterKit 中显式禁用列表（`bulletList: false, orderedList: false, listItem: false`）
- 单独注册以确保正确的加载顺序

#### 任务列表 CSS 修复

Tiptap taskItem DOM 结构为 `<li data-type="taskItem"><label><input/><span/></label><div><p/></div></li>`。修复 CSS：
- `li[data-type=taskItem]` → `!flex !items-start gap-2`
- `label` → `!inline-flex !items-center`
- `div`（内容容器）→ `!flex-1`

#### 表格右键菜单

替换悬浮气泡菜单为原生右键响应：
- `handleDOMEvents.contextmenu` 检测点击位置是否在表格内
- `TextSelection.near()` 聚焦到表格内位置
- 固定定位 `<div>` 渲染右键菜单，包含 11 个操作项（分隔线分组）
- 点击空白处（`handleClick`）或 ESC 关闭

表格列宽拖拽通过 `Table.configure({ resizable: true })` 已内置支持。

#### 气泡工具栏重设计

**上气泡栏**（选中文字浮现）新增：格式刷、清除格式、字号下拉（五号-六号）、字体下拉（前10款）、文字颜色(70色)、背景色(70色)、高亮、上标/下标。删除行内代码。保留 B/I/S/U、链接。

**下气泡栏**（内联批注浮窗）删除超链接按钮，仅保留批注（注¹）和字数显示。

#### 独立缩进按钮删除

工具栏中独立的减少缩进/增加缩进按钮移除，功能移入段落面板「左右缩进」区域。

#### 已删除的功能（汇总）

视频、iframe 嵌入网页、引用块、文字方向、源码视图、独立缩进/反缩进按钮 — 共 6 项。

#### 新增依赖

- `tiptap-community-pages` — A4 分页（MIT）
- `@tiptap/extension-bullet-list` — 无序列表
- `@tiptap/extension-ordered-list` — 有序列表
- `@tiptap/extension-list-item` — 列表项

#### 新增文件

- `src/components/tiptap/table-bubble-menu.tsx` — 表格右键菜单组件

#### 删除文件

- `src/lib/tiptap-extensions/video.ts`
- `src/lib/tiptap-extensions/iframe.ts`
- `src/lib/tiptap-extensions/text-direction.ts`

#### 修改文件

- `src/components/tiptap/types.ts` — 字体库扩充（25款）+ 段前段后/首行缩进常量 + 页边距像素值
- `src/components/tiptap/icons.tsx` — 新增 EraserIcon/ParagraphIcon/MarginIcon
- `src/components/tiptap/extensions.ts` — Pagination/PageBreak 注册 + 列表显式注册
- `src/components/tiptap/index.tsx` — PageWrapper 集成 + mouseup 格式刷 + 右键菜单 + 页边距命令
- `src/components/tiptap/toolbar.tsx` — 段落面板重设计 + 字体列表扩充 + 删除缩进按钮
- `src/components/tiptap/bubble-menu.tsx` — 上气泡栏 15 工具 + 下气泡栏精简
- `src/app/globals.css` — 任务列表 CSS 修复
- `src/lib/tiptap-extensions/attachment.ts` — `type` → `fileType` 类型修正
- `package.json` — +4 依赖

#### 技术要点

- `tiptap-community-pages` 的 `PageWrapper` 和 `Pagination` 扩展需要 margin 配置一致：`PageWrapper` 负责视觉渲染，`Pagination` 负责内容分页计算
- ProseMirror `handleDOMEvents.mouseup` 在 `handleDOMEvents.click` 之后触发，适合格式刷"选完再刷"的交互模式
- `TextSelection.near($pos)` 创建离指定位置最近的合法文本选区，避免表格节点内选区越界
- 段落间距通过 `updateAttributes('paragraph', { marginTop: '2em' })` 实现，`em` 单位相对于当前段落字号
- `onSelectionUpdate` 中检测 contenteditable 区域变化时，`closest('.ctp-pages-breaks')` 替代 `.editor-scroll-area` 以适配分页 DOM 结构
- `next build` 零 TypeScript 错误

---

### 2026-07-02（第十五轮）— 编辑器模块化重构 + Word 风格 UI + 工具栏全面升级

**对富文本编辑器进行了全面重构**，从 635 行单文件拆分为 7 个模块化组件，升级工具栏至 40+ 按钮覆盖 Word 级别功能，重设计 UI 为 Word 风格灰底白页布局。

#### 编辑器模块化重构

原来 `src/components/tiptap-editor.tsx`（635 行，工具栏/图标/编辑器/扩展混在一起）拆分为：

```
src/components/tiptap/
  index.tsx          — 主组件（useEditor + 状态管理）
  toolbar.tsx        — 完整工具栏（40+ 按钮，分组排列）
  bubble-menu.tsx    — 选中文字气泡菜单
  extensions.ts      — 所有扩展集中配置
  types.ts           — 类型 + 常量（字号/字体/行距/调色板）
  icons.tsx          — 20+ SVG 图标组件
  color-picker.tsx   — 70 色调色板
```

#### 工具栏升级（新增 11 项功能）

| 新增功能 | 实现方式 |
|---|---|
| 字体族下拉（10 款中英文字体） | TextStyleKit 内置 FontFamily |
| 行距选择（7 档） | TextStyleKit 内置 LineHeight |
| 高亮按钮 | `@tiptap/extension-highlight`（扩展已有，缺按钮） |
| 视频插入 | 自定义 Video 节点扩展 |
| 附件上传 | 自定义 Attachment 节点扩展 |
| 网页嵌入（iframe） | 自定义 Iframe 节点扩展 |
| 标注块（Callout） | 自定义 Callout 节点（info/warning/tip/danger） |
| 双栏布局 | 自定义 Columns + Column 节点 |
| 查找替换 | 自定义 SearchReplace 插件 + 工具栏内联输入栏 |
| 源码视图 | JSON 源码 ↔ 富文本切换 |
| 气泡菜单 | 选中文字浮窗（加粗/斜体/下划线/删除线/链接/清除格式） |

全部 Text Style 功能（Color/BackgroundColor/FontFamily/FontSize/LineHeight）通过 Tiptap v3 的 `TextStyleKit` 一个扩展统一提供。

#### 自定义扩展（8 个新文件）

```
src/lib/tiptap-extensions/
  video.ts            — 视频节点（支持 src/width/height）
  iframe.ts           — 网页嵌入节点
  attachment.ts       — 文件附件节点（下载链接卡片）
  callout.ts          — 标注块（ℹ️/⚠️/💡/🚫 四种样式）
  search-replace.ts   — 查找替换 ProseMirror 插件（高亮匹配+全部替换）
  column.ts           — 双栏/多栏布局（Columns + Column 嵌套节点）
  text-direction.ts   — 文字方向（LTR/RTL）
```

#### Word 风格 UI 重设计

- **灰底白页**：外层 `bg-gray-100`，内层 `bg-white` 纸页效果（`shadow-md` + `border-gray-200`）
- **宽度扩大**：`max-w-3xl`（768px）→ `max-w-4xl`（896px）
- **纸页高度**：`min-h-[800px]` 保证 Word 页面感
- **内边距**：`px-10 py-10` 适当的文字边距

#### 焦点黑框修复

**根因**：`globals.css:110` 的全局无障碍规则 `:focus-visible { outline: 2px solid var(--accent) }` 作用于所有元素，Tiptap 编辑器的多处 `outline-none` 无法覆盖（Tailwind 的 `outline-none` 实际设置 `outline: 2px solid transparent`，CSS 优先级低于全局选择器）。

**修复**：在 `globals.css` 中新增特定选择器 `.tiptap:focus-visible, .tiptap :focus-visible, .ProseMirror:focus-visible, .ProseMirror :focus-visible { outline: none; }`，覆盖全局焦点环规则。

#### 表格 CSS 补全

Tiptap 生成的 `<table>` 结构此前无样式，插入表格后不可见。在 EditorContent 的 Tailwind className 中补全表格样式：
- `border-collapse` + `w-full` + `my-4`
- `th`：边框 + 灰底 + 内边距 + 左对齐 + 粗体
- `td`：边框 + 内边距
- `selectedCell`：蓝色高亮
- Dark mode 下的边框色适配

#### 依赖清理

- 卸载 `reactjs-tiptap-editor`（-299 个包），消除 Excalidraw/Mermaid/Yjs/KaTeX 等不需要的重量依赖
- 删除旧 `src/components/tiptap-editor.tsx`（635 行单文件）
- 移除自定义 `line-height.ts`（TextStyleKit 已内置）

#### 保留现有的 Word 导入/导出

项目已有一套质量良好的 Word 导入导出实现：
- 导入：`word-upload-button.tsx` + `/api/parse-doc`（XML + textutil）
- 导出：`article-editor.tsx` 中的 `handleExportWord`（docx + file-saver）
- 这些保留不动，不引入新版本的导入导出

#### 修改文件

- `src/components/tiptap/index.tsx` — **新增**，主编辑器组件
- `src/components/tiptap/toolbar.tsx` — **新增**，完整工具栏
- `src/components/tiptap/bubble-menu.tsx` — **新增**，气泡菜单
- `src/components/tiptap/extensions.ts` — **新增**，扩展配置
- `src/components/tiptap/types.ts` — **新增**，类型和常量
- `src/components/tiptap/icons.tsx` — **新增**，SVG 图标
- `src/components/tiptap/color-picker.tsx` — **新增**，调色板
- `src/lib/tiptap-extensions/video.ts` — **新增**
- `src/lib/tiptap-extensions/iframe.ts` — **新增**
- `src/lib/tiptap-extensions/attachment.ts` — **新增**
- `src/lib/tiptap-extensions/callout.ts` — **新增**
- `src/lib/tiptap-extensions/search-replace.ts` — **新增**
- `src/lib/tiptap-extensions/column.ts` — **新增**
- `src/lib/tiptap-extensions/text-direction.ts` — **新增**
- `src/app/globals.css` — 编辑器焦点环例外规则
- `src/app/dashboard/dept/[deptId]/articles/[id]/edit/article-editor.tsx` — 更新导入路径
- `package.json` — 移除 reactjs-tiptap-editor
- `pnpm-lock.yaml` — 更新

#### 技术要点

- Tiptap v3 中 `BubbleMenu` 从 `@tiptap/react/menus` 导入（非 `@tiptap/react`），使用 `options` prop 替代 `tippyOptions`
- `TextStyleKit` 一个扩展即可提供 Color/BackgroundColor/FontFamily/FontSize/LineHeight 全部功能
- `@tiptap/extension-color` 在 v3 中实际是 `@tiptap/extension-text-style` 的 re-export
- Tailwind `outline-none` 设置的是 `outline: 2px solid transparent`，无法覆盖 CSS 文件中 `:focus-visible` 选择器的 `outline: 2px solid var(--accent)`，必须用更具体的选择器
- `max-w-3xl` = 768px, `max-w-4xl` = 896px, `max-w-5xl` = 1024px
- ProseMirror 的 `ProseMirror-focused` class 在编辑器获得焦点时自动添加，可用于焦点样式定制
- `next build` 零 TypeScript 错误，仅 `/login` 页面因 Supabase 环境变量缺失导致预渲染错误（已有问题）

---

### 2026-07-02（第十四轮）— 修订模式 Bug 修复：编号优化 + 撤销同步 + IME 新段落 + 红色修订显示

**修复了修订模式的四个关键 Bug**，并优化了修订编号的视觉呈现，使修订模式达到可用的生产质量。

#### Bug 1：新增文本不显示红色修订状态

**问题**：在修订模式下输入文字（尤其是中文 IME 输入），新增文本不显示红色下划线修订标记。

**根因**：`appendTransaction` 中存在过滤条件 `if (rs.from !== rs.to && !compositionJustEnded) continue`，跳过了 IME reconciliation 步骤中 `from < to` 的替换操作（ProseMirror 在 IME 结束后产生的替换步骤）。同时 `compositionJustEnded` 超时仅 50ms，部分 IME 引擎的 reconciliation 在此窗口之后才到达。

**修复**：移除该过滤条件，使所有 `sliceSize > 0` 的步骤都被处理；将 `compositionJustEnded` 超时从 50ms 提升到 100ms。

#### Bug 2：撤销操作后修订记录不同步消失

**问题**：撤销（Ctrl+Z / 工具栏撤销按钮）已输入的修订内容后，文档中的红色标记消失了，但右侧修订面板中的修订记录仍然存在。

**根因**：两个层面的问题。

第一层：`appendTransaction` 中的修订同步逻辑只检查 `tr.getMeta('addToHistory') === false` 来检测 undo 事务，但 ProseMirror history 插件产生的 undo 事务**不带**此 meta，而是带 `history$` meta。导致 undo 后的文档变化不触发修订记录清理。

第二层：`filterTransaction` 中没有放行 undo/redo 事务。undo 撤销一个插入操作时，其底层步骤是一个删除操作（`ReplaceStep` with `from < to`），被 `filterTransaction` 当作普通删除拦截（返回 `false`），导致撤销操作本身被阻止。

**修复**：
- 在 `filterTransaction` 中添加 `if (tr.getMeta('history$')) return true`，放行所有 undo/redo 事务
- 在 `appendTransaction` 中将窄范围的 undo 检测改为通用的 `anyDocChanged` 检测——每次文档变化后，通过 `collectRevisionIds(newState.doc)` 扫描文档中现存的所有 revisionId，与 `trackChangesState.revisions` 比对，自动移除已不存在的修订记录
- 当修订同步发生但没有用户输入事务时，返回一个仅带 meta 的 transaction（`newTr.setMeta(trackChangesPluginKey, true)`）触发 decoration plugin 刷新

#### Bug 3：修订面板编号与文档正文无法对应

**问题**：修订面板中每条修订记录有 ①②③ 编号，但文档正文中没有对应的编号标记，用户无法将面板记录和文档位置一一对应。

**修复**：新增 ProseMirror Decoration 插件（`trackChangesDecoKey`），通过 `Decoration.widget()` 在每个修订范围起始位置插入内联上标编号。使用 `collectRevisionRanges()` 查找每个 revisionId 在文档中的位置范围，取第一个位置插入 widget decoration。

编号使用 Unicode 圆圈数字符号（①②③…⑳），比纯数字视觉干扰更小。CSS 样式为红色上标（`font-size: 0.65em; vertical-align: super; color: #dc2626`），修订面板中的编号也同步改为圆圈符号，两侧一一对应。

#### Bug 4：新起一行（回车后）中文 IME 输入不显示红色修订标记

**问题**：在修订模式下按回车新建段落，然后用中文输入法输入文字，新段落的文本不显示红色修订标记。英文直接键盘输入在新段落中正常。

**根因**：IME composition 期间 `isComposing = true`，`appendTransaction` 直接返回 `null` 跳过处理。composition 结束后 ProseMirror 产生的 reconciliation transaction 有时在 `compositionJustEnded` 窗口之外到达，或者在新段落中 reconciliation 步骤的映射行为不同，导致 `appendTransaction` 未能给新文本添加 `trackInsert` mark。

**修复**：在 `compositionEnd` 回调中新增延迟扫描机制。`compositionStart` 时记录光标位置（`compositionStartPos`），`compositionEnd` 后 150ms（确保 ProseMirror 完成 DOM reconciliation）检查从 compositionStart 位置到当前光标位置的范围内是否有未标记 `trackInsert` 的文本节点。如果有，主动创建 transaction 添加 `trackInsert` mark 并记录修订。使用 `INSERT_MERGE_WINDOW` 合并连续的 IME 输入为同一条修订记录。

#### 修改文件

- `src/lib/tiptap-extensions/track-changes.ts` — 四处关键修改：(1) 移除 appendTransaction 中 IME 替换步骤过滤条件；(2) filterTransaction 添加 `history$` meta 放行 + appendTransaction 通用修订同步逻辑；(3) 新增 Decoration 插件渲染内联编号；(4) compositionEnd 延迟扫描补标记
- `src/app/globals.css` — `.track-revision-badge` 样式改为轻量红色上标（去掉圆形背景）
- `src/app/dashboard/dept/[deptId]/articles/[id]/edit/article-editor.tsx` — 修订面板编号从数字改为圆圈符号

#### 技术要点

- ProseMirror history 插件的 undo 事务通过 `tr.getMeta('history$')` 识别，而**不是** `tr.getMeta('addToHistory') === false`
- undo 撤销插入操作时，底层步骤是 `ReplaceStep`（删除操作），会被 `filterTransaction` 拦截，必须显式放行
- `Decoration.widget(pos, toDOM, { side: -1 })` 在指定位置插入 DOM 元素，`side: -1` 使其显示在该位置文本之前
- `DecorationSet` 在 plugin state 中管理，通过 `apply` 方法响应 `tr.docChanged` 或 meta 变化自动重建
- IME `compositionstart` 事件中可通过 `view.state.selection.from` 获取 composition 开始时的光标位置
- `compositionend` 后 ProseMirror DOM reconciliation 的时序不确定，使用 `setTimeout(fn, 150)` 确保足够的等待窗口
- Unicode 圆圈数字 ①(U+2460) 到 ⑳(U+2473) 均在 BMP 范围内，JavaScript 字符串索引可正常取用

---

### 2026-07-01（第十一轮）— 修订模式增强：接受/拒绝 + 持久化 + 导航

**对修订模式进行了全面增强**，实现了 WPS/Word 修订模式的核心交互能力（逐条接受/拒绝、全部接受/拒绝），解决了删除修订不持久化的根本问题，并新增了修订面板点击导航功能。

#### 删除操作持久化重构（核心架构变更）

原方案中删除操作使用 ProseMirror `Decoration.widget()` 在删除位置渲染 `<del>` 元素，文本从文档中真正删除。这导致保存到数据库后删除的文本和修订记录都丢失，刷新页面后无法恢复。

新方案改为：删除操作发生后，在 `appendTransaction` 中将被删除的文本重新插入到原位（或插入内容之后），并添加 `trackDelete` mark。文本保留在文档中，以红色删除线 + 半透明背景展示。保存时 `trackDelete` mark 随文档 JSON 一起持久化到数据库，刷新页面后可完整恢复。

具体实现：
- 在 `appendTransaction` 中，对每个 `ReplaceStep` 的删除部分（`from < to`），提取被删除的文本（`oldState.doc.textBetween`）
- 计算重新插入位置：纯删除时为删除点（`tr.mapping.map(rs.from, -1)`），替换时为插入内容之后（`mappedFrom + sliceSize`）
- 使用 `newTr.insertText()` 重新插入文本，然后 `newTr.addMark()` 添加 `trackDelete` mark
- 按 position 降序处理多个操作，确保重新插入不影响前面操作的位置

#### 接受/拒绝修订

实现了完整的修订操作能力，与 WPS/Word 修订模式交互一致：

**接受修订（acceptRevision）**：
- 插入：移除 `trackInsert` mark（文本保留为正常内容）
- 删除：删除 `trackDelete` 标记的文本（真正从文档中移除）
- 替换：同时执行上述两个操作

**拒绝修订（rejectRevision）**：
- 插入：删除 `trackInsert` 标记的文本（撤销插入）
- 删除：移除 `trackDelete` mark（文本恢复为正常内容）
- 替换：同时执行上述两个操作

**全部接受/拒绝（acceptAllRevisions / rejectAllRevisions）**：扫描文档中所有 `trackInsert` 和 `trackDelete` marks，按 position 降序批量处理，一次性完成所有修订的接受或拒绝。

所有操作通过 `tr.setMeta(trackChangesPluginKey, true)` 标记为插件自身 transaction，防止 `appendTransaction` 重复处理。同时设置 `addToHistory: true` 支持撤销/重做。

#### 修订记录持久化恢复（restoreRevisionsFromDoc）

编辑器初始化时调用 `restoreRevisionsFromDoc(editor)`，扫描文档中所有 `trackInsert` 和 `trackDelete` marks，从 mark 属性（`revisionId`、`author`、`timestamp`）重建修订记录列表。

对于替换操作（同一个 `revisionId` 同时存在于 `trackInsert` 和 `trackDelete` marks），合并为单条 "replace" 类型的修订记录。按 `timestamp` 排序后逐条添加到 `trackChangesState.revisions`。

使用 `restoredRef` 确保仅在编辑器首次创建时执行一次，避免 Word 上传等内容更新时重复触发。

#### 修订面板导航

点击修订面板中的任意修订记录，自动跳转到文档中对应位置：
- 通过 `doc.descendants()` 扫描文档，查找匹配 `revisionId` 的 mark 位置
- 使用 `editor.chain().setTextSelection()` 选中文本
- 计算选区坐标，滚动编辑器容器使修订位置可见（`scrollTo({ behavior: 'smooth' })`）

#### 修订面板 UI 重设计

右侧边栏"修订"标签页全面重设计：
- 顶部固定操作栏：当有修订记录时显示"全部接受"（绿色）和"全部拒绝"（红色边框）按钮
- 每条修订记录新增"接受"和"拒绝"按钮（底部并排）
- 修订记录可点击（`cursor-pointer` + hover 效果），点击跳转到文档对应位置
- 按钮区域 `stopPropagation` 防止点击按钮时触发导航
- 空状态提示优化：根据 `trackChangesEnabled` 状态显示不同提示文案

#### CSS 样式更新

`track-delete` 样式从 Decoration widget 适配改为文档内 mark 适配：
- 移除 `cursor: default`（文本现在在文档中，需要正常光标交互）
- 添加浅红色背景 `rgba(220, 38, 38, 0.06)` 增强视觉区分
- Dark 模式添加 `rgba(248, 113, 113, 0.08)` 背景
- `opacity` 从 0.5 调整为 0.6

#### 修改文件

- `src/lib/tiptap-extensions/track-changes.ts` — 全面重写：移除 Decoration 方案，删除操作改为保留文本+mark；新增 acceptRevision/rejectRevision/acceptAllRevisions/rejectAllRevisions/navigateToRevision/restoreRevisionsFromDoc 函数
- `src/components/tiptap-editor.tsx` — 新增 restoreRevisionsFromDoc 调用（编辑器初始化时恢复修订记录）
- `src/app/dashboard/dept/[deptId]/articles/[id]/edit/article-editor.tsx` — 修订面板 UI 重设计（接受/拒绝按钮、全部接受/拒绝、点击导航）
- `src/app/globals.css` — track-delete 样式更新（移除 cursor:default，添加背景色）

### 2026-07-01（第十三轮）— 修复中文输入法（IME）乱码 + 光标跳动 Bug

修复了两个影响编辑体验的关键 Bug：修订模式下中文输入法产生乱码（"我的" → "wwode的"），以及编辑时光标跳到文末。

#### 中文 IME 输入乱码修复

**问题**：修订模式下用中文输入法输入"我的"（拼音 wode），输出变为"wwode的"——拼音字母和汉字混在一起，且拼音字母也被标记为修订插入。

**根因**：ProseMirror 的 IME 处理分两个阶段。第一阶段（composition 进行中），每输入一个拼音字母都会产生一个 ReplaceStep 交易，`appendTransaction` 对每个中间态字母添加了 `trackInsert` mark，在 DOM 中插入 `<ins>` 元素，破坏了浏览器的 composition 会话。第二阶段（composition 结束后），ProseMirror 创建一个 reconciliation 交易（删除拼音+插入汉字），但此时 `filterTransaction` 会拦截这个含删除的 ReplaceStep，将拼音当作"修订删除"保留，最终拼音和汉字混在一起。

**修复方案**：通过 ProseMirror Plugin 的 `view` 方法在编辑器 DOM 上监听 `compositionstart` / `compositionend` 事件，用两个标志变量追踪 IME 状态：

- `isComposing`（composition 进行中）：`filterTransaction` 放行所有交易，`appendTransaction` 直接返回 null，不对任何中间态文本添加标记
- `compositionJustEnded`（composition 刚结束，持续一帧）：`filterTransaction` 放行 reconciliation 交易（不追踪拼音删除），`appendTransaction` 处理 ReplaceStep 的插入部分（给最终汉字添加 trackInsert mark）

关键代码结构：
```typescript
view(view) {
  const dom = view.dom
  dom.addEventListener('compositionstart', () => { isComposing = true })
  dom.addEventListener('compositionend', () => {
    isComposing = false
    compositionJustEnded = true
    requestAnimationFrame(() => { compositionJustEnded = false })
  })
  return { destroy() { isComposing = false; compositionJustEnded = false } }
}
```

`appendTransaction` 的处理逻辑也相应调整：原来只处理纯插入（`from === to`），现在还处理 `compositionJustEnded` 状态下的替换操作（`from < to`），即 IME reconciliation 交易中的插入部分。

#### 光标跳到文末 Bug 修复

**问题**：在编辑器中输入文字后，光标自动跳到文档最后一行。

**根因**：内容属性反馈循环。`onUpdate` 回调 → `onChange` → 父组件 `setContent(json)` → 新的 `content` prop → `useEffect` 检测到 `content` 变化 → `editor.commands.setContent(content)` → 光标重置到文末。

**修复**：在 `tiptap-editor.tsx` 中添加 `isInternalChange` ref。`onUpdate` 回调中设置 `isInternalChange.current = true`，`useEffect` 检测到内部变更时跳过 `setContent` 调用。

#### 浏览器实测验证

通过模拟完整的 IME composition 事件序列（compositionstart → 插入拼音 → compositionend → 替换为汉字）验证修复效果：
- 输入"我的"正确显示为"我的"，无拼音残留
- 最终汉字正确包裹在 `<ins class="track-insert">` 标签中
- 修订记录正确为 1 条 `insert:我的`
- 英文输入追踪仍然正常（`<ins>` 标记正确应用）
- 删除追踪仍然正常（`<del>` 标记正确应用，filterTransaction 拦截有效）
- `compositionJustEnded` 标志在一帧后正确重置，不影响后续编辑

#### 修改文件

- `src/lib/tiptap-extensions/track-changes.ts` — IME composition 事件监听 + filterTransaction/appendTransaction 的 composition 状态检查
- `src/components/tiptap-editor.tsx` — isInternalChange ref 防止内容属性反馈循环

#### 技术要点

- ProseMirror `view.composing` 在 `compositionend` 触发前已被设为 `false`，不能可靠地用于检测 reconciliation 交易，必须用 DOM 事件自行追踪
- `compositionend` 后的 reconciliation 交易在同一个同步调用栈中执行，`compositionJustEnded` 标志通过 `requestAnimationFrame` 在下一帧清除，确保能捕获该交易
- `appendTransaction` 处理替换操作（`from < to`）时，`tr.mapping.map(rs.from, -1)` 以 bias=-1 映射到插入内容的起始位置，配合 `sliceSize` 计算结束位置
- React `useRef` 比计数器方案更可靠地防止内容属性反馈循环，避免边界条件 bug

---

### 2026-07-01（第十二轮）— 修订模式架构重写：filterTransaction + Bug 修复

**根本性架构重写**，解决了上一轮 appendTransaction "删除后重插入" 方案导致的文字乱码/重复问题，并修复了 revisionId 不匹配导致接受/拒绝修订无效的严重 Bug。

#### 问题回顾

上一轮的 appendTransaction 方案在删除操作时有根本缺陷：先让 ProseMirror 真正删除文本，然后在 appendTransaction 中用 `tr.insertText()` 重新插入并加 mark。这导致多步操作时 `tr.mapping.map()` 位置计算错误，产生 `ode ad s x` 等乱码和文本重复。

#### filterTransaction 架构重写

核心思路变更：**不删除文本，而是拦截删除操作本身**。

- `filterTransaction` 拦截含删除的 `ReplaceStep`（`from < to`），返回 `false` 阻止原 transaction
- 将替代操作放入 `pendingOps` 队列，通过 `requestAnimationFrame` 在下一个动画帧执行
- 替代操作：用 `tr.addMark()` 给被删区间添加 `trackDelete` mark（文本始终保留在文档中）
- 替换操作：额外在旧文本后插入新内容并添加 `trackInsert` mark
- 智能判断：被删区间若已全部是 trackDelete → 跳过（光标跳过）；若全部是 trackInsert → 真正删除（用户删除自己的插入）

`appendTransaction` 仅处理纯插入（`from === to`），给新插入的文本添加 `trackInsert` mark。

`collectRevisionRanges` 辅助函数合并相邻同 revisionId+markType 的文本节点为连续区间，用于接受/拒绝操作。

#### revisionId 不匹配 Bug 修复

发现 `addRevision()` 调用时未传入 `id` 参数，导致修订列表中的 `id`（随机生成）与文档 mark 中的 `revisionId`（另一个随机值）不一致。`acceptRevision` / `rejectRevision` 通过 revisionId 搜索文档 marks 时找不到匹配项，操作无效。

修复：三处 `addRevision` 调用均传入 `id: revId`，确保修订列表 ID 与文档 mark 的 revisionId 完全一致。

#### 浏览器实测验证

在开发环境中完整测试了所有修订模式功能：
- 插入追踪：新输入文字显示红色下划线（`<ins class="track-insert">`），修订面板正确记录
- 删除追踪：删除操作被拦截，文字保留并显示红色删除线（`<del class="track-delete">`），修订面板正确记录
- 接受删除修订：文档中对应文本真正删除（docSize 减少），修订记录清除
- 拒绝删除修订：trackDelete mark 移除，文本保留为正常内容，修订记录清除
- revisionId 一致性：修订列表 ID 与文档 mark revisionId 完全匹配
- 无乱码：filterTransaction 架构从根本上消除了位置计算错误

#### 修改文件

- `src/lib/tiptap-extensions/track-changes.ts` — filterTransaction 架构重写 + revisionId Bug 修复（3 处 addRevision 调用传入 id: revId）

#### 技术要点

- ProseMirror `tr.insertText(text, pos)` 在指定位置插入文本节点，不会创建无效的节点结构
- `tr.addMark(from, to, markType.create(attrs))` 给范围内所有文本添加 mark，不影响已有 marks
- `tr.removeMark(from, to, markType)` 移除范围内指定类型的 mark，不删除文本
- 按 position 降序处理多个删除/mark操作，确保后面的操作不影响前面操作的位置
- `tr.setMeta(trackChangesPluginKey, true)` 标记插件自身 transaction，防止 `appendTransaction` 重复处理（accept/reject 操作不应触发新的修订记录）
- `doc.descendants()` 遍历文档节点，通过 `return false` 可提前终止遍历
- TypeScript 控制流分析无法追踪 callback 内的变量赋值，使用数组 push 模式替代 let 变量重新赋值
- `trackDelete` mark 的 `inclusive: false` 确保在 mark 边界输入文字时不会继承删除标记
- `next build` 零错误通过，24 条路由正确编译

---

### 2026-07-01（第十轮）— 修订模式重写：WPS 风格 Track Changes

**全面重写了修订模式（Track Changes）的核心实现**，从简单的 mark 添加升级为符合 WPS 修订模式交互规范的完整方案。修订模式下插入、删除、替换三种操作均有正确的视觉呈现和修订记录追踪。

#### 核心架构重写（track-changes.ts）

原方案仅在 `appendTransaction` 中给插入文本添加 `trackInsert` mark，存在多个根本性问题：删除操作没有视觉反馈、`tr.mapping` 位置映射偏移导致标记范围错误、无限循环防护不稳定。

新方案采用三层架构：

**插入操作**：文本插入后，通过 `appendTransaction` 在 `newState` 中给插入区间添加 `trackInsert` mark（红色下划线 `<ins>` 标签）。使用 `tr.mapping.map(rs.from, -1)` 以 bias=-1 精确映射到插入内容的起始位置，配合 `slice.content.size` 计算结束位置。

**删除操作**：文本从文档中被真正删除，但通过 ProseMirror `Decoration.widget()` 在删除发生的位置插入一个 `contentEditable='false'` 的 `<del>` 元素，以红色删除线样式展示被删除的原始文本。Decoration 存储在 plugin state 的 `DecorationSet` 中，随文档变更自动 mapping。

**替换操作**：ReplaceStep 中 `from < to`（删除）且 `slice.content.size > 0`（插入）同时成立时，自动识别为替换操作，在修订面板中显示为"替换了：旧文本 → 新文本"。

#### 无限循环防护（getMeta/setMeta 机制）

经过多次方案迭代（WeakSet 对象引用追踪 → _processing 标志 + queueMicrotask → filterTransaction + setTimeout），最终确定 ProseMirror 原生的 `getMeta/setMeta` 是唯一可靠的 appendTransaction 去重机制：

- `appendTransaction` 返回的 transaction 通过 `newTr.setMeta(trackChangesPluginKey, true)` 标记
- 下一轮 `appendTransaction` 中通过 `tr.getMeta(trackChangesPluginKey)` 过滤掉自身产生的 transaction
- 同时过滤 `addToHistory === false` 的内部 transaction

其他方案失败的原因：WeakSet 无法工作是因为 ProseMirror 在 appendTransaction 流程中会重建 transaction 对象，导致引用丢失；_processing 标志 + queueMicrotask 无法在同步链式调用间重置；filterTransaction + setTimeout 导致异步 dispatch 引发状态竞争和内容爆炸。

#### 安全防护：整文档替换过滤

新增关键安全检查：当 `ReplaceStep` 的 `from === 0 && to >= oldDocSize` 时，忽略该 step。这类整文档替换通常由 `editor.commands.setContent()` 或带有 mark 清理的 `insertContent` 内部重建产生，不属于用户编辑操作。

#### 修订面板（Revision Panel）

右侧边栏"修订"标签实时显示修订条数（badge 角标）。展开后按时间顺序显示每条修订记录，包含：操作者姓名、操作时间（HH:mm:ss）、操作类型（插入/删除/替换）、变更内容详情。插入内容以红色下划线显示，删除内容以红色删除线显示，替换操作同时展示旧文本和新文本（箭头连接）。

修订状态通过 `window.__trackChangesState` 持久化，使用 listeners Set 实现跨组件实时订阅更新。

#### CSS 样式优化

修订标记样式（`globals.css`）支持 Light/Dark 双模式：
- `.track-insert` / `ins.track-insert`：红色文字 + 红色下划线（`text-decoration-color: #dc2626`）
- `.track-delete` / `del.track-delete`：红色文字 + 红色删除线 + 半透明（`opacity: 0.6`）
- Dark 模式下颜色切换为 `#f87171`（较浅红色）

#### 开发辅助工具

- 创建临时 API 路由 `/api/fix-article?id=xxx`，用于递归清理数据库中文章 JSON 的 `trackInsert`/`trackDelete` marks 并重新提取纯文本。在测试中多次用于恢复被损坏的文章数据。
- 编辑器组件通过 `window.__tiptapEditor` 暴露 editor 实例，方便控制台调试和自动化测试。

#### 修改文件

- `src/lib/tiptap-extensions/track-changes.ts` — 全面重写，新架构（Decoration.widget + getMeta/setMeta + mapping bias=-1）
- `src/app/globals.css` — 修订标记样式优化（`text-decoration-thickness: 2px`、`opacity` 调整、`cursor: default`）
- `src/components/tiptap-editor.tsx` — 新增 `window.__tiptapEditor` 调试暴露
- `src/app/api/fix-article/route.ts` — 新增临时数据清理 API

#### 技术要点

- ProseMirror `Decoration.widget()` 可以在不修改文档内容的情况下渲染可视元素，适合展示"已删除但需可见"的内容
- `DecorationSet` 作为 plugin state 存储，通过 `decorationSet.map(tr.mapping, tr.doc)` 自动跟随文档变更
- `tr.mapping.map(pos, bias)` 的 bias 参数：1（默认）= 映射到插入内容之后，-1 = 映射到插入内容之前。对于标记插入区间，必须使用 bias=-1
- ProseMirror `ReplaceStep` 的 `slice.content.size` 包含了节点结构标记的大小，对于纯文本等于字符数，对于含节点标记的内容会更大
- `StepMap.ranges` 数组结构为 `[oldStart, oldSize, newSize, ...]`，可用于精确计算 step 的影响范围
- Tiptap 的 `insertContent` 在检测到现有 marks 时可能触发整文档重建（RemoveMarkStep + AddMarkStep + ReplaceStep from=0 to=docSize），必须通过整文档替换过滤来防止误触发

---

### 2026-07-01（第九轮）— 选题详情页全面重设计

**对选题详情页按不同状态（草稿/审核中/已通过/已驳回）进行了完整的差异化 UI 重设计**，使各状态下的交互逻辑和视觉呈现符合实际业务需求。同时新增了多个 Server Actions 支持选题的编辑-重新提交流程。

#### 选题详情页四状态差异化设计

根据选题所处的审核阶段，详情页呈现完全不同的布局和交互：

**草稿状态（draft）— 作者视角**：
- 可编辑表单，UI 与新建选题页完全一致（进度条、分区卡片、字段描述、placeholder）
- 底部三按钮：取消 / 保存草稿 / 提交选题申报
- 使用 `updateTopicDraft` + `submitTopicWithUpdate` Server Actions

**审核中状态（pending）— 作者视角**：
- 顶部蓝色状态横幅「该选题状态：审核中」
- 中间只读表单（字段内容以文本展示，无输入框）
- 无操作按钮
- 指导老师额外看到 `TopicReviewForm` 审批表单

**已通过状态（approved）**：
- 顶部绿色状态横幅 + 审核意见/评语
- 中间只读表单展示
- 无操作按钮

**已驳回状态（rejected/needs_revision）— 作者视角**：
- 顶部红色状态横幅 + 驳回原因展示
- 中间可编辑表单（与新建页一致的完整编辑体验）
- 底部三按钮：返回 / 重新保存为草稿 / 重新提交选题申报
- `hasChanges()` 检测：未做修改时禁止重新提交
- 使用 `revertTopicToDraft` + `resubmitTopic` Server Actions

#### 新增 Server Actions

- `submitTopicWithUpdate(id, title, formData)` — 更新内容后提交草稿（draft → pending）
- `resubmitTopic(id, title, formData)` — 被驳回后重新提交（rejected/needs_revision → pending），自动通知指导老师
- `revertTopicToDraft(id, title, formData)` — 被驳回后重新保存为草稿（rejected/needs_revision → draft）

#### 选题编辑表单重写（topic-edit-form.tsx）

完全重写为与 `topics/new/topic-form.tsx` 一致的编辑体验：
- 填写进度条（必填项计数）
- 分区卡片布局（带 accent bar 的 section header）
- 字段描述和 placeholder
- 支持 select/textarea/date/text 四种输入类型
- 两种模式（mode="draft" / mode="rejected"）控制按钮文案和行为

#### 修改文件

- `src/app/dashboard/dept/[deptId]/topics/[topicId]/page.tsx` — 重写，四状态条件渲染
- `src/app/dashboard/dept/[deptId]/topics/[topicId]/topic-edit-form.tsx` — 重写，匹配新建表单 UI
- `src/lib/actions.ts` — 新增 3 个 Server Actions（submitTopicWithUpdate, resubmitTopic, revertTopicToDraft）

#### 测试账号创建

为南新记编辑部创建了完整的 4 角色测试账号体系（学生/责编/主编/指导老师），详见上方「测试账号」表格。

#### 技术要点

- 选题详情页使用 Server Component 根据 `topic.status` 和 `userRole` 条件渲染不同布局
- 编辑表单作为 Client Component，通过 `mode` prop 控制按钮行为（draft vs rejected）
- `hasChanges()` 通过比较初始快照和当前表单数据判断用户是否做了修改，防止无意义重复提交
- 被驳回选题的 `resubmitTopic` 会同时更新内容和状态，并触发通知
- `next build` 零错误通过

---

### 2026-06-30（第七轮）— 第四阶段完成：编辑器增强 + 模块页面补全

**完成了第四阶段的全部功能**，包括富文本编辑器的修订模式、批注模式、Word 文档上传解析，以及侧边栏 5 个模块页面的开发。同时新增了稿件批注的数据库表和 Server Actions。

#### 侧边栏模块页面补全（5 个新页面）

侧边栏中已有的入口链接此前指向不存在的页面，本次全部创建完成：

- `/dashboard/excellent` — 优秀稿件展示页：展示指导老师评选的优秀作品，含星级评分、评语、作者信息、编辑部标签
- `/dashboard/common-issues` — 共性问题展示页：按分类（结构问题/导语薄弱/引用不规范等 8 类）分组展示指导老师标记的典型写作问题，每条含问题原文、修改意见、来源稿件链接
- `/dashboard/database` — 报道数据库页：所有已签发稿件的表格列表，含编辑部筛选标签、字数统计、报道类型标签
- `/dashboard/showcase` — 教学展示区页：全局统计卡片（已签发报道/选题申报/参与学生/编辑部数）、各编辑部统计卡片（已签发/总稿件/已通过选题/成员数）、优秀作品精选区域
- `/dashboard/ai-tutor` — AI 助教页：功能预告页，展示 4 个功能卡片（写作辅助/事实核查/语言润色/选题推荐），标注「即将上线 · 预计第六阶段」

#### 数据库扩展（003_comments_and_tracking.sql）

新增 `article_comments` 表：
- 支持「顶级批注 + 回复」两级结构（parent_id 自引用）
- 支持解决/取消解决（resolved + resolved_by + resolved_at）
- 完整 RLS 策略：登录用户可查看、仅作者可修改/删除
- 自动更新时间触发器（update_updated_at 函数 + trigger）

#### 修订模式（Track Changes）

自定义 Tiptap marks 和 ProseMirror 插件（`src/lib/tiptap-extensions/track-changes.ts`）：

- `TrackInsert` mark — 绿色下划线标记插入内容（`<ins>` 标签），含 author 和 timestamp 属性
- `TrackDelete` mark — 红色删除线标记删除内容（`<del>` 标签）
- `TrackChanges` Extension — ProseMirror 插件，拦截文档变更事务（appendTransaction），自动将文本插入操作包裹在 TrackInsert mark 中
- `CommentMark` mark — 蓝色高亮背景标记批注关联文本（`<span data-comment>` 标签），含 commentId 和 author 属性
- 所有 CSS 样式集成到 `globals.css`，支持 Light/Dark 双模式

编辑器 UI 增强（`src/components/tiptap-editor.tsx`）：

- 顶栏新增「修订模式」开关按钮（仅 reviewer 角色 + in_review 状态可见），开启后显示绿色「修订中」状态标签和绿色提示横幅
- 选中文本时，编辑器上方出现蓝色选择工具栏，显示选中文本预览 + 「添加批注」按钮 + 「链接」按钮
- 批注弹窗（CommentPopup）：显示选中文本预览 + 批注输入框 + ⌘+Enter 快速提交
- MenuBar 所有按钮适配 Light/Dark 双模式（`dark:bg-gray-800 dark:text-gray-300`）

#### 批注系统（Comments Panel）

批注面板组件（`src/app/dashboard/dept/[deptId]/articles/[id]/edit/comments-panel.tsx`）：

- 右侧 sidebar 新增「批注」tab，显示待处理批注数角标
- 批注列表：每条显示作者头像、姓名、时间、内容，支持标记解决/取消解决、回复、删除（仅作者可删）
- 回复功能：两级结构，回复嵌套在父批注下方
- 底部输入区：直接输入批注 + ⌘+Enter 发送
- 事件通信：编辑器选中文本添加批注时，通过 `window.dispatchEvent(CustomEvent)` 通知 CommentsPanel 自动调用 Server Action 创建数据库记录
- 新批注自动通知稿件作者，回复自动通知原批注作者

#### Word 文档上传解析

`src/components/word-upload-button.tsx`：

- 使用 `mammoth` 库在前端解析 .docx 文件为 HTML
- 自定义 `htmlToTiptapJSON()` 转换函数：将 HTML 转换为 Tiptap/ProseMirror 兼容的 JSON 文档结构
  - 支持标题（h1-h6 → heading level 1-6）
  - 支持段落（p → paragraph）
  - 支持列表（ul/ol → bulletList/orderedList）
  - 支持引用（blockquote）
  - 支持内联样式：加粗、斜体、下划线、删除线（通过 marks 递归解析）
  - 支持图片（img → image node）
  - 支持换行（br → hardBreak）
- 自动提取标题：优先使用第一个 H1，否则使用文件名
- 文件大小限制 10MB，格式限制 .docx
- 解析进度提示（加载动画 + 「解析中…」文字）
- 解析后自动填充编辑器内容和标题（仅当标题为空或「无标题稿件」时）

#### 稿件编辑器重构（article-editor.tsx）

- 右侧 sidebar 从 3 个 tab 扩展为 4 个 tab：审批流程 → 批注 → 版本历史 → 操作日志
- 顶栏新增修订模式开关按钮
- 底栏新增「保存修订」按钮（reviewer 模式下）
- 所有颜色硬编码值替换为 CSS 变量（`var(--foreground)`、`var(--border)` 等）
- 适配 Dark Mode：所有背景色、文字色、边框色均支持暗色变体

#### 新增 Server Actions（actions.ts）

- `getArticleComments(articleId)` — 获取稿件批注（含回复，两级查询）
- `createArticleComment(articleId, content, parentId?)` — 创建批注/回复（自动通知）
- `resolveArticleComment(commentId)` — 解决/取消解决批注
- `deleteArticleComment(commentId)` — 删除批注（仅作者）
- `getPublishedArticles(departmentId?)` — 获取所有已签发稿件（报道数据库）
- `getTeachingStats()` — 获取教学统计数据（各编辑部稿件/选题/成员数）

#### 新增/修改文件

- `src/app/dashboard/excellent/page.tsx` — 优秀稿件展示页
- `src/app/dashboard/common-issues/page.tsx` — 共性问题展示页
- `src/app/dashboard/database/page.tsx` — 报道数据库页
- `src/app/dashboard/showcase/page.tsx` — 教学展示区页
- `src/app/dashboard/ai-tutor/page.tsx` — AI 助教页
- `src/lib/tiptap-extensions/track-changes.ts` — 修订模式 marks + 插件
- `src/components/tiptap-editor.tsx` — 重写编辑器（修订模式 + 批注 + 选择工具栏）
- `src/components/word-upload-button.tsx` — Word 上传按钮 + HTML→JSON 转换器
- `src/app/dashboard/dept/[deptId]/articles/[id]/edit/comments-panel.tsx` — 批注面板
- `src/app/dashboard/dept/[deptId]/articles/[id]/edit/article-editor.tsx` — 重写编辑器页面
- `src/app/dashboard/dept/[deptId]/articles/[id]/edit/page.tsx` — 传递 comments 和 authorName
- `supabase/migrations/003_comments_and_tracking.sql` — 批注表迁移
- `src/lib/types.ts` — 新增 ArticleComment 类型
- `src/lib/actions.ts` — 新增 6 个 Server Actions（~150 行）
- `src/app/globals.css` — 新增修订标记和批注高亮 CSS

#### 技术要点

- Tiptap v3 中 `Mark` 和 `Extension` 从 `@tiptap/core` 导入，`Plugin`/`PluginKey` 从 `@tiptap/pm/state` 导入
- Tiptap v3 移除了 Mark 的 `addCSS()` 方法，CSS 需在全局样式表中定义
- Tiptap v3 的 `@tiptap/react` 不再导出 `BubbleMenu`（移至 `@tiptap/extension-bubble-menu`），改用自定义选择工具栏替代
- `mammoth` 库在浏览器端通过 `arrayBuffer` API 解析 .docx，无需服务端参与
- ProseMirror `appendTransaction` 钩子用于拦截文档变更并自动添加 marks
- 批注的选区信息通过 `CustomEvent` 在编辑器组件和面板组件间通信
- `next build` 零错误通过，全部 22 条路由正确编译

---

### 2026-06-30（第八轮）— 编辑器滚动隔离修复 + Word 上传格式保留重构

**修复了编辑器滚动隔离问题，并全面重构了 Word 文档上传解析系统**，从 mammoth.js（纯文本语义提取）升级为直接解析 Word XML + macOS textutil，完整保留颜色、字号、字体、对齐等视觉格式。

#### 编辑器滚动隔离修复

编辑器页面存在滚动溢出问题：整个页面（顶栏、侧边栏、工具栏、状态栏）随内容一起滚动，而非仅编辑器正文区域滚动。

根因分析：`dashboard/layout.tsx` 外层容器使用 `min-h-screen`，允许容器高度超过视口，导致 `overflow-hidden` 链断裂。

修复方案：
- `dashboard/layout.tsx`：`min-h-screen` → `h-screen overflow-hidden`，移除不生效的 `:has()` CSS hack
- `dept-layout-inner.tsx`：编辑页面 wrapper div 添加 `overflow-hidden`，确保 h-full 链条完整传递

#### Word 上传内容渲染修复

Word 上传后标题和字数正确更新，但编辑器正文区域为空。

根因分析：`tiptap-editor.tsx` 中的 `contentVersion` 计数器逻辑有缺陷。对于初始 `content === null` 的稿件，首次 Word 上传时计数器仅递增到 1（不满足 `> 1` 条件），导致 `editor.commands.setContent()` 被跳过。

修复方案：改用 `initialContentRef` 引用比较，替代计数器方案。只有当 `content` 与初始值不同时才调用 `setContent`，逻辑更清晰可靠。

#### Word 文档格式保留重构（核心改动）

**问题**：原方案使用 mammoth.js 在浏览器端解析 .docx，mammoth 的设计哲学是「语义提取」而非「视觉还原」，故意忽略颜色、字体、字号等视觉格式。用户上传含红色字体的 .doc 文件后，所有格式丢失变为纯文本。

**解决方案**：完全移除 mammoth.js，创建服务端解析 API，分两条路径处理：

**`.docx` 解析（JSZip + 直接 XML 解析）**：
- 新增 API 路由 `src/app/api/parse-doc/route.ts`
- 使用 JSZip 解压 .docx（ZIP 格式），直接读取 `word/document.xml`
- 正则匹配提取 XML 元素，转换为带内联样式的 HTML
- 保留格式：文字颜色（`w:color`）、字号（`w:sz` 半磅单位转换）、字体（`w:rFonts`）、粗体/斜体/下划线/删除线、段落对齐（`w:jc`）、标题级别（`w:outlineLvl`）、超链接（`w:hyperlink` + rels 关系文件）、高亮颜色（`w:highlight`）、上标/下标（`w:vertAlign`）
- 输出格式：`<p style="text-align:center"><span style="color:#FF0000;font-size:14px;font-family:Songti SC"><strong>文本</strong></span></p>`

**`.doc` 解析（macOS textutil + CSS class 转内联样式）**：
- 优先使用 macOS 内置 `textutil -convert html` 命令，将 .doc 转为带完整 CSS 样式的 HTML
- textutil 输出的 HTML 使用 CSS class（如 `p.p1 {color: #ff0000; font: 14.0px Times}`），编写 `processTextutilHtml()` 函数解析 `<style>` 块，将 class 样式转换为内联 `style` 属性
- 解析 CSS `font` 简写属性（如 `bold 14.0px Times`）拆分为 fontSize + fontFamily + fontWeight
- 非 macOS 环境回退到 `word-extractor` 纯文本提取（附带提示建议转为 .docx）

**前端 HTML → Tiptap JSON 转换增强**（`word-upload-button.tsx`）：
- `htmlToTiptapJSON` 的 `parseInline` 函数新增 `<span>` case：从 `style` 属性提取 `color`、`font-size`、`font-family`、`background-color`，生成 Tiptap `textStyle` mark
- `parseBlock` 的 `<p>` case 增强：从段落级 `<p style="color:...">` 提取颜色/字号/字体作为基础 marks 传递给子节点（textutil 将颜色放在 `<p>` 而非 `<span>` 上）
- 移除客户端 mammoth 导入，统一通过 `/api/parse-doc` 服务端 API 解析

#### 新增依赖

- `jszip` — 直接解析 .docx ZIP 包中的 XML 文件

#### 新增/修改文件

- `src/app/api/parse-doc/route.ts` — **新增**，服务端 Word 解析 API（.docx XML 解析 + .doc textutil 转换，~400 行）
- `src/components/word-upload-button.tsx` — 重构：移除 mammoth，统一走服务端 API；增强 HTML→Tiptap JSON 转换器支持 `<span style>` 和 `<p style>` 颜色/字号/字体
- `src/components/tiptap-editor.tsx` — 修复 content 更新逻辑（`contentVersion` 计数器 → `initialContentRef` 引用比较）
- `src/app/dashboard/layout.tsx` — 滚动隔离修复（`min-h-screen` → `h-screen overflow-hidden`）
- `src/app/dashboard/dept/[deptId]/dept-layout-inner.tsx` — 编辑页面 wrapper 添加 `overflow-hidden`

#### 技术要点

- `.docx` 本质是 ZIP 压缩包，`word/document.xml` 包含全部内容和格式，可通过 JSZip 直接解析无需第三方 Word 库
- mammoth.js 的 run model 故意不包含 `color` 属性，这是其设计哲学决定的，无法通过配置改变
- macOS `textutil` 是系统内置工具，能将 .doc 转为带 CSS 样式的 HTML，保留颜色/字体/对齐等完整格式
- textutil 输出的 HTML 使用 CSS class 引用 `<style>` 块中的规则，需要解析 CSS 并转换为内联 style 才能在 Tiptap 中使用
- Word XML 中字号 `w:sz` 使用半磅（half-points）单位，需除以 2 转换为磅
- Tiptap `textStyle` mark 通过 `attrs` 传递 `color`、`fontSize`、`fontFamily`、`backgroundColor` 属性
- React `useRef` 用于跟踪初始 prop 值比计数器更可靠，避免边界条件 bug
- CSS `h-screen` + `overflow-hidden` 链必须从根容器到编辑器逐层传递，任何一层使用 `min-h-screen` 都会破坏滚动隔离
- `next build` 零错误通过，22 条路由正确编译

---

### 2026-06-29（第四轮）— UI/UX 大改版

**对整个平台进行了一次全面的 UI/UX 重构**，重构了侧边栏导航架构，升级了选题申报表单为专业新闻报题单，并实现了选题-稿件联动机制。

#### 侧边栏重构

完全重写 `dashboard-sidebar.tsx`，从原先的简单导航列表升级为功能完整的侧边栏组件。包含收起/展开按钮、采编审稿系统一级菜单（可展开/收起的二级编辑部列表）、编辑部加入状态显示（已加入/申请加入弹窗）、模块入口（报道数据库、AI助教、优秀稿件、教学展示区、共性问题、通知中心含未读角标）、底部用户区。布局层面新增 `getDepartments()` 并行查询。

#### 选题申报表单重设计（专业新闻报题单）

将原来只有标题的简易表单升级为参考 CCTV 报题模板、北京新闻报题单、国际新闻学标准综合设计的 13 字段 5 分区专业报题单。`DEFAULT_TOPIC_FORM_FIELDS` 含 5 个区块：基本信息（报道类型/选题线索来源）、选题论证（选题背景/新闻价值分析/报道角度/报道意义）、采访计划（拟采访对象/采访方案）、预期成果（预期成果形式/计划完成时间）、风险与伦理（风险与伦理考量/参考资料）。

#### 选题-稿件联动

`articles/page.tsx` 重构：选题通过后在稿件列表顶部展示「选题已通过，等待创建稿件」卡片区域，支持一键创建关联稿件。

---

### 2026-06-29（第五轮）— UI 简约化重构：Light/Dark 双模式

**全面去除南大紫主题，改为中性 Light/Dark 双模式简约风格**，参考 SkillHot（skillhot.savs-ai.com）的设计语言。同时修复了侧边栏收起 bug 和选题表单 fallback 逻辑。

#### 全局主题系统重写

完全重写 `globals.css`，移除全部南大紫（`#5c307e`）相关变量，建立中性 Light/Dark CSS 自定义属性体系。

Light 模式核心色值：`--background: #ffffff`、`--foreground: #111827`、`--accent: #111827`、`--sidebar-bg: #ffffff`、`--content-bg: #f9fafb`。Dark 模式核心色值：`--background: #0f0f10`、`--foreground: #f3f4f6`、`--accent: #f3f4f6`、`--sidebar-bg: #18181b`、`--content-bg: #0f0f10`。

Tailwind CSS 4 dark mode 配置：使用 `@custom-variant dark (&:where(.dark, .dark *));` 启用 class 策略（默认 Tailwind v4 使用 `prefers-color-scheme`，需手动覆盖）。

新增 `.dark` 作用域下的卡片 hover 阴影、表单 focus 光晕等暗色适配样式。

#### Dark mode 切换与持久化

三层架构保证无闪烁体验：

1. **内联脚本（pre-hydration）**：在 `layout.tsx` 的 `<head>` 中注入同步脚本，读取 `localStorage.getItem('theme')` 并立即设置 `document.documentElement.classList.add('dark')`，在 React hydrate 之前完成，避免白屏闪烁（FOUC）。`<html>` 标签加 `suppressHydrationWarning` 防止 server/client class 不匹配的 hydration 警告。
2. **React 状态同步**：侧边栏 `useEffect` 在 mount 时从 DOM 读取 `.dark` class 状态（`document.documentElement.classList.contains('dark')`），同步到 `darkMode` state。
3. **Toggle + localStorage**：点击侧边栏底部的太阳/月亮按钮，同时操作 `classList.toggle` 和 `localStorage.setItem`，保证跨页导航和刷新后状态一致。

侧边栏底部新增 dark mode 切换按钮（SunIcon/MoonIcon 组件），collapsed 状态下仅显示图标。

#### 侧边栏收起 bug 修复

原实现使用 CSS `.sidebar-collapsed` 规则 `display: none` 隐藏文本标签，导致收起后仍然残留图标堆叠。改为 React 条件渲染 `{!collapsed && (...)}` 控制品牌文本、导航标签、编辑部列表的显隐。收起后侧边栏宽度从 `w-56` 缩为 `w-16`，仅保留展开按钮（双箭头 `»`）和各模块的 icon + tooltip（`title` 属性）。

#### 选题表单 fallback 修复

`topics/new/page.tsx` 中修复模板 fallback 条件：当数据库 `topic_form_template` 为空或长度 ≤ 2 时，使用 `DEFAULT_TOPIC_FORM_FIELDS`（13 字段完整报题单），而非数据库中的残缺模板。保证用户至少看到选题标题、选题背景、选题价值、新闻问题等必填字段。

#### 欢迎横幅配色调优

`dashboard/page.tsx` 欢迎横幅最终使用 `bg-gray-900 dark:bg-gray-800 text-white`，保证在 light/dark 两种模式下都是深色底白字，视觉层次清晰。避免了 `bg-[var(--accent)]` 在 dark 模式下翻转为浅色的问题。

#### 全部页面组件适配

15+ 页面/组件中的所有硬编码南大紫色值替换为 CSS 变量引用。受影响文件：`globals.css`、`layout.tsx`（根布局）、`dashboard/layout.tsx`、`dashboard-sidebar.tsx`、`dashboard/page.tsx`、`dept-tabs.tsx`、`dept/page.tsx`、`create-article-button.tsx`、`topics/page.tsx`、`topics/new/page.tsx`、`topics/new/topic-form.tsx`、`articles/page.tsx`、`members/page.tsx`、`settings/page.tsx`、`notifications/page.tsx`、`notification-item.tsx`、`mark-all-read-button.tsx`。

#### 技术要点

- Tailwind CSS 4 class-based dark mode 需要 `@custom-variant` 声明，否则 `dark:` 前缀走 media query
- 内联脚本 + `suppressHydrationWarning` 是 Next.js App Router 下 dark mode 无闪烁的标准方案
- 侧边栏收起使用 React 条件渲染而非 CSS display:none，避免 DOM 残留
- 选题表单 fallback 使用 `dbTemplate.length > 2` 判断，兼容数据库中遗留的最简模板
- `next build` 零错误通过，light/dark 两种模式浏览器截图均验证通过

---

### 2026-06-29（第六轮）— UI 精细化调整 & 功能增强

**针对实际体验中发现的 UI 问题和功能缺失进行全面修正**，参考 SkillHot（skillhot.savs-ai.com）的布局设计和交互模式。

#### 全局布局重构

- **顶部标题栏横跨全宽**：将「南京大学未来编辑部·智慧课程」从侧边栏移到全局顶部栏，横跨整个页面宽度（侧边栏+内容区都在其下方）。标题使用 `text-xl font-black` 大号粗体，前方加南大校徽图标（`public/nju-logo.png`），与 SkillHot 品牌字体风格一致。
- **侧边栏高度下降**：侧边栏起始于全局顶栏下方，不再包含品牌标题区域。
- **收起/展开按钮外移**：从侧边栏内部移到侧边栏右边缘中央的悬浮椭圆按钮（`w-6 h-10 rounded-full`，半透出到主内容区），箭头 `<` 收起后旋转 180° 变为 `>`。参考 SkillHot 侧边栏设计。
- **内容区宽度放大**：所有页面 `max-w` 从 `4xl/5xl` 统一提升为 `6xl`（1152px），减少左右留白。

#### Dark Mode 全面修复

- 新增全局 `.btn-primary` CSS 类，在 dark 模式下自动翻转为浅底深字（`bg: #f3f4f6, color: #111827`），修复了所有主按钮在深色模式下白字不可见的问题。
- 修复文件：`topics/page.tsx`、`articles/page.tsx`、`create-article-button.tsx`、`topic-form.tsx`、`dashboard-sidebar.tsx` 中的弹窗确认按钮。
- 状态标签颜色（`STATUS_COLORS`、`TOPIC_STATUS_COLORS`）全部增加 `dark:` 变体。

#### ThemeToggle 重新设计

- 创建独立组件 `src/components/theme-toggle.tsx`，放置在顶栏通知铃铛左边。
- 滑块改为半透明圆环（`border-2 + bg-*/10`），不遮挡太阳/月亮图标。
- 图标和圆环均使用 `top-1/2 -translate-y-1/2` 确保垂直居中。
- 太阳用黄色（`amber-500`），月亮用蓝色（`indigo-400`）。

#### 编辑部 Tab 单行设计

- `dept-tabs.tsx` 完全重写：编辑部名称（`text-xl font-bold`）和 tab 导航（概览/选题/稿件）放在同一行展示。
- 右侧新增「退出编辑部」按钮，点击弹出确认弹窗（提示再次加入需审核通过）。
- 新增 `leaveDepartment` Server Action。

#### 用户头像下拉框

- 创建 `src/components/user-dropdown.tsx`，右上角只显示头像圆形按钮（姓名首字）。
- 点击展开下拉框：「个人中心」（跳转 profile 页）+ 「退出登录」（红色文字）。
- 删除旧的 `logout-button.tsx`。

#### 概览页重构

- 三个统计卡片标签改为 `text-sm font-bold`，数字改为 `text-3xl font-extrabold`。
- 「+ 申报选题」和「+ 新建稿件」统一黑底白字（dark 模式下白底黑字），`min-w-[120px]` 保证大小一致。

#### 选题草稿功能

- `types.ts` 新增 `draft` 选题状态 + 对应标签和颜色。
- `actions.ts` 新增 `saveTopicDraft`、`updateTopicDraft`、`submitTopicDraft` 三个 Server Action。
- 选题申报表单底部新增「保存草稿」按钮（提交按钮左侧）。
- 选题管理页面标签列增加「草稿」tab。

#### 侧边栏交互优化

- 「采编审稿系统」拆分为两个交互区域：点击文字/图标导航到 `/dashboard`（回到欢迎首页），点击右侧箭头展开/收起编辑部列表。
- `joinDepartment` 更新为通知责编/主编/指导老师有新成员申请加入。

#### 新增/修改文件

- `src/components/theme-toggle.tsx` — 主题切换滑块组件
- `src/components/user-dropdown.tsx` — 用户头像下拉框组件
- `public/nju-logo.png` — 南京大学校徽
- 删除：`src/app/dashboard/logout-button.tsx`

#### 技术要点

- 全局布局从「左右分割嵌入顶栏」改为「上下分割（全宽顶栏 + 侧边栏/内容区并排）」
- 悬浮收起按钮需要 aside 不设 `overflow-hidden`，内部 nav 用 `overflow-x-hidden` 防止文字溢出
- `btn-primary` CSS 类使用 `.dark .btn-primary` 选择器确保 dark 模式下对比度正确
- `next build` 零错误通过

**待做（下次会话继续）：**

- 富文本编辑器增强：参考飞书/学城智能文档，支持修订模式和批注模式（editor+ 角色权限控制）
- Word 文档上传：学生上传 .docx 后自动解析到 Tiptap 编辑器，保留格式（字体、段落、图片、表格）
- 报道数据库、AI助教、优秀稿件、教学展示区、共性问题等模块页面（侧边栏入口已就位，页面待开发）
- 加入编辑部需审核流程（前端审核界面 + 后端状态管理）

---

### 2026-06-28（第三轮）— PRD v1.0 第一阶段完成

**基于 PRD 文档全面重构了采编审稿系统**，完成 PRD 建议的「第一阶段：基础框架与核心流程」。

#### 数据库大重构（002_phase2_refactor.sql，71 条 SQL 全部执行成功）

新增表：
- `user_department_roles` — 用户-编辑部多对多关联（一个用户可在多个编辑部担任不同角色）
- `workflow_configs` — 审批流配置版本管理
- `workflow_stages` — 审批流节点（可配置多级审批链）
- `topics` — 选题管理
- `topic_reviews` — 选题审批记录
- `article_versions` — 稿件版本快照
- `article_workflows` — 稿件审批流转记录
- `common_issues` — 共性问题标记
- `notifications` — 站内通知

修改表：
- `profiles` — 角色扩展为 5 种（reporter/editor/chief_editor/supervisor/admin）
- `articles` — 新增 topic_id, current_stage, workflow_config_id, excellence_level 等字段；状态改为 draft/in_review/returned/published/archived
- `departments` — 新增 topic_form_template, active_workflow_id 字段

初始化数据：
- 每个编辑部自动创建默认三级审批流（责编审核 → 主编审核 → 老师终审签发）
- 所有新表启用 RLS，基于 user_department_roles 做数据隔离

#### 角色体系升级

从 3 角色（reporter/editor/admin）升级为 5 角色：
- **reporter**（学生记者）— 提交选题、写稿、修改稿件
- **editor**（责任编辑）— 审核稿件、修订批注
- **chief_editor**（主编/副主编）— 高级审核
- **supervisor**（指导老师）— 终审签发、选题审批、配置审批流
- **admin**（系统管理员）— 全局管理

#### 可配置审批流引擎

- 每个编辑部可独立配置审批流（节点数量、顺序、角色自定义）
- 稿件提交时绑定当时生效的审批流版本（快照机制）
- 支持通过、退回上一级、退回记者三种操作
- 审批流版本管理（每次修改生成新版本，不影响在途稿件）

#### 选题管理模块

- 选题申报：标题 + 自定义表单字段（报道线索、采访对象、报道角度等）
- 选题审批：指导老师可通过/退回修改/驳回
- 选题通过后自动创建关联稿件

#### 通知系统

- 选题提交/审批、稿件流转、签发等操作自动发送站内通知
- 通知中心页面、未读角标

#### 前端页面（全部路由）

```
/                                         # 首页（轮播背景）
/login                                    # 登录
/register                                 # 注册
/dashboard                                # 工作台首页（编辑部卡片 + 通知）
/dashboard/join                           # 加入编辑部
/dashboard/notifications                  # 通知中心
/dashboard/profile                        # 个人资料
/dashboard/dept/[deptId]                  # 编辑部工作台概览
/dashboard/dept/[deptId]/topics           # 选题列表
/dashboard/dept/[deptId]/topics/new       # 申报选题
/dashboard/dept/[deptId]/topics/[topicId] # 选题详情/审批
/dashboard/dept/[deptId]/articles         # 稿件列表
/dashboard/dept/[deptId]/articles/[id]/edit # 稿件编辑/审核
/dashboard/dept/[deptId]/members          # 成员管理
/dashboard/dept/[deptId]/settings         # 编辑部设置
/dashboard/dept/[deptId]/settings/workflow # 审批流配置
```

#### 关键文件

- `supabase/migrations/002_phase2_refactor.sql` — 数据库重构迁移
- `src/lib/types.ts` — 全面重构的类型系统（5角色、审批流、选题等）
- `src/lib/actions.ts` — 全面重构的 Server Actions（~1100 行）
- `src/app/dashboard/layout.tsx` — 顶部导航栏布局
- `src/app/dashboard/dept/[deptId]/layout.tsx` — 编辑部侧边栏布局
- `src/components/tiptap-editor.tsx` — Tiptap 富文本编辑器

**待做（已在第四轮部分完成或重新规划）：**

- ~~选题表单模板配置界面~~ → 已在第四轮实现 13 字段专业报题单
- 在线修订（Track Changes）、批注功能 → 移至第四阶段
- .docx 上传解析 → 移至第四阶段
- 共性问题展示页、优秀稿件展示页 → 移至第五阶段
- 版本差异对比（diff）页面
- 图片上传至 COS/Supabase Storage
- AI 助教模块 → 移至第六阶段

---

### 2026-06-28（第二轮）— 第二阶段基础完成

**已完成：**

1. 数据库设计（SQL 迁移脚本 `supabase/migrations/001_phase2_tables.sql`）
   - `departments` 表：五个校园媒体（新潮、家书、新天地NewEra、核真录、南新记）
   - `profiles` 表：用户资料，关联 auth.users
   - `articles` 表：稿件，含 Tiptap JSON 内容
   - `article_logs` 表：操作日志
   - 完整 RLS 策略

2. Tiptap 富文本编辑器集成
3. 基础稿件 CRUD + 审核流程
4. 页面结构：稿件列表、编辑器、个人资料

---

### 2026-06-28（第一轮）— 第一阶段完成

**已完成：**

1. 开发环境搭建（Node.js v24.18.0、pnpm 11.9.0、Git 2.50.1）
2. 项目初始化（Next.js 16、TypeScript、Tailwind CSS 4、App Router）
3. Supabase 连接配置
4. 认证系统（注册/登录/中间件）
5. 首页设计（全屏背景轮播）

---

## 项目结构

```
nju-future-newsroom/
├── public/
│   ├── hero-1.jpg                        # 编辑部合照
│   ├── hero-2.jpg                        # 课堂教学照片
│   └── nju-logo.png                      # 南京大学校徽
├── supabase/
│   └── migrations/
│       ├── 001_phase2_tables.sql         # 基础数据库表
│       └── 002_phase2_refactor.sql       # PRD 重构迁移
├── src/
│   ├── app/
│   │   ├── page.tsx                      # 首页（背景轮播）
│   │   ├── layout.tsx                    # 全局布局
│   │   ├── globals.css                   # Light/Dark 双模式主题系统（CSS 自定义属性）
│   │   ├── login/page.tsx                # 登录页
│   │   ├── register/page.tsx             # 注册页
│   │   ├── auth/callback/route.ts        # 认证回调
│   │   ├── api/parse-doc/route.ts        # Word 文档解析 API（.docx XML + .doc textutil）
│   │   └── dashboard/
│   │       ├── layout.tsx                # 全宽顶栏 + 侧边栏/内容区布局
│   │       ├── dashboard-sidebar.tsx     # 侧边栏组件（悬浮收起按钮 + 编辑部列表）
│   │       ├── page.tsx                  # 工作台首页
│   │       ├── profile/page.tsx          # 个人资料
│   │       ├── notifications/            # 通知中心
│   │       │   ├── page.tsx
│   │       │   ├── notification-item.tsx
│   │       │   └── mark-all-read-button.tsx
│   │       └── dept/[deptId]/
│   │           ├── layout.tsx            # 编辑部内页布局
│   │           ├── dept-tabs.tsx         # 编辑部标签页导航
│   │           ├── page.tsx              # 工作台概览
│   │           ├── create-article-button.tsx
│   │           ├── articles/             # 稿件管理（含选题联动）
│   │           ├── topics/               # 选题管理
│   │           │   ├── page.tsx          #   选题列表
│   │           │   ├── [topicId]/page.tsx #  选题详情/审批
│   │           │   └── new/
│   │           │       ├── page.tsx      #   申报选题页
│   │           │       └── topic-form.tsx #  专业报题单表单
│   │           ├── members/              # 成员管理
│   │           └── settings/             # 编辑部设置
│   │               ├── page.tsx          #   审批流 + 选题模板
│   │               └── workflow/         #   审批流配置
│   ├── components/
│   │   ├── tiptap/                       # Tiptap 模块化编辑器
│   │   │   ├── index.tsx                 #   主组件（useEditor + PageWrapper + 格式刷）
│   │   │   ├── toolbar.tsx               #   单行工具栏（30+ 按钮 + 段落面板）
│   │   │   ├── bubble-menu.tsx           #   上气泡栏（15 工具）+ 下批注栏
│   │   │   ├── table-bubble-menu.tsx     #   表格右键菜单（11 操作项）
│   │   │   ├── extensions.ts             #   扩展集中配置（含 A4 分页）
│   │   │   ├── types.ts                  #   类型 + 常量（25 字体/中文字号/段落间距）
│   │   │   ├── icons.tsx                 #   20+ SVG 图标组件
│   │   │   └── color-picker.tsx          #   70 色调色板
│   │   ├── theme-toggle.tsx              # Light/Dark 主题切换滑块
│   │   └── user-dropdown.tsx             # 用户头像下拉框（个人中心+退出登录）
│   ├── lib/
│   │   ├── types.ts                      # 类型定义（5角色 + 13字段报题单）
│   │   ├── actions.ts                    # Server Actions（~1100行）
│   │   ├── tiptap-extensions/
│   │   │   ├── track-changes.ts          #   修订模式（Track Changes）
│   │   │   ├── indent.ts                 #   缩进扩展
│   │   │   ├── attachment.ts             #   文件附件节点
│   │   │   ├── callout.ts                #   标注块（提示/警告/技巧/危险）
│   │   │   ├── search-replace.ts         #   查找替换插件
│   │   │   └── column.ts                 #   双栏/多栏布局
│   │   └── supabase/
│   │       ├── client.ts                 # 浏览器端
│   │       └── server.ts                 # 服务端
│   └── middleware.ts                     # 认证中间件
├── .env.local
├── package.json
└── DEVLOG.md
```

## 启动命令

```bash
cd ~/Desktop/nju-future-newsroom
pnpm dev
# 访问 http://localhost:3000
```
