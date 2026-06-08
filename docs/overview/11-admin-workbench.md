# Admin 管理界面技术说明

## 概述

Admin 管理界面是项目内置的本地内容工作台，用于在浏览器中管理博客文章、站点配置和图片资源。它通过 `pnpm admin` 启动，默认监听 `http://127.0.0.1:4322`，服务端直接读写当前仓库中的内容文件，不参与静态站点构建，也不会部署到线上。

它解决的核心问题是：日常写作和配置调整不需要直接打开代码目录修改 Markdown、YAML 或图片文件，同时仍然保留静态博客原有的文件组织规则。

---

## 启动方式

```bash
pnpm admin
```

启动脚本来自 `package.json`：

```json
{
  "scripts": {
    "admin": "tsx scripts/admin/server/index.ts"
  }
}
```

默认端口为 `4322`。如果需要改端口，可以设置环境变量：

```bash
KOHARU_ADMIN_PORT=4330 pnpm admin
```

服务只绑定 `127.0.0.1`，避免在局域网中暴露文件写入能力。

---

## 目录结构

```plain
scripts/admin/
├── client/                    # React 管理端
│   ├── App.tsx                # 顶层工作区切换
│   ├── api.ts                 # 浏览器侧 API 封装
│   ├── components/
│   │   ├── ArticleWorkspace.tsx
│   │   ├── ConfigWorkspace.tsx
│   │   └── ImageWorkspace.tsx
│   └── styles.css
│
├── server/                    # 本地 Node HTTP 服务
│   ├── index.ts               # 路由注册与 Vite middleware
│   ├── posts.ts               # 文章读写
│   ├── config.ts              # site.yaml 读写
│   ├── images.ts              # 图片列表与上传
│   └── http.ts                # JSON、错误处理、静态图片代理
│
└── shared/                    # 客户端和服务端共用工具
    ├── config-utils.ts
    ├── image-utils.ts
    ├── path-utils.ts
    ├── post-utils.ts
    ├── slug.ts
    └── types.ts
```

`server/index.ts` 使用 Node 原生 `http` 注册 `/api/*` 接口，并把 `scripts/admin/client` 作为 Vite SPA 运行。这样 admin 可以复用 React 开发体验，但不需要接入 Astro 路由。

---

## 功能模块

### 文章工作区

文章工作区由 `ArticleWorkspace.tsx` 和 `server/posts.ts` 组成，主要流程如下：

1. `GET /api/posts` 扫描 `src/content/blog/**/*.{md,mdx}`，解析 frontmatter 后生成文章列表。
2. `GET /api/posts/:id` 按项目相对路径读取单篇文章，并返回 frontmatter 与正文。
3. `POST /api/posts` 创建新文章，按标题或 `link` 生成 slug。
4. `PUT /api/posts/:id` 保存文章；如果分类或 slug 导致目标路径变化，服务端会写入新路径并删除旧文件。
5. `PATCH /api/posts/:id/draft` 只更新 frontmatter 中的 `draft` 字段。

分类输入使用逗号分隔多个分类，用 `/` 表示嵌套层级。例如：

```plain
笔记/后端, Go
```

会序列化为：

```yaml
categories:
  - [笔记, 后端]
  - Go
```

文章文件位置由 `shared/post-utils.ts` 的 `buildPostFilePath()` 计算。它会读取 `config/site.yaml` 中的 `categoryMap`，将中文分类转换为目录名。例如 `笔记/后端` 可以落到 `src/content/blog/note/back-end/<slug>.md`。如果分类缺少映射且本身不是合法 slug，保存会失败并提示需要补充分类映射。

### 配置工作区

配置工作区管理 `config/site.yaml`：

- `GET /api/config` 读取 YAML 并返回结构化配置。
- `PUT /api/config` 接收更新后的配置，重新序列化为 YAML。

界面提供表单编辑和原始 JSON 编辑两种模式。表单适合常用字段，原始 JSON 适合临时处理尚未做成表单控件的深层配置。

### 图片工作区

图片工作区由 `ImageWorkspace.tsx` 和 `server/images.ts` 组成，管理三类资源：

| 类型         | 保存位置                                      | 规则                                      |
| ------------ | --------------------------------------------- | ----------------------------------------- |
| 站点头图     | `public/img/site_header_1920.webp` 和 `800` 版 | 上传后生成 1920 与 800 两个 webp 文件     |
| 周刊头图     | `public/img/weekly_header.webp`               | 上传后覆盖固定文件                        |
| 文章封面池   | `public/img/cover/<n>.webp`                   | 根据现有数字文件名递增保存为下一张封面    |

文章编辑器中的封面下拉框会读取封面池：

- 选择“自动随机”时，frontmatter 不写入 `cover`，站点继续使用原有随机封面逻辑。
- 选择具体封面时，frontmatter 写入 `/img/cover/<n>.webp`。

新增文章封面时，服务端会找出 `public/img/cover/` 中合法图片文件的最大数字编号，并把新图保存为 `max + 1`.webp。例如已有 `1.webp` 到 `26.webp`，下一张会保存为 `27.webp`。

---

## 安全边界

Admin 是本地工具，不提供用户登录或线上权限系统。它依赖以下边界降低误用风险：

- 服务只监听 `127.0.0.1`。
- 所有文章路径必须落在 `src/content/blog` 内。
- 所有公开图片路径必须落在 `public/img` 内。
- `/img/*` 只代理图片文件，并拒绝目录穿越路径。
- 图片上传体积限制为 20 MB。
- 上传图片会先用 `sharp` 读取元数据，无法解析的内容会被拒绝。
- Markdown 预览会在浏览器端清洗 HTML，移除脚本、事件属性和不允许的标签。

这些保护只面向本地开发场景，不能把 admin 服务直接暴露到公网。

---

## 文件写入规则

### 文章

文章保存时会重新生成 frontmatter，字段顺序由 `serializePostMarkdown()` 固定，日期字段保持 Astro 可识别的 `YYYY-MM-DD HH:mm:ss` 格式。

创建文章时使用 `fs.writeFile(..., { flag: 'wx' })`，避免覆盖同名文章。修改文章时如果目标路径发生变化，也会先用 `wx` 写入新文件，确认没有冲突后再删除旧文件。

### 配置

配置保存时写回 `config/site.yaml`。由于 YAML 会被重新序列化，提交前建议检查 diff，确认注释或格式变化是否符合预期。

### 图片

站点头图和周刊头图是固定文件名，上传后会覆盖对应 webp 文件。站点头图会同时生成桌面和移动端尺寸。

文章封面不会覆盖旧文件，而是新增递增编号文件。这样可以保持既有文章的封面引用稳定。

---

## 验证命令

Admin 相关代码有独立测试：

```bash
pnpm test:admin
```

常用检查命令：

```bash
pnpm exec biome check scripts/admin
pnpm exec astro check
pnpm build
```

如果改动了文档，也可以运行 Markdown 检查：

```bash
pnpm lint-md
```

---

## 维护建议

- 新增可写 API 时，先在 `shared/path-utils.ts` 明确允许目录或固定文件，再在服务端处理写入。
- 涉及文章路径的改动，要覆盖“创建文章”和“更新文章移动路径”两类测试。
- 涉及图片上传的改动，要覆盖文件名分配、非法图片、超大请求和固定头图覆盖。
- 新增 frontmatter 字段时，需要同步更新 `shared/types.ts`、`post-utils.ts`、`posts.ts` 的校验逻辑和 `ArticleWorkspace.tsx` 的表单状态。
