# 简历工作台（Resume Workbench）

面向计算机行业求职者的**在线经历内容整理与简历组装工具**。

它把「一段实习 / 项目经历」拆成可持续沉淀的**具体工作内容**，为同一项工作维护多条可直接放进简历的**简历亮点**，再把亮点组合成针对不同岗位的**简历方案**，最后装配成通用 Markdown **简历文稿**。

> 与「模板商城」式简历工具的区别：这里的核心资产不是排版，而是你长期积累的工作内容和可复用的表达。

---

## 目录

- [解决的问题](#解决的问题)
- [核心概念](#核心概念)
- [当前状态](#当前状态)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [测试与验证](#测试与验证)
- [项目结构](#项目结构)
- [API 概览](#api-概览)
- [领域文档](#领域文档)
- [已知限制与技术债](#已知限制与技术债)
- [路线图](#路线图)

---

## 解决的问题

整理简历时的真实摩擦点在内容侧，而不是排版侧：

- 详细工作材料（笔记、技术细节、结果数据）和最终简历描述混在一起，后续补充成本高。
- 同一项工作需要写出多种简历描述时，内容来源逐渐失去关联。
- 不同简历之间反复复制粘贴，难以知道每段描述来自哪一项工作。
- 简历投出去之后继续改内容，无法准确还原当时用的版本。

对应的四条核心价值：

1. **内容沉淀**：先完整记录，再逐步整理。
2. **描述复用**：同一项工作维护多条写法，供不同方案挑选。
3. **来源可追溯**：简历里的每一条都能回到具体工作内容和所属经历。
4. **历史可还原**：留档保存某一时刻的完整内容，后续修改不影响它。

## 核心概念

```text
User
├── ExperienceGroup[*]                 经历分组（一段实习 / 一个项目）
│   └── WorkContent[*]                 具体工作内容（一项具体贡献）
│       └── ResumeHighlight[*]         简历亮点（可直接放进简历的写法）
└── ResumePlan[*]                      简历方案（一次求职准备的一套组合）
    ├── PlanExperienceGroup[*]         经历块（方案中被引用的一段经历分组）
    │   └── PlanItem[*]                简历条目（＝某条工作内容下的某条亮点）
    └── PlanArchive[*]                 方案留档（修订 revision / 导出 export）
```

几个关键边界（完整口径见 [CONTEXT.md](CONTEXT.md)）：

- **账号即工作空间**：不引入「工作区 / 租户」概念，所有数据按登录用户隔离，跨用户访问统一返回 404。
- **资产与引用分离**：切换简历方案里的亮点只改引用，不改写资产；移除条目只解除引用。
- **归档不阻断引用**：已归档的资产不再出现在「添加」候选里，但已有条目照常输出；彻底删除被引用的资产会被拒绝（409 并列出引用它的方案）。
- **装配是读时的，留档才是写时的**：方案预览与简历文稿都从当前引用实时装配、不落库，只有方案留档是不可变快照。

## 当前状态

`v0.1.0` — 首个公开版本，核心的**经历资产管理**已完善，**简历组合**模块基本可用。

### 已实现

| 模块 | 能力 |
| --- | --- |
| 身份 | 注册、登录、退出；PBKDF2 口令存储、HMAC 签名令牌、按用户归属校验 |
| 经历资产 | 经历分组与具体工作内容的创建、编辑、排序、归档、恢复、彻底删除 |
| 简历亮点 | 同一工作内容下多条亮点：创建、编辑、复制、排序、归档、恢复、彻底删除（被引用时拒绝并提示） |
| 沉浸编辑 | 富文本 Markdown 工作记录编辑（Milkdown / ProseMirror）、自动保存与保存状态提示、专注写作区 |
| 简历方案 | 方案创建 / 改名 / 用途 / 归档 / 恢复 / 彻底删除、**复制方案** |
| 简历编排 | 经历块与简历条目的添加、两级排序、亮点切换；板块由经历分组类型自动决定 |
| 装配输出 | 方案文稿读时装配（大纲 + 完整 Markdown）、工作记录标题开关、下载 Markdown |
| 方案留档 | 结构性变更自动留档（`revision`）、历史面板查看与回滚 |

### 开发中

- **导出快照与方案内导出历史**（`.scratch/resume-workbench/issues/05-export-snapshots-history.md`）：`export` 类留档、导出历史列表、快照查看与下载。

### 明确不在范围内

- **投递稿**（在文稿基础上编辑渲染出的最终投递材料）：工作台与外部工具之间的唯一接口是通用 Markdown 文稿，投递稿的归属待后续单独设计。
- **自由记录 / 速记收件箱**：已登记为后置特性（issue 06，`needs-triage`）。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | React 19 · TypeScript 5.7 · Vite 6 · HeroUI v3（React Aria）· Tailwind CSS 4 · Milkdown / ProseMirror · framer-motion |
| 后端 | Python 3.11 · FastAPI · SQLAlchemy 2 · psycopg 3 · Pydantic 2 |
| 数据库 | PostgreSQL 16 |
| 部署 | Docker Compose：nginx（静态前端）+ uvicorn（API）+ postgres |
| 测试 | pytest（后端行为/契约测试）· Vitest + Testing Library（前端交互测试）· puppeteer-core（真实浏览器端到端探针） |

前后端分离的**模块化单体**：API 层只做鉴权、校验与错误映射，业务规则集中在应用服务与仓储层。

## 快速开始

### Docker Compose（推荐）

```bash
git clone https://github.com/Aeside1/resume-workbench.git
cd resume-workbench
docker compose up --build
```

| 服务 | 地址 |
| --- | --- |
| Web | http://localhost:5173 |
| API | http://localhost:8000 |
| 健康检查 | http://localhost:8000/api/health → `{"status":"ok"}` |

前端镜像构建期通过 `VITE_API_URL` 注入 API 地址（默认 `http://localhost:8000`）：

```bash
docker compose build --build-arg VITE_API_URL=http://localhost:8000 web
```

### 本地开发

后端（宿主机直跑时，必须先起 Compose 里的 PostgreSQL）：

```powershell
docker compose up -d db
python -m pip install -r backend/requirements.txt
$env:DATABASE_URL = "postgresql+psycopg://resume:resume_dev_password@localhost:5432/resume_workbench"
uvicorn app.main:app --app-dir backend --reload
```

前端：

```powershell
cd frontend
npm install
npm run dev
```

### 环境变量

| 变量 | 作用 | 默认 |
| --- | --- | --- |
| `DATABASE_URL` | 应用数据库连接 | 必填 |
| `TEST_DATABASE_URL` | 测试数据库连接（测试用隔离 schema） | 跑测试时必填 |
| `SECRET_KEY` | 令牌签名密钥；`ENVIRONMENT` 非 `development` 时必填 | 开发环境有内置回退值 |
| `ENVIRONMENT` | 运行环境标识 | `development` |
| `CORS_ORIGINS` | 允许的前端来源，逗号分隔 | `http://localhost:5173,http://127.0.0.1:5173` |
| `VITE_API_URL` | 前端构建期 API 地址 | `http://localhost:8000` |

## 测试与验证

**后端**行为测试必须连接 Docker PostgreSQL，每个测试会话在随机隔离 schema 中运行（跑完自动 drop）：

```powershell
# 宿主机执行（仓库根目录）：先起 db，再把测试连接指到本机映射端口
docker compose up -d db
$env:TEST_DATABASE_URL = "postgresql+psycopg://resume:resume_dev_password@localhost:5432/resume_workbench"
python -m pytest -q backend/tests

# 或在 API 容器里执行：必须把仓库根挂进容器
# （迁移脚本与契约快照的路径相对仓库根解析，而 API 镜像的构建上下文只有 backend/）
docker compose run --rm --volume "$PWD:/repo" --workdir /repo/backend api pytest -q tests
```

**前端**：

```bash
cd frontend
npm run typecheck   # tsc -b
npm run test        # vitest run（26 个测试文件 / 187 条用例）
npm run build       # 生产构建
```

当前基线（`v0.1.0`）：后端 **33 passed**，前端 **187 passed / 26 files**，`typecheck` 与 `build` 无错。

**契约测试**：后端 `backend/tests/test_openapi_contract.py` 把方案与亮点相关路由固化为快照 `frontend/src/contracts/openapi-plan-paths.json`，前端 `src/api.contract.test.ts` 断言 `api.ts` 的每个调用都真实存在、且后端每条路由都被前端覆盖 —— 任何一侧单独改路径或字段都会红，而不是静默 404。

**真实浏览器探针**（需要本机 Edge）：

```bash
cd frontend
npm run test:editor:e2e
```

## 项目结构

```text
backend/
  app/
    auth_routes.py / auth.py                身份、口令哈希与令牌签发校验
    experience_routes.py / _service / _repository        经历分组与具体工作内容
    resume_description_routes.py / ...      简历亮点（代码标识符沿用 ResumeDescription）
    resume_plan_routes.py / _service / _repository       简历方案、经历块、条目、留档
    resume_plan_assembly.py                 读时装配：方案 → 简历文稿
    models.py / schemas.py                  持久化模型与请求/响应模型
    main.py                                 应用装配、CORS、create_all、/api/health
  tests/                                    行为测试 + OpenAPI 契约快照测试
  migrate_*.sql                             手写数据搬迁脚本（见「已知限制」）
frontend/
  src/
    api.ts                                  数据访问层（含类型定义）
    features/
      hub/                                  经历管理 Hub（卡片流、空态、弹窗）
      canvas/                               沉浸长画布、工作内容块、亮点抽屉、专注写作区
      plans/                                方案列表、简历编排工作面、历史面板、文稿视图
      AppShell.tsx / WorkbenchShell.tsx     应用外壳、导航、路由与专注态
    components/ui/                          HeroUI 之上的通用件（Toast、主题切换、Markdown 编辑器）
    styles/                                 按 base / layout / components / features 分层
    contracts/openapi-plan-paths.json       前后端契约快照（由后端测试生成并提交）
  scripts/live-editor.e2e.mjs               真实浏览器端到端探针
docs/adr/                                   架构决策记录
.scratch/                                   需求规格与开发任务（本地 Markdown issue tracker）
PRD.md · ARCHITECTURE.md · UI-UX.md         产品需求 / 系统架构 / 交互规格
CONTEXT.md                                  领域词汇（术语唯一来源）
```

## API 概览

所有业务接口都以**当前登录用户**为作用域，服务端解析归属，不接受客户端提交用户标识。

```text
认证          POST /api/auth/register | login | logout     GET /api/auth/me
经历分组      GET|POST /api/experience-groups
              GET|PATCH|DELETE /api/experience-groups/:id
              POST /api/experience-groups/:id/archive | restore
具体工作内容  GET|POST /api/experience-groups/:id/work-contents
              POST /api/experience-groups/:id/work-contents/reorder
              PATCH|DELETE /api/work-contents/:id
              POST /api/work-contents/:id/archive | restore
简历亮点      GET|POST /api/work-contents/:id/resume-descriptions
              POST /api/work-contents/:id/resume-descriptions/reorder
              GET|PATCH|DELETE /api/resume-descriptions/:id
              POST /api/resume-descriptions/:id/copy | archive | restore
简历方案      GET|POST /api/resume-plans
              GET|PATCH|DELETE /api/resume-plans/:id
              POST /api/resume-plans/:id/archive | restore | fork
经历块        POST /api/resume-plans/:id/experience-groups
              PATCH|DELETE /api/resume-plans/:id/experience-groups/:blockId
              POST /api/resume-plans/:id/experience-groups/reorder
简历条目      POST /api/resume-plans/:id/items
              PATCH|DELETE /api/resume-plans/:id/items/:itemId
              POST /api/resume-plans/:id/experience-groups/:blockId/items/reorder
装配与留档    GET /api/resume-plans/:id/document | candidates | archives
              POST /api/resume-plans/:id/archives/:archiveId/restore
```

服务地址启用后可在 `/docs`（Swagger UI）查看实时接口文档。

## 领域文档

| 文档 | 回答的问题 |
| --- | --- |
| [PRD.md](PRD.md) | 用户为什么需要这个产品，第一版要解决什么 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 系统如何承载产品能力，前后端如何分工 |
| [UI-UX.md](UI-UX.md) | 用户在哪些页面完成什么操作（部分章节已被 ADR 取代） |
| [CONTEXT.md](CONTEXT.md) | 每个领域词汇具体指什么（术语唯一来源） |
| [docs/adr/](docs/adr/) | 已确认的架构决策及其理由 |
| [.scratch/](.scratch/) | 需求规格与开发任务（含各切片的执行记录与验收结论） |
| [文档索引.md](文档索引.md) | 上述文档的职责划分 |
| [AGENTS.md](AGENTS.md) | 本仓库的协作约定（供 AI 协作与人类贡献者参考） |

## 已知限制与技术债

公开发布的这个版本刻意保留了若干已知欠账，欢迎讨论，但请知悉：

1. **没有版本化迁移机制**：未引入 Alembic。服务启动时 `Base.metadata.create_all` 只建缺失的表，历史结构变更靠 `backend/migrate_*.sql` 手动执行（脚本写成幂等）。
2. **未实现乐观并发**：原计划的 `revision` 冲突检测一个资源都没有落地。当前假设是个人简历不存在多标签页并发编辑场景，模型为「后写覆盖」。
3. **导出快照未实现**：目前只有 `revision` 类留档；`export` 类留档与方案内导出历史见路线图。
4. **认证的工程化程度有限**：令牌保存在 `localStorage`，撤销名单是进程内内存（重启即失效、不跨 worker）；登录接口没有限流。生产部署前应至少补齐 `SECRET_KEY`、HTTPS、反向代理层限流。
5. **单机部署假设**：按 100–1000 用户规模设计，编排为单台服务器 + Docker Compose，没有水平扩展与高可用设计。
6. **依赖告警**：`npm audit` 仍有若干条中高危，全部落在开发工具链（vitest / vite / esbuild 等），不进运行时分包，属可单独处理的升级项。
7. **自动保存在慢网下可能丢尾**：保存请求在途时的后续输入存在不落库的可能（`.scratch/autosave-trailing-loss/`），已登记待定调。

## 路线图

- **v0.1（当前）**：经历资产完善 + 简历方案组合与文稿输出。
- **下一步**：导出快照与方案内导出历史（issue 05）—— 补齐 PRD 第一版核心闭环的最后一段。
- **后续候选**：简历亮点引用关系可视化、"投递稿"归属设计、乐观并发统一落地、Alembic 迁移、自由记录 / 速记收件箱、体验优化（键盘操作、响应式、空态与提示统一）。
- **更远期**：在内容提案环节接入 AI —— 先生成待确认的提案，再进入正式内容。

## 参与贡献

- 提交信息统一使用中文，采用 `类型(模块): 简述` 格式。
- 需求规格与开发任务维护在 `.scratch/<feature>/`，约定见 [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md)。
- 前端组件与样式规范见 [AGENTS.md](AGENTS.md)（HeroUI / React Aria 使用约定）。
- 使用 `git worktree` 并行开发时，请为每个工作区准备独立的 Compose 项目名、端口与数据库卷。

## 许可证

[MIT](LICENSE) © 2026 Aeside1
