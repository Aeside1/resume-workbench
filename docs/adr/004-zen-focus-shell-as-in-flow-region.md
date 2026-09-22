# ADR 004: Zen 专注写作外壳采用「非模态区域展开」

- **状态（Status）**：Accepted（已确认，2026-09-14 验收对比后由用户拍板）
- **日期（Date）**：2026-09-14
- **决策者（Deciders）**：用户 & AI Pair
- **关联文档**：[ADR 001](001-ui-redesign-workbench-and-focus-canvas.md)、[ADR 003](003-adopt-heroui-native-visuals-and-single-token-theming.md)、[CONTEXT.md](../CONTEXT.md)

---

## 1. 背景与问题陈述（Context）

Zen 专注写作（`ZenFocusEditor`）原本的形态是**应用自研的全视口覆盖层**：`.scratch/scratchpad-and-zen-canvas/spec.md` 明确要求「挂载于顶层全屏层（Fixed Overlay，`z-index: 100`，`100vw * 100vh`）」，并由 Zen 自带一条顶栏（返回按钮、面包屑、保存指示器）。

HeroUI 迁移（ADR 003）之后，这个自研壳暴露出两个问题：

1. **它与框架的交互语义重复且更弱**：Esc 处理、遮罩、焦点约束全部自研，而迁移已经把 `Drawer`、`Modal` 交回框架（ADR 003 §6）。Zen 是唯一一个仍然自研"全屏浮层"语义的地方。
2. **它把整个工作台切开**：覆盖层盖住 AppShell 的面包屑顶栏，于是 Zen 里另起一条顶栏、另起一份保存指示器与面包屑；同一屏上出现两套"我在哪、存了没"的表达。

「Zen 外壳该用哪种形态」这个问题**只能靠实际体验区分**，故按 handoff 用一次性原型做了两档对比：

- **方案 1**（`prototype/zen-fullscreen-modal`）：把外壳交给框架的 HeroUI `Modal size="full"`，整屏仍被盖住，面包屑由 `Modal.Header` 渲染。
- **方案 3**（`prototype/zen-region-expand`）：不使用任何浮层，Zen 成为 AppShell 内容区里的一块，填满面包屑顶栏以下的剩余高度。

两者都实现了全部必保行为，两个分支的 `frontend/PROTOTYPE.md` 是本次决策的 primary source。

## 2. 决策要点（Decisions）

### 2.1 采用方案 3：Zen 是 AppShell 内容区里的一块，不是浮层

- 删除 `.zen-focus-overlay` 的 `position: fixed; inset: 0; z-index: 100`，以及 `@keyframes zenFadeIn`；
- 视口高度锁在 shell 上（`.app-shell--zen { height: 100vh; overflow: hidden }`），由内容区把「顶栏以下的剩余高度」整块交给 Zen，**页面级不滚动、滚动发生在区域内部**（写作区用 HeroUI `ScrollShadow`）；
- Zen 展开时画布区域**被替换**而不是被覆盖——退出后需要显式把视窗恢复回原卡片位置（记录 `window.scrollY` 后恢复 + `scrollIntoView({ block: 'nearest' })`）。

### 2.2 面包屑与保存态归 AppShell，且只有一套

- `AppShell` 的 `focus-topbar` 扩展为**三级结构化面包屑**：`经历内容 / <分组名> / <工作项标题>`；第 1 级退出整个专注模式、第 2 级回画布、第 3 级是当前位置（不可点，随就地编辑的大标题实时更新）；
- `AppShell` 新增 `focusActions` 插槽接收场景操作（Zen 展开时放「收起伴随栏」与 Esc 提示）；
- **Zen 自带的顶栏整体删除**（退出按钮 / 面包屑 / 保存 Chip / 本地 `saveStatus` 状态），保存态复用顶栏那个唯一的 `Chip`（文案 `保存中...` / `所有修改已保存`）。因为页面不滚、顶栏常驻，这个 Chip 在写作全程可见——比方案 1 里被弹窗盖住的那条持久提示更强。

