---
name: issue-delivery
description: 认领并交付本仓库的一个 GitHub issue：fork branch + git worktree 隔离主工作区、独立 compose 栈与端口、全绿关卡、交付前跑 code-review、回填 Answer 并关闭票面。当用户说「认领 #n」「完成这个 issue」「按 issue 交付流程做」，或给出 Aeside1/resume-workbench 的 issue 链接要求处理时使用。
---

# Issue 交付流程

完整流程与理由在 `docs/agents/issue-delivery.md`，先读它；本文件只固化不可省的约束。

工作目录：本仓库根（`G:\Github\resume-workbench`）。所有 tracker 操作走 `gh` CLI。

## 不可省的硬约束

1. **先放行，再动手**：票面标签必须 `ready-for-agent`；`blocked_by > 0` 或标签是 `needs-triage` / `needs-info` 时停下，向用户说明缺什么。
2. **认领是一次写入**：`gh issue edit <n> --add-assignee @me`。
3. **隔离**：`git worktree add .worktrees/issue<n>-<slug> -b <type>/<n>-<slug> origin/main`。分支 `<type>/<n>-<slug>`，type ∈ feat/fix/refactor/docs/chore/test。绝不在 `main` 检出里改代码。
4. **独立运行栈**：compose 项目名 `-p resume-workbench-<slug>`，端口从 5174 / 8001 / 5433 起顺延，覆盖配置写成独立完整 compose 文件放 `.worktrees/` 下（叠加 `-f` 时 ports 会追加）。开工前 `docker ps` 查占用，收工只 `down` 自己的项目名。
5. **关卡必须真跑**：`npm run typecheck`、`npm run test`、`npm run build`、`python -m pytest -q backend/tests`（`TEST_DATABASE_URL` 指本工作区 db 端口）。UI 改动补浏览器取证。数字照实写。
6. **交付前必过 `code-review` skill**：基准点 `git merge-base origin/main HEAD`，看 Standards 与 Spec 两轴；阻断项修完复查。
7. **收口**：票面回填 `## Answer`（改动清单 + 关卡数字 + 证据）→ `gh issue close <n> --reason completed --comment "<Answer>"`；父票 `Part of #<m>` 勾选并更新状态行。
8. **不越权**：不 push、不合 `main`、不动他人分支与容器，除非用户明确要求。

## 执行顺序

0 读票 → 1 认领 → 2 worktree+branch → 3 起独立栈 → 4 实现（行为变更测试先行）→ 5 关卡 → 6 中文 commit → 7 code-review → 8 回填 Answer 并关闭 → 9 汇报与清理。

实现细节遵守根目录 `AGENTS.md`：HeroUI / React Aria 用 `onPress`、卡片操作区与主体点击解耦、不用 `!important` 对抗框架、图标统一、全项目禁 Emoji、语义色适配深浅色；领域术语以 `docs/CONTEXT.md` 为准。

## 汇报格式

四段：分支与 worktree / 改动清单 / 关卡数字 / 未做项与后续。

## 常见坑

- `gh issue close` 没有 `--comment-file`；多行正文先落文件再 `--comment "$(Get-Content -Raw file)"`。
- PowerShell 里 `gh ... --jq .body` 返回行数组：先拼成单个字符串（`-join` + LF）再处理；`Out-File -NoNewline` 会无分隔拼接数组，用 `[System.IO.File]::WriteAllText`。
- 本仓库无 Alembic：新表靠 `create_all`，数据搬运写幂等 `backend/migrate_*.sql`。
