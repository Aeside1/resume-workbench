import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth_routes import router as auth_router
from .database import Base, engine
from .experience_routes import router as experience_router
from .resume_description_routes import router as resume_description_router

DEFAULT_CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]


def cors_origins() -> list[str]:
    """允许的前端来源。可用逗号分隔的 CORS_ORIGINS 覆盖，便于并行工作区使用不同端口。"""
    raw = os.getenv("CORS_ORIGINS", "")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or DEFAULT_CORS_ORIGINS


Base.metadata.create_all(bind=engine)
app = FastAPI(title="简历工作台 API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=cors_origins(), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth_router)
app.include_router(experience_router)
app.include_router(resume_description_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
