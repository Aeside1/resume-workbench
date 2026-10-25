# Issue 交付流程

一个 issue 从「认领」到「收口」的完整流程。适用于任何一个标了 `ready-for-agent` 的票。

- 一句话触发：pi 里 `/claim-issue <编号或 URL>`（模板见 `.pi/prompts/claim-issue.md`），或直接说「认领 #n 并完成」。
- Agent 侧的强制版见 `.pi/skills/issue-delivery/SKILL.md`（同一份流程的精简约束）。
- 术语与标签见 `issue-tracker.md`、`triage-labels.md`；并行工作区的容器隔离细节见根目录 `AGENTS.md`。

核心原则：**一个 issue 一条 fork 分支 + 一个 worktree + 一套独立运行栈**，主工作区（`main` 检出、5173/8000/5432）全程不受影响。

---

## 0. 读票与放行判断

```bash
gh issue view <n> --comments
gh api repos/Aeside1/resume-workbench/issues/<n> --jq .issue_dependencies_summary.blocked_by
```

- 标签必须是 `ready-for-agent`。是 `needs-triage` / `needs-info` 就**不要开工**，先按 `triage-labels.md` 收口问题，或回去问用户。
- `blocked_by > 0` 就不算解锁，停下说明还缺哪一张。
- 票面比一个切片大时先拆子 issue（`Part of #<n>`），不要在一个分支里塞两张票。
- 票面口径与当前代码/文档冲突时，先指出冲突并确认，按字面实现过期口径是浪费。

## 1. 认领

```bash
gh issue edit <n> --add-assignee @me
```

这是本会话对票面的唯一默认写入（见根目录 `AGENTS.md` 的「Issue 写权限」）。认领后即代表「这张票我做」。同时把票面验收清单抄进 todo 计划，逐条对照。

标签、评论、标题 / 正文、关闭 / 重开都要用户当轮明确授权；**不要从「做完」推导出「可以关票」**。

## 2. fork branch + worktree

命名约定（与仓库既有分支一致）：

| 对象 | 形式 | 例 |
|---|---|---|
| 分支 | `<type>/<n>-<slug>` | `feat/12-guest-workbench` |
| worktree 目录 | `.worktrees/issue<n>-<slug>` | `.worktrees/issue12-guest` |

`<type>` ∈ `feat` / `fix` / `refactor` / `docs` / `chore` / `test`；`<slug>` 用英文短横线，≤ 4 词。`.worktrees/` 已被 gitignore。

```powershell
git fetch origin
git worktree add .worktrees/issue<n>-<slug> -b <type>/<n>-<slug> origin/main
cd .worktrees/issue<n>-<slug>
```

- 不在 `main` 检出里改代码，也不复用别的 worktree。
- 收工时 `git worktree remove .worktrees/issue<n>-<slug>`；分支保留，等用户决定合并。

## 3. 独立运行环境（不得复用主工作区容器）

完整规则见 `AGENTS.md`「并行工作区与本地环境隔离」，执行要点：

1. 先 `docker ps` 查端口占用；本工作区端口从 `5174`（web）/ `8001`（api）/ `5433`（db）起顺延。
2. 独立 compose 项目名：`-p resume-workbench-<slug>`。
3. 覆盖配置写成**独立完整**的 compose 文件放在 `.worktrees/` 下——`-f` 叠加时 `ports` 是**追加**不是替换，叠出来的文件依旧冲突。
4. `--project-directory .` 指向当前工作区，保证 build context 正确。
5. 前端构建注入 `--build-arg VITE_API_URL=http://localhost:<api端口>`；后端设 `CORS_ORIGINS` 放开本工作区来源。
6. 启动后三项验证：端口互不冲突、`curl http://localhost:<api端口>/api/health` → `{"status":"ok"}`、前端首页可打开。

## 4. 实现

- 先读票面验收清单、父规格（`Part of #<n>`）、相关 ADR 与 `docs/CONTEXT.md` 术语；界面文案必须用 CONTEXT.md 的正式名。
- 行为变更测试先行：先写出会在当前代码上失败的用例，再让它变绿。
- 前端遵守 `AGENTS.md` 的 HeroUI / React Aria 规范：点击用 `onPress`、卡片操作区与主体解耦、不自作 `!important` 覆盖、统一图标、禁 Emoji、语义色适配深浅色。
- 缝开在稳定接口（API seam / 领域函数 / 组件契约），不为测试去测内部实现细节。
- 票外问题不顺手重构：记成 issue 评论或新票，交付时说明。

