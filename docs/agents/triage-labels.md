# Triage 标签

技能只用五个标准 triage 角色说话。本文件把这五个角色映射到本仓库 issue tracker（GitHub Issues）上真实存在的标签字符串。

| 标准角色 | 本仓库 GitHub 标签 | 含义 |
|---|---|---|
| `needs-triage` | `needs-triage` | 等待维护者评估 |
| `needs-info` | `needs-info` | 等待补充信息 |
| `ready-for-agent` | `ready-for-agent` | 规格完整，可以交给 Agent |
| `ready-for-human` | `ready-for-human` | 需要人工实现 |
| `wontfix` | `wontfix` | 不处理该任务 |

其中 `needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` 四个由本次 tracker 迁移新建；`wontfix` 是 GitHub 默认标签，沿用未改。`ready-for-human` 目前尚无使用者，保留以免将来需要时重建。

另有一个非 triage 的辅助标签：

| 标签 | 含义 |
|---|---|
| `spec` | 需求规格；作为某个功能的父 issue，其子任务用 `Part of #<n>` 关联 |

当技能提到某个 triage 角色（例如「打上 AFK-ready 标签」）时，使用本表右列对应的标签字符串。

标签的增删改一律在 GitHub 上做（`gh label create` / `gh label edit`），本文件只是映射表，不是标签的定义源。
