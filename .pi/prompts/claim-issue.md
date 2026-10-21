---
description: 认领并完成一个 GitHub issue（fork branch + worktree 隔离主工作区）
argument-hint: "<issue 编号或 URL> [补充要求]"
---
请你认领并完成这个 issue：$1

补充要求（没有就忽略）：${@:2}

按 `/skill:issue-delivery`（完整流程见仓库 `docs/agents/issue-delivery.md`）执行：

1. 读票面 + 评论，确认标签是 `ready-for-agent` 且无未关闭的阻塞方；不满足就先说清缺什么并停下。
2. `gh issue edit <n> --add-assignee @me` 认领。
3. `git worktree add .worktrees/issue<n>-<slug> -b <type>/<n>-<slug> origin/main`，所有改动只在这个 worktree 里做。
4. 起独立 compose 栈（项目名 `resume-workbench-<slug>`，端口 5174/8001/5433 起顺延），不动主工作区的容器与端口。
5. 实现后跑全绿关卡（typecheck / test / build / pytest），数字照实记录。
6. 交付前用 `code-review` skill 在分叉点 `git merge-base origin/main HEAD` 上做 Standards + Spec 两轴审查，修掉阻断项。
7. 回填票面 `## Answer` 并 `gh issue close`；父票子任务一并勾选。
8. 汇报四段：分支与 worktree / 改动清单 / 关卡数字 / 未做项与后续。

开工前先把票面验收清单和你的实现路径摆给我确认，再动代码。