## 5. 关卡（全绿才算完成，记录真实数字）

```powershell
# 前端（worktree 下的 frontend/）
npm run typecheck
npm run test
npm run build

# 后端（worktree 根目录；db 端口用本工作区的）
$env:TEST_DATABASE_URL = "postgresql+psycopg://resume:resume_dev_password@localhost:<db端口>/resume_workbench"
python -m pytest -q backend/tests
```

- 有 UI 改动的补真实浏览器取证：`npm run test:editor:e2e` 或等价探针 + 截图。
- 关卡数字（`X passed / Y files`、typecheck 0 error）写进交付汇报与 issue 的 `## Answer`。
- 严禁写「应该通过」「预计没问题」——没跑就是没跑。

## 6. 提交

- 中文 commit，`类型(模块): 简述`，正文列关键变更点与「为什么」；一张票可按切片多次提交。
- 探针脚本、日志、截图不进版本库（`.worktrees/`、`scripts/deploy/` 已在忽略口径内）。
- 不 `push`、不合并 `main`、不动别人的分支——除非用户明确要求。

## 7. code-review（交付前必过）

- 调 `code-review` skill，基准点取分叉处：`git merge-base origin/main HEAD`，要 Standards 与 Spec 两轴报告。
- 阻断项修完再复查一次；非阻断项记到 issue 评论（或新票），并在汇报里列出。

## 8. 收口（验收之后才做）

顺序是 **推分支 → 开 PR → 用户验收 → 收口**，不可跳步：

```powershell
# 推分支（推动前确认用户已要求交付 PR）
git push -u origin <type>/<n>-<slug>
gh pr create --base main --head <type>/<n>-<slug> --title "..." --body-file <pr-body.md>
```

- PR 正文要能独立验收：改动清单、**关卡数字**、四档实测数字与**截图**（截图必须能在 PR 里直接看到，必要时推到专用证据分支用 raw 链接引用）、ADR 编号、未做项。
- **创建 PR 是交付动作，之后的 PR 文字写入不是**：PR 正文 / 评论 / review / 标签同样需要用户授权；验收中发现的新问题先在本地汇报，不要自己开一条 PR 评论当作进度。验收反馈的修复只需要**推代码**（diff 自会更新）。
- **用户验收通过后**才回填票面 `## Answer` 并关闭：

```powershell
gh issue comment <n> --body-file <answer.md>
gh issue close <n> --reason completed
```

- 回填与关闭本身也是票面写入，需要用户当轮授权；未经授权就把状态改掉属于越权（参见 `AGENTS.md`「Issue 写权限」的误写处理）。
- 父票（`Part of #<m>`）勾掉对应子任务、更新「当前状态」一行——同样先问。
- 票面口径被推翻时同步改文档（README / ADR / 流程文档），让仓库里的事实和票面一致。
- 不再实现的票：`--reason not planned` + `wontfix` 标签（见 `triage-labels.md`），也要授权。

## 9. 汇报与清理

汇报内容固定四段：**分支与 worktree** / **改动清单** / **关卡数字** / **未做项与后续**。

清理：

```powershell
docker compose -p resume-workbench-<slug> down -v   # 只对本工作区的项目名
git worktree remove .worktrees/issue<n>-<slug>
```

## 已知坑

| 坑 | 处理 |
|---|---|
| `gh issue close` 无 `--comment-file` | 正文先落文件，`--comment "$(Get-Content -Raw file)"` |
| PowerShell 下 `gh ... --jq .body` 返回**行数组** | 先拼接成单个字符串（`-join` + LF）再改文本；`Out-File -NoNewline` 遇数组会无分隔拼接，用 `[System.IO.File]::WriteAllText` |
| `docker compose -f a.yml -f b.yml` 端口翻倍 | 写独立完整 compose 文件，不叠加 |
| 对主工作区栈误执行 `down` | 始终带 `-p resume-workbench-<slug>`；先 `docker ps` 确认名字 |
| 本仓库无 Alembic | 新表由 `create_all` 建；数据搬运写幂等 `backend/migrate_*.sql`，并在 README 记执行方式 |
| jsdom 不触发原生拖拽 | 拖拽类断言要么手工派发 `dragstart/dragover/drop`，要么走真实浏览器探针 |
| 在被删的 worktree 里执行 `git worktree remove` | 清理一律回主工作区根目录执行；被删的 worktree 内执行会报「不干净/正在使用」 |
