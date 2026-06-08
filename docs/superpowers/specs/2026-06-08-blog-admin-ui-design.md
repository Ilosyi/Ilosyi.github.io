# 博客本地管理界面设计

## 背景

astro-koharu 是一个 Astro 5 静态博客。文章文件位于 `src/content/blog/**/*.md`，站点配置位于
`config/site.yaml`，公开图片资源位于 `public/img`。当前写作和配置流程需要直接编辑仓库文件。本次改动目标是增加
一个本地浏览器管理界面，让博客所有者可以通过 UI 创建、编辑和配置博客，同时保留现有静态部署模型。

本功能在 `feature/blog-admin-ui` 分支开发。

## 目标

- 提供本地浏览器管理工作台，用于写文章和维护博客配置。
- 支持文章列表、筛选、新建、编辑、草稿切换，并安全保存到 `src/content/blog`。
- 支持结构化编辑 `config/site.yaml` 中常用配置。
- 支持站点头图、周刊头图、文章封面和首页精选分类图片管理。
- 保持公开 Astro 站点为静态站点；管理端不作为线上后台进入生产构建结果。
- 所有文件写入都限制在明确的项目路径内，并提供清晰错误提示。

## 非目标

- 线上后台登录、多用户权限管理。
- GitHub 远程写入、数据库存储、部署流水线自动化。
- 首版不接入备份、还原、LQIP 生成、AI 摘要、相似度生成等 CLI 操作。
- 编辑器预览不追求与 Astro 文章页完全一致。
- 首版不做文章硬删除。

## 架构

首版采用独立本地管理服务，通过新增命令启动，例如 `pnpm admin`。

```plain
scripts/admin/
  server/        # 本地 Node API、文件读写、校验、路径安全
  client/        # React 管理工作台
  shared/        # 共享类型和纯工具函数
```

服务包含两个职责：

- 本地 API 服务：绑定 `127.0.0.1`，负责读取、校验、写入 Markdown、YAML 和图片文件。
- React 管理界面：本地浏览器访问，负责文章、配置、图片管理流程。

现有 Astro 站点继续负责公开博客页面。管理端是本地开发工具，不进入静态部署输出。

## 用户界面

界面是偏高效的本地工作台，不做落地页。

- 左侧导航：文章、配置、图片。
- 文章工作区：文章列表、搜索筛选、元信息表单、Markdown 编辑器、预览/保存状态区域。
- 配置工作区：用 tab 或分区表单编辑站点信息、分类映射、首页精选分类、周刊、社交链接、友链、公告、导航、
  评论和统计。
- 图片工作区：预览并上传站点头图、周刊头图、编号封面池图片。

视觉方向应安静、实用，并与现有博客风格协调。避免营销式大卡片和装饰性页面，优先服务高频编辑流程。

## 文章管理

API 扫描 `src/content/blog/**/*.md`，返回文章摘要：

- 标题 `title`
- 链接 `link`
- 描述 `description`
- 发布时间 `date`
- 更新时间 `updated`
- 分类 `categories`
- 标签 `tags`
- 封面 `cover`
- 草稿 `draft`
- 置顶 `sticky`
- 目录开关 `catalog`
- 目录编号 `tocNumbering`
- 相对项目根目录的文件路径

文章编辑使用 `gray-matter` 拆分 frontmatter 和 Markdown 正文。frontmatter 通过表单编辑，正文使用 Markdown 编辑器
编辑。

首版支持动作：

- 查看全部文章。
- 按标题、分类、标签、草稿状态搜索筛选。
- 通过结构化字段新建文章。
- 编辑已有文章元信息和 Markdown 正文。
- 保存修改回原文件。
- 新建文章时按分类和 `link` 生成保存路径。
- 切换 `draft`、`sticky`、`catalog`、`tocNumbering`。
- 不硬删除文章；需要下线时设置为 `draft: true`。

新建文章遵循现有 blog-writer 规则：

- 基础目录是 `src/content/blog`。
- 文件名使用 `link` slug 加 `.md`。
- 分类尽量决定子目录，并复用 `categoryMap`。
- 嵌套分类使用 YAML 数组语法，例如 `- [笔记, 前端]`。
- 单层分类使用 YAML 数组项，例如 `- 工具`。

## 配置管理

API 读取并写入 `config/site.yaml`。首版支持结构化编辑：

- `site`：标题、英文名、副标题、站点名、描述、头像、Logo 显示、作者、URL、建站年份、关键词。
- `categoryMap`：中文分类名到 URL slug 的映射。
- `featuredCategories`：首页精选分类卡片。
- `featuredSeries`：周刊/系列文章配置。
- `social`：社交链接。
- `friends.intro` 和 `friends.data`：友链页面内容。
- `announcements`：站点公告。
- `navigation`：顶部导航。
- `comment.remark42`：评论配置。
- `analytics.umami`：统计配置。

