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
3. **基础组件显式维护全局 CSS 样式**：
   在 Tailwind 4 与当前打包环境下，HeroUI 默认变体（如 `.button--primary`、`.button--ghost`、`[data-slot="select-trigger"]`）不能仅依赖局部容器 class（如 `.stack-form`）。必须在 `styles.css` 中声明完备的全局基础组件样式（按钮所有 variant、输入框、下拉选择器及其 Popover 高 z-index），杜绝组件在 Modal 等新容器内退化为无样式的裸元素。

## Git 协作规范

1. **Commit Message 统一使用中文**：
   本仓库的所有 Git 提交信息（commit message）必须统一使用中文编写，采用清晰的 `类型(模块): 简述` 格式，正文列明关键变更点，严禁使用纯英文 commit。


