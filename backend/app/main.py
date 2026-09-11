from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth_routes import router as auth_router
from .database import Base, engine
from .experience_routes import router as experience_router


Base.metadata.create_all(bind=engine)
app = FastAPI(title="简历工作台 API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth_router)
app.include_router(experience_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
