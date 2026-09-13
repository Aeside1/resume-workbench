# 简历工作台工程协作约定

## Agent skills

### Issue tracker

本仓库使用 `.scratch/` 下的本地 Markdown 文件管理需求规格和开发任务。详见 `docs/agents/issue-tracker.md`。

### Triage labels

本仓库使用 5 个标准 triage 标签：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。详见 `docs/agents/triage-labels.md`。

### Domain docs

本仓库使用单上下文领域文档结构：根目录维护 `CONTEXT.md`，ADR 文件维护在 `docs/adr/`。详见 `docs/agents/domain.md`。

## 前端组件与样式规范（HeroUI / React Aria）

为防止 HeroUI / React Aria 组件在生产环境或弹窗内渲染失效与交互异常，必须遵循以下规则：

1. **点击交互统一使用 `onPress`**：
   HeroUI `Button` 基于 React Aria，内部使用 `usePress` 机制。点击交互必须使用 `onPress` 属性（或同时兼容 `onClick`），严禁仅写 `onClick` 导致真实浏览器中点击无效。
2. **卡片内嵌套操作严格隔离**：
   当卡片整体可点击跳转时，卡片底部的操作按钮区域（如归档、删除）必须与卡片主体点击区域物理解耦（不在包含按钮的 Footer 上绑定父级点击），并在按钮回调中阻断事件冒泡，防止操作时误触发卡片跳转。
3. **全局基础组件样式以 HeroUI 为准，严禁对抗式覆盖**：
   已接入 `@tailwindcss/vite`，`@heroui/styles` 中的 `@apply` 会被正常编译，HeroUI 组件（Button/Card/Chip/Modal/Select 等）的默认变体样式可直接生效。因此**严禁**再用 `button[data-slot="button"] { … !important }` 这类全局 `!important` 规则去重写框架外观（此类文件已删除，如 `styles/components/buttons.css`）。若个别组件确有需要，应通过语义变量或组件自身的 `variant`/`size` 属性表达，而非覆盖框架。
4. **统一图标与框架组件规范（避免手搓图标并全面适配深浅色模式）**：
   开发界面与交互组件时，尽量避免自行手写内联 SVG 矢量代码或使用纯文本字符（如“x”、“+”等）充当图标，优先统一使用框架（`@heroui/react`）内置提供的组件或官方标准图标（如 `CloseIcon`、`IconPlus` 等）。所有组件与图标必须整体适配 HeroUI 的浅色（Light）与深色（Dark）模式切换，图标颜色统一采用 `currentColor` 随文本语义流转，背景、文本与边框优先使用语义化主题变量（如 `var(--surface)`、`var(--foreground)`、`var(--border)`、`var(--muted)` 等）或配置 `.dark` 变体，严禁写死绝对明暗色值导致暗色模式下失真或元素不可见。
5. **严禁在界面与文案中使用 Emoji 字符**：
   全项目严禁在任何界面展示文本、空状态占位符、操作引导、按钮图标或系统提示中硬编码 Emoji 字符（如 📝、💡、🚀 等），杜绝 AI Demo 的廉价玩具质感。空状态与各类视觉传达应统一使用框架内置标准矢量图标组件或纯净利落的工程级排版布局。

## 并行工作区与本地环境隔离

当使用 `git worktree` 并行开发（例如实验分支与 `main` 同时运行）时，严禁与主工作区共用同一套 Docker 容器与端口，必须为当前工作区创建独立的一套：

1. **独立 compose 项目名**：
   一律用 `-p` 指定专属项目名（如 `-p resume-workbench-<slug>`），使容器、网络与数据卷自动带前缀，与主工作区彻底隔离。严禁对主工作区的栈执行 `down`、`stop` 或重建。
2. **端口不得与主工作区冲突**：
   主工作区默认占用 `5173`（web）、`8000`（api）、`5432`（db）。并行工作区必须改用另一组端口（约定自 `5174` / `8001` / `5433` 起顺延），启动前先用 `docker ps` 确认未被占用。
3. **隔离配置以本地文件维护，不进版本库**：
   覆盖用的 compose 文件放在已被 `.gitignore` 忽略的 `.worktrees/` 下。注意 Compose 合并时对 `ports` 是**追加而非替换**（`-f` 叠加会导致新旧端口同时保留、依旧冲突），因此必须写**独立完整的 compose 文件**，并用 `--project-directory` 指向当前工作区以保证 `build` 上下文正确。
4. **前端 API 地址与后端 CORS 必须指向本工作区**：
   前端构建期用 `--build-arg VITE_API_URL=http://localhost:<api端口>` 注入，否则会回退到默认的 `8000` 而把页面请求打到主工作区的 API；后端用 `CORS_ORIGINS` 环境变量（逗号分隔）放开本工作区的来源端口，否则浏览器会因跨源被拦截。
5. **启动与验证**：
   在 worktree 根目录执行：

   ```bash
   docker compose -p resume-workbench-<slug> --project-directory . \
     -f ../docker-compose.<slug>.yml up -d --build
   ```

   启动后必须确认三点：`docker ps` 中两套容器端口互不冲突；`curl http://localhost:<api端口>/api/health` 返回 `{"status":"ok"}`；前端首页可访问。

## Git 协作规范

1. **Commit Message 统一使用中文**：
   本仓库的所有 Git 提交信息（commit message）必须统一使用中文编写，采用清晰的 `类型(模块): 简述` 格式，正文列明关键变更点，严禁使用纯英文 commit。

## Review

1. 在每次完成 issue 后交付结果前，请先调用 skill`code-review` 进行验收审查后再向用户汇报回复。