保存配置会写入 `config/site.yaml`。界面需要提示用户：修改 YAML 配置后，Astro dev server 可能需要重启，或者重新
build，公开站点才会完全反映变化。

当前配置文件包含大量注释。实现时优先评估能否保留注释；如果首版采用普通 YAML 序列化导致注释和格式被规范化，
界面必须在第一次保存配置前明确提示。

## 图片管理

图片管理纳入首版。

### 站点头图

站点头图当前使用固定文件：

- `public/img/site_header_1920.webp`
- `public/img/site_header_800.webp`

管理界面可以预览和替换头图。上传新头图后，服务端使用 `sharp` 生成或覆盖这两个 WebP 文件。

### 周刊头图

周刊头图当前使用：

- `public/img/weekly_header.webp`

管理界面可以预览和替换该图片。除非用户明确选择其他合法公开图片路径，否则保存时保持 `featuredSeries.cover` 为
`/img/weekly_header.webp`。

### 文章封面池

默认文章封面池位于：

- `public/img/cover/*.webp`

现有运行时代码会读取该目录并按自然顺序排序。文章卡片封面优先级保持不变：

1. 文章 frontmatter 中的 `cover`。
2. `public/img/cover` 中的默认封面池。
3. 默认封面池第一张作为兜底。

管理界面必须保留这个规则。

封面动作：

- 按自然顺序列出并预览已有封面。
- 上传新封面，并保存为下一个数字文件名。
- 上传封面统一转换为 `.webp`。
- 如果当前最大数字封面是 `26.webp`，下一个上传封面保存为 `27.webp`。
- 文章封面选择“自动随机”时，不写 `cover` 字段，继续走默认封面池逻辑。
- 文章封面选择已有图片时，写入类似 `/img/cover/27.webp` 的路径。
- 文章编辑时可上传新封面，并立即写入当前文章 `cover`。
- `featuredCategories[].image` 可从封面池选择。

### 上传安全

上传必须满足：

- 只接受已知图片 MIME 类型和扩展名。
- 只写入固定头图目标或 `public/img/cover`。
- 拒绝客户端传入的路径穿越和任意文件名。
- 优先输出 WebP，保持与当前封面池一致。

## API 设计

代表性接口：

```plain
GET    /api/posts
GET    /api/posts/:id
POST   /api/posts
PUT    /api/posts/:id
PATCH  /api/posts/:id/draft

GET    /api/config
PUT    /api/config

GET    /api/images
POST   /api/images/covers
POST   /api/images/site-header
POST   /api/images/weekly-header
```

具体命名可以在实现阶段微调，但资源边界应保持文章、配置、图片三类。

## 校验与安全

所有写操作都必须做服务端校验。

- 文章路径必须解析在 `src/content/blog` 内。
- 配置路径必须精确解析到 `config/site.yaml`。
- 封面上传必须解析在 `public/img/cover` 内。
- 头图上传只能写入已知固定文件名。
- slug 使用 URL 安全的小写短横线格式。
- 文章必填字段包括 `title`、`date` 和 Markdown 正文。
- YAML 分类结构必须符合当前 Astro Content Collection schema。
- 服务端返回结构化错误，方便 UI 展示。

路径检查、元信息规范化、封面编号生成等逻辑应放在纯工具函数中，便于不启动服务也能测试。

## 数据流

```plain
React 管理界面
  -> fetch 本地 API
  -> Node 服务端校验
  -> gray-matter / YAML 解析器 / sharp
  -> src/content/blog/*.md, config/site.yaml, public/img/*
```

## 测试策略

实现阶段采用测试驱动开发。

高优先级测试：

- slug 生成和文章路径生成。
- 路径安全检查能拒绝路径穿越。
- Markdown frontmatter 解析和序列化。
- 分类到目录的映射。
- 下一个数字封面文件名生成。
- 配置解析、更新、写回规范化。

中优先级测试：

- 新建/更新文章 API 行为。
- 保存配置 API 行为。
- 图片上传校验和目标路径选择。

完成前验证：

- 运行针对性单元测试。
- 运行 `pnpm check`。
- 运行 `pnpm lint:fix`。
- 运行 `pnpm build`。
- 启动 `pnpm admin`，确认本地管理界面可以打开。

## 实现计划阶段需要决定

- 本地服务采用 Vite middleware + Node HTTP、Express，还是其他轻量服务。
- 测试使用 Vitest，还是 Node 内置 test runner。
- Markdown 预览只使用 `marked`，还是更接近 Astro Markdown 渲染链路。
- 配置保存是否使用注释友好的 YAML 库，或首版接受规范化输出但明确提示。
