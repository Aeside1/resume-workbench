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

所有工作区接口都通过当前认证用户的 `owner_id` 查询，跨用户访问统一返回 404，避免泄露资源存在性。