### 2.3 顶栏必须处理长工作项标题

第三级是用户随手输入的工作项标题，长度不可控。约定：面包屑组可收缩（`min-width: 0`）、末级单行省略号，保证中间的保存态 Chip 永远不被顶掉。实测约 60 字标题时可用宽 810px / 内容宽 936px → 触发省略号，面包屑组右边界与 Chip 左边界相等、无重叠。

### 2.4 退出路径统一走 Zen 自身的 flush

- 退出入口有三个：`Esc`、顶栏返回按钮、面包屑第 2 级 → 回画布；面包屑第 1 级 → 回经历内容；
- 前三条都经过 `ZenFocusEditor` 的 `handleExit`（**先 flush 保存，再关闭**）；外壳到 Zen 的关闭是**命令下行**（`exitSignal` 计数），而不是把 Zen 的内部状态上提后由外壳直接卸载——否则会绕过 flush。

### 2.5 分层边界（执行 ADR 003 §2.2）

- **视觉实体**一律 HeroUI：区域底 `Surface`、面包屑 `Breadcrumbs`、伴随栏面板 `Card`、滚动 `ScrollShadow`、操作 `Button`、保存态 `Chip`、快捷键 `Kbd`；
- **布局骨架**保留原生 element 且只读语义变量：区域 flex 骨架与左右栅格约 16 行，加上 shell 侧的 `.app-shell--zen` 一组规则；**布局 CSS 落在 `styles/layout/*` 与 `styles/features/canvas/zen-region.css`**（落地期由 `zen-editor.css` 更名，骨架已不再含任何顶栏/覆盖层规则），不碰 Token 区、不新增字面色值、不使用 `!important`。

## 3. 决策影响（Consequences）

**正面：**

- 顶栏与保存态**常驻可见**，且屏幕上只有一套"我在哪、存了没"的表达；
- 退出成本极低（Esc 即回原位、零动画开销），跨层级导航可点（面包屑中间级回画布）；
- 删除一整套自研壳：fullscreen overlay、Zen 自带顶栏、自带面包屑/保存态、`framer-motion` 的进出场、手写 `window keydown`（Esc 仍需监听，但只剩一个监听点）；
- 深浅色、暗色下的"沉浸感"差距明显小于方案 1 的预期（区域底色与页面同色时视觉上接近全屏专注）。

**负面（明确放弃的东西）：**

- **放弃"进入另一个空间"的空间感**：方案 1 的全屏遮罩 + 框架进出场动画带来的"写作时与工作台断开"的体感，方案 3 没有；浅色模式下区域形态更接近"一页文档"，这是本决策最需要用户认同的代价；
- **`ZenFocusEditor` 不再自足**：退出、保存反馈、伴随栏开关都在外壳，单独渲染它时这三件事都不存在；外壳与 Zen 之间新增约 5 处 prop 接线（三处上行、一处下行、一处透传）。更省接线的替代是「AppShell 提供空 slot + Zen 用 portal 渲染」，本次未采用、也未验证；
- **顶栏开始承担 Zen 的语境**：第三级的截断约定（§2.3）是新增的顶栏契约；
- **回到原位依赖一次显式恢复**：画布被区域内替后是"卸载 → 重挂"，比"浮层下面一直挂着"脆弱一点（实测 `scrollY` 精确恢复）；
- **落地时既有断言必须按新口径改写**：原型分支上 156 条里 9 条红（3 条面包屑由 Button 变框架 Link、4 条 Zen 的顶栏/退出按钮/保存文案、2 条 `role="dialog"` 全屏工作台）。这是口径变更而非放宽断言，实现期需逐条重写。

## 4. 与既有决策的关系

