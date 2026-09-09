# 简历工作台

当前切片实现“身份与工作区”基础：React + TypeScript + Vite + HeroUI v3 前端、FastAPI 模块化单体 API、PostgreSQL 和 Docker Compose。

## 本地开发

后端：

```powershell
python -m pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --reload
```

前端：

```powershell
cd frontend
npm install
npm run dev
```

或使用 Docker Compose 启动 PostgreSQL、API 和 Nginx 前端：`docker compose up --build`。

## 验证

`pytest -q backend/tests`、`npm run typecheck`、`npm run test`、`npm run build`。

所有工作区接口都通过当前认证用户的 `owner_id` 查询，跨用户访问统一返回 404，避免泄露资源存在性。
