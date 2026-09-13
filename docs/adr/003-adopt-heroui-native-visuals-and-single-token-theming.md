# ADR 003: 全面采用 HeroUI 原生视觉与单一 Token 主题体系

- **状态（Status）**：Accepted（已确认）
- **日期（Date）**：2026-09-19
- **决策者（Deciders）**：用户 & AI Pair
- **关联文档**：[ADR 001](001-ui-redesign-workbench-and-focus-canvas.md)、[ADR 002](002-retire-workspaces-flatten-to-user.md)、[CONTEXT.md](../../CONTEXT.md)、[.scratch/hero-ui-migration/spec.md](../../.scratch/hero-ui-migration/spec.md)

---

## 1. 背景与问题陈述（Context）

ADR 001 第 2.3 节早已明确设计系统决策：**"严格遵循 HeroUI 设计规范，提供浅色（Light）与深色（Dark）双主题支持"**。然而该决策在此后的实现中并未真正落地：

1. **HeroUI 仅有名义接入**：21 个非测试组件文件中 import 了 `@heroui/react`，但实际仅使用了 `Button`、`Card`、`Modal`、`Input`、`Select` 等极少数组件。界面主体由约 380 处原生 HTML 元素 + 自定义 CSS 堆叠而成。
2. **主题切换完全缺失**：`main.tsx` 未接入任何主题机制，`index.html` 上没有 `.dark` 或 `data-theme` 属性。深浅色切换从零开始都不存在。
3. **色值全面硬编码**：`frontend/src/styles/` 下 19 个 CSS 文件中共有 566 处硬编码 hex 色值（78 个唯一值），另有大量 `rgba()` 阴影与透明色，全部没有 `.dark` 变体，也完全未使用 HeroUI 的语义化 CSS 变量。
4. **风格与框架持续对抗**：自定义 CSS 通过 `!important` 反复覆盖 HeroUI 组件默认样式（例如 `.sidebar-nav-item` 多达 12 个 `!important`），形成"引入框架却手工重写框架"的高维护成本状态。

## 2. 决策要点（Decisions）

### 2.1 接受 HeroUI 原生视觉作为设计基线

放弃对组件视觉细节的像素级控制权，明确以 **HeroUI 组件默认视觉为最终呈现基线**：

- 不为还原既有 CSS 而在 HeroUI 组件上大量编写 `className` 覆盖；
- 允许圆角、阴影、内边距、hover 动效等细节随 HeroUI 默认值发生可见变化；
- 风格向框架靠拢是**有意接受的结果**，而非回归缺陷。

### 2.2 视觉实体 HeroUI 化，布局骨架保留语义容器

"全面 HeroUI 化"的边界定义为分层结构：

- **视觉实体**（卡片、按钮、徽章、弹窗、抽屉、标签页、表单控件、分隔线、骨架屏）→ 一律改用 HeroUI 组件；
- **布局骨架**（grid/flex 容器、间距、定位、双栏结构）→ 保留原生 `div` + 语义 class，因为框架不提供布局原语；
- 布局容器自身的颜色、圆角、间距改为读取 HeroUI 语义变量，不再硬编码。

### 2.3 颜色仅在 HeroUI 语义 Token 定义一次

`@heroui/styles` 已内置完整的语义变量体系（`--background`、`--surface`、`--foreground`、`--muted`、`--border`、`--separator`、`--overlay`、`--accent`、`--success`、`--warning`、`--danger` 及其 `-soft`/`-hover` 派生值），并在同一文件内提供 `.dark` 覆盖。

- 该变量集是**主题的唯一真相来源**：HeroUI 组件与其后残留的自定义样式都读取同一批变量；
- 通过在 `<html>` 上增删 `.dark` class 完成切换，两端同步响应；
- 禁止新增硬编码色值；如遇品牌私有色（如经历类型标签），以自定义 `--tag-*` 变量形式定义，并在 `.dark` 下提供对应值。

### 2.4 深浅色随本次重构一并交付

深色模式纳入本次范围，与重构同步完成，不拆分到后续迭代。理由：HeroUI 组件的深色能力随组件即得，分离交付会导致同一批文件被改造两次。

## 3. 决策影响（Consequences）

**正面：**

- 维护面从 78 个唯一色值收敛到约 15–20 个语义变量，且只有一处定义；
- 深浅色切换天然生效，无需双轨维护；
- 消除 `!important` 覆盖框架的对抗式样式，CSS 体积与心智负担显著下降；
- 既有 410+ 条基于可访问性语义（`getByRole`/`getByText`/`getByLabelText`）的测试构成重构安全网，仅 2 处依赖 DOM 结构查询。

**负面：**

- 最终界面外观将与现有实现存在可见差异，属于**已接受的代价**；
- 部分高度定制视觉（如图标颜色随语义流转、精确的归档虚线态）需重新设计而非平移。

## 4. 与既有 ADR 的关系

本 ADR **不推翻 ADR 001**，而是**执行其在 2.3 节中已作出、却未被实现的设计系统决策**。ADR 001 关于双场景架构（Hub / Focus Canvas）、信息密度克制原则的决定继续有效；ADR 002 关于扁平化至单一用户工作空间的决定不受影响。

## 5. 修订说明（2026-09-14，issue 02 实现期）

原文 2.1 “接受 HeroUI 原生视觉”存在一个未被识别的前提：**HeroUI 组件样式能够真正生效**。实现期发现 `vite.config.ts` 未接入 Tailwind 插件，`@heroui/styles` 中的 `@apply` 全部未被编译，导致所有 HeroUI 组件实际退化为无样式裸元素（开关轨道、按钮、卡片均受影响）。

已通过在构建中接入 `@tailwindcss/vite` 解决（产物中 `@apply` 残留降为 0，CSS gzip 由 43 kB 增至 47 kB）。**自本次修订起，2.1 与 2.3 的论述才真正成立**，ADR 的决策方向不变。相应地，AGENTS.md 原“基础组件显式维护全局 CSS 样式”一条已改写为“全局基础组件样式以 HeroUI 为准，严禁对抗式覆盖”。