- **取代**：`.scratch/scratchpad-and-zen-canvas/spec.md` §1「全屏专注写作工作台（`ZenFocusEditor`）」中的外壳条款——「挂载于顶层全屏层（Fixed Overlay，`z-index: 100`，`100vw * 100vh`）」「顶部由轻量 Topbar 组成」。该 spec 关于**内容**的部分（双栏对照、右侧可折叠伴随面板、Escape 退出、800ms 防抖保存）全部继续有效。
- **执行**：ADR 003 §2.2（视觉实体 HeroUI 化、布局骨架保留语义容器）与 §2.3（颜色只在语义 Token 定义一次）。
- **不推翻**：ADR 001 的双场景架构。Zen 仍是场景 2（专注画布）内部的一个子态，只是不再是一个独立的全视口场景。
- **冲突声明（按 `docs/agents/domain.md`）**：本案的冲突对象是**规格文件**而非既有 ADR——ADR 001 §2.1 场景 2 从未描述 Zen 的外壳形态（它描述的是画布顶栏）。因此本次以**新增 ADR 004** 的方式记录，并在 ADR 001 §2.1 处加一行指针；被取代的 spec 条款不动原文，以本 ADR 为准。

## 5. 证据（Primary sources）

- **采用方案**：`prototype/zen-region-expand`（worktree `.worktrees/zen-proto-b`，本地栈 5176 / 8003 / 5435），3 个提交 `cd77ca3` / `ee47577` / `c41dff6`；`frontend/PROTOTYPE.md` 记录了实现要点、取舍、六项判断标准的逐条观察结论与建议。
- **对比方案**：`prototype/zen-fullscreen-modal`（worktree `.worktrees/zen-proto-a`，栈 5175 / 8002 / 5434），其 `frontend/PROTOTYPE.md` 末尾的「决策记录」列出了未采纳理由与三条仍有效的产出。
- **实测数字（方案 3）**：区域 `top=56 / height=844`（视口 900，顶栏 56）→ 恰好填满顶栏以下；`document.scrollHeight - innerHeight = 0`；写作区 computed `overflow-y: auto`；第二张卡片、页面已滚动（`scrollY=516`）时 Esc 退出后 `scrollY` 仍为 516 且卡片落在视口内；约 60 字标题触发省略号且不挤占 Chip。
- **截图**：`.worktrees/zenproto-b-*.png`（25 张，light/dark 各一套：hub / canvas / zen / topbar / saving / saved / longtitle / collapsed / scroll / back-to-canvas / after-esc / 第二张卡片进出 / 伴随栏新增版本）。
- **两个原型都未合回** `experiment/heroui-migration`，按 primary source 保留分支。
- **这两个分支不入公开版本库**：它们是 throwaway 实验产物（本节前述的原型提交均已在本 ADR 落地时重写），仅作为本决策的本地取证材料保留。公开仓库里没有它们，因此上面引用的原型提交 SHA 与 `frontend/PROTOTYPE.md` 不可从公网取得——本节的叙述与实测数字即为可发布的决策依据，需要重跑取证时按 handoff 的手法重建即可。

## 6. 落地与遗留

