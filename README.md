# 简历工作台

当前切片实现“身份与工作区”基础：React + TypeScript + Vite + HeroUI v3 前端、FastAPI 模块化单体 API、PostgreSQL 和 Docker Compose。

## 本地开发

推荐使用 Docker Compose 启动完整本地环境。宿主机直跑后端时，必须先启动 Compose 中的 PostgreSQL，并显式提供同一个 PostgreSQL 连接：

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

使用 Docker Compose 启动 PostgreSQL、API 和 Nginx 前端：`docker compose up --build`。

## 验证

后端行为测试必须连接 Docker PostgreSQL，并使用隔离 schema。推荐直接在 API 容器中执行：

```powershell
docker compose run --rm api pytest -q tests
```

如果在宿主机执行，先安装后端依赖并设置 `TEST_DATABASE_URL` 为本机映射地址，再运行 `pytest -q backend/tests`。

前端验证：`npm run typecheck`、`npm run test`、`npm run build`。

## 数据库迁移

本仓库**没有版本化迁移机制**（未引入 Alembic）：服务启动时 `Base.metadata.create_all` 会建出缺失的表，结构变更与数据搬运由 `backend/migrate_*.sql` 手写脚本完成，需手动执行一次。

### migrate_003：简历亮点独立成表

把 `work_contents.supplementary_notes` 里的历史描述版本（`versions` / `descriptions+points` / 顶层数组 / 纯文本四种形状）展开为 `resume_descriptions` 行。脚本幂等，可重复执行（幂等键 `(work_content_id, legacy_id)`）。

```powershell
# 表结构由 API 启动时的 create_all 建立，先重启一次 API
docker compose up -d --build api
# 执行搬运（PowerShell 下用 docker cp 避免管道编码问题）
docker cp backend/migrate_003_resume_descriptions.sql resume-workbench-db-1:/tmp/migrate_003.sql
docker exec resume-workbench-db-1 psql -U resume -d resume_workbench -v ON_ERROR_STOP=1 -f /tmp/migrate_003.sql
# 核对
docker exec resume-workbench-db-1 psql -U resume -d resume_workbench -c "select count(*) from resume_descriptions;"
```

bash/sh 下可直接重定向：`docker compose exec -T db psql -U resume -d resume_workbench -v ON_ERROR_STOP=1 < backend/migrate_003_resume_descriptions.sql`。

**执行记录（2026-09-15，开发库）**：执行前 `resume_descriptions` 0 行 → 首次执行 `INSERT 0 11` → 二次执行 `INSERT 0 0`（行数仍为 11）。执行前已用 `pg_dump` 备份到 `.worktrees/pre-04a-20260915-160601.sql`（gitignored）。

所有工作区接口都通过当前认证用户的 `owner_id` 查询，跨用户访问统一返回 404，避免泄露资源存在性。
