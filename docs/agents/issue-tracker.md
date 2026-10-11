# Issue Tracker：GitHub Issues

本仓库的规格与开发任务**全部**记录在 GitHub Issues 中，不再使用 `.scratch/` 下的本地 Markdown（该约定已于 2026-10-12 迁移，见本文件末尾「迁移说明」）。所有操作使用 `gh` CLI。

仓库：`Aeside1/resume-workbench`。在克隆目录内执行 `gh` 时会自动推断仓库，无需显式传 `--repo`。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文用 heredoc 传入。
- **读取 issue**：`gh issue view <number> --comments`，用 `jq` 过滤评论，并一并取回 labels。
- **列出 issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，配合 `--label` 与 `--state` 过滤。
- **评论**：`gh issue comment <number> --body "..."`
- **打标签 / 去标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

## 对象映射

原先「一个功能一个目录 + spec 文件 + issues 目录」的结构，在 GitHub 上对应：

| 原本地结构 | GitHub 对应物 |
|---|---|
| `.scratch/<feature-slug>/spec.md` | 一个带 `spec` 标签的 issue，作为该功能的**父 issue** |
| `.scratch/<feature-slug>/issues/NN-<slug>.md` | 一条独立 issue；在父 issue 的正文任务列表中登记，正文首行写 `Part of #<父 issue 号>` |
| 文件顶部 `Status: <triage 标签>` | issue 上的 triage label（见 `triage-labels.md`） |
| `## Comments` 章节 | issue 评论区 |
| `## Answer` 章节 | 关闭时的一条评论（`gh issue close --comment`） |
| `Blocked by: NN, NN` | GitHub **原生 issue 依赖**（`blocked_by`），见下文 |
| 认领任务 | `gh issue edit <n> --add-assignee @me` |

任务正文沿用中文，保持原有的 `What to build` / 验收清单 / 证据三段结构不变——迁移的是载体，不是写法。

## 阻塞关系

使用 GitHub 的**原生 issue 依赖**，这是唯一在 UI 里可见、可被 `/wayfinder` 直接查询的表示。

添加一条边（child 被 blocker 阻塞）：

```bash
gh api --method POST repos/Aeside1/resume-workbench/issues/<child>/dependencies/blocked_by \
  -F issue_id=<blocker-db-id>
```

`<blocker-db-id>` 是阻塞方的**数据库数字 id**，不是 `#number` 也不是 `node_id`：

```bash
gh api repos/Aeside1/resume-workbench/issues/<n> --jq .id
```

GitHub 通过 `issue_dependencies_summary.blocked_by` 报告**尚未关闭的**阻塞方数量（这才是实时的闸门）。若某天该能力不可用，退回在正文首行写 `Blocked by: #<n>, #<n>`；只要还有任一阻塞方未关闭，该任务就不算解锁。

## Pull requests 作为受理面

**PRs as a request surface: no.**（若本仓库日后把外部 PR 当作功能请求受理，把此值改为 `yes`；`/triage` 会读这个开关。）

设为 `yes` 时，PR 走与 issue 完全相同的标签与状态，命令换成 `gh pr` 等价物：

- **读取 PR**：`gh pr view <number> --comments`，diff 用 `gh pr diff <number>`。
- **列出待 triage 的外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，只保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR`、`NONE` 的（丢掉 `OWNER`/`MEMBER`/`COLLABORATOR`）。
- **评论 / 打标签 / 关闭**：`gh pr comment`、`gh pr edit --add-label`/`--remove-label`、`gh pr close`。

GitHub 的 issue 与 PR 共用一个编号空间，所以裸写 `#42` 可能指两者之一：先用 `gh pr view 42` 解析，失败再退回 `gh issue view 42`。

## 技能术语对照

- 技能说「发布到 issue tracker」→ 创建一条 GitHub issue。
- 技能说「获取相关任务」→ `gh issue view <number> --comments`。

## Wayfinding 操作

供 `/wayfinder` 使用。**地图**是一条 issue，**子任务**是它的子 issue。本仓库尚未创建 `wayfinder:*` 标签，首次使用该流程时再建（下面的命令按需自行补 `gh label create`）。

- **地图**：一条带 `wayfinder:map` 标签的 issue，正文承载 Notes / Decisions-so-far / Fog。`gh issue create --label wayfinder:map`。
- **子任务**：作为地图的 GitHub sub-issue 关联（走 `gh api` 的 sub-issues 端点）。若仓库未启用 sub-issues，就把它加进地图正文的任务列表，并在子任务正文首行写 `Part of #<地图号>`。标签用 `wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。一旦认领，任务指派给驱动的开发者。
- **阻塞**：见上文「阻塞关系」。
- **前沿查询**：列出地图下所有未关闭子任务（`gh issue list --state open`，范围限定该地图的 sub-issues / 任务列表），剔除任何还有未关闭阻塞方的（`issue_dependencies_summary.blocked_by > 0`，或 `Blocked by` 行里仍有未关闭的 issue）以及已被指派的；按地图顺序取第一个。
- **认领**：`gh issue edit <n> --add-assignee @me`，这是本次会话的第一次写入。
- **解决**：`gh issue comment <n> --body "<结论>"` → `gh issue close <n>` → 把上下文指针（要点 + 链接）追加到地图的 Decisions-so-far。

## 迁移说明

2026-10-12 之前，规格与任务维护在 `.scratch/<feature-slug>/` 下的本地 Markdown 文件里，该目录不入版本库。迁移时把所有**未收口**的条目转成了 GitHub issue，已收口的目录与一次性取证产物直接删除。

`.scratch/` 已整体删除：**不要再往那里写任何规格或任务**。部署相关的探查脚本、发布日志与临时产物现在放在 `scripts/deploy/`，按仓库既有约定（`.git/info/exclude`）只在本地保留、不进版本库——它们与 issue tracker 无关。