- **落地状态（2026-09-14）**：已按本 ADR 落地在 `feat/zen-shell-region-expand`（worktree `.worktrees/zen-region-expand`，独立栈 5177/8004/5436），落地清单与逐条证据见 `.scratch/hero-ui-migration/issues/12-zen-shell-region-expand.md` 的 `## Answer`。
  - `ZenFocusEditor` 的 `group` prop 与 `AppShell` 的 `breadcrumb?: string` 兜底入口均已删除；区域骨架收敛为 `styles/features/canvas/zen-region.css`（原 `zen-editor.css` 删除）。
  - 退出前的脏判据已按 §2.4 修正为「先 flush 再离开」+ 只反映真正的未保存编辑（「Zen 展开」不再等于 dirty），脏标记改存 ref。
  - 落地期在排查保存态 Chip 可见性时另修掉一个既有缺陷：`FocusCanvasContainer` 每次保存成功都挂一个 `setTimeout(2500)` 把保存态归零，连续保存时会用陈旧定时器提前清掉新一轮的 `保存中`——已改为单一 `setSaveStatus` 助手重置同一个定时器（§2.2 的「顶栏 Chip 全程可见」随之成立）。
  - 落地清单 C 的「portal 插槽替代接线」经评估**不采用**（理由见 issue 12 Answer §1）；D4 经用户口径决定**不接**浏览器历史与 `document.title`。
  - **画布卡片内联保存徽章（issue 13，2026-09-14）**：§2.2 的「只有一套」是就 **Zen 展开期间的外壳层**说的——那一屏确实只有顶栏一条。画布的就地编辑表单另有一条**卡片级**徽章（作用域是这张卡片本身），与**场景级**的顶栏 Chip 共存，且两者共用同一套 2.5s 归零口径（`frontend/src/features/useTransientSaveStatus.ts`），不会出现两处反馈时间线打架。issue 13 在「修 / 删 / 降级」中选择了「修」，理由见该票 `## Answer` §1。
  - **合入状态（2026-09-14）**：本 ADR 的落地已随迁移线 **fast-forward 合入 `main`**（30 个提交）；同期清理掉两套并行栈（`resume-workbench-zenproto-b` / `resume-workbench-zen-region`）与对应工作区。最终验收见内部迁移线 issue 16 的 `## Answer`（本地 issue tracker，不入版本库）。
- 验收关卡：`npm run test` 162 passed、`typecheck` 0 错误、`build` 成功；必保行为在真实浏览器逐条复测（Esc 退出、退出后回到原卡片位置含已滚动场景、800ms 防抖、退出前 flush、伴随栏开合、大标题就地编辑），截图见 `.worktrees/v13-*.png`（深浅各 12 张）。
- **不要把原型提交 cherry-pick 到迁移线**——原型按 throwaway 标准写（保留未读取的 `group` prop、为兼容旧测试留的字符串面包屑兜底等），实现期按清单重写。
- 遗留（与外壳形态无关，需单独处理）：真实浏览器里**双击卡片标题不会进入专注模式**。基线栈（5174）与方案 3 栈（5176）用同一脚本复现一致：第一次单击先触发 `onPress` 把卡片切成就地编辑态并重渲染，浏览器不再合成 `dblclick`，标题 `Button` 上的 `onDoubleClick` 永远收不到；jsdom 的 `fireEvent.doubleClick` 直接派发事件，所以测试一直是绿的。建议单独开 issue。**（本条款已由下一条处置，2026-09-14。）**
  - **已处置（2026-09-14，内部 issue 14）**：按用户口径**退役**该交互——标题按钮删掉 `onDoubleClick`、Tooltip 文案改为「单击就地编辑」，专注入口只保留卡片上的「展开专注」按钮；两处 jsdom 用例按新口径重写。真实浏览器实测：真实双击后 `zen已展开=false` 且卡片进入就地编辑态（单击语义未受影响），点按钮可正常展开、Esc 可退出。**若要复活**：必须先解决「单击先切编辑态吃掉 `dblclick` 合成」的根因，并配一条真实浏览器可证伪的验收。

## 7. 范围收窄说明（2026-09-15，ADR 006）

§2.2 与 §2.4 中「顶栏（面包屑 + 保存态 Chip + 场景动作）归 AppShell」的适用范围**收窄为 Zen 形态**：

- 分组画布与简历方案编辑器改在 `workspace` 形态展开（侧边栏常驻），它们不再有全局顶栏，「返回 / 标题 / 保存态 / 动作」由内容区自带的页头承担；
- Zen 展开时仍然是「区域内替 + 顶栏全权接管」，§2.1「非模态区域展开」的核心结论不变；
- 本 ADR 末尾提到的 162 项关卡数字属迁移线收口时的快照，后续切片的数字以其票面记录为准。
