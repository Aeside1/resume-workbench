from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import create_token, decode_token, hash_password, revoke_token, verify_password
from .database import Base, engine, get_db
from .models import User, Workspace
from .schemas import AuthResponse, Credentials, UserView, WorkspaceCreate, WorkspaceUpdate, WorkspaceView


Base.metadata.create_all(bind=engine)
app = FastAPI(title="简历工作台 API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="需要登录")
    return authorization.split(" ", 1)[1].strip()


def current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    token = bearer_token(authorization)
    user_id = decode_token(token)
    user = db.get(User, user_id) if user_id else None
    if user is None:
        raise HTTPException(status_code=401, detail="登录状态无效或已过期")
    return user


def auth_response(user: User, db: Session) -> AuthResponse:
    workspaces = db.scalars(select(Workspace).where(Workspace.owner_id == user.id).order_by(Workspace.id)).all()
    return AuthResponse(token=create_token(user.id), user=UserView.model_validate(user), workspaces=[WorkspaceView.model_validate(item) for item in workspaces])


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/register", response_model=AuthResponse, status_code=201)
def register(payload: Credentials, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="该邮箱已注册")
    user = User(email=email, password_hash=hash_password(payload.password))
    user.workspaces.append(Workspace(name="默认工作区"))
    db.add(user)
    db.commit()
    db.refresh(user)
    return auth_response(user, db)


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: Credentials, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    return auth_response(user, db)


@app.post("/api/auth/logout", status_code=204)
def logout(authorization: str | None = Header(default=None), _: User = Depends(current_user)):
    revoke_token(bearer_token(authorization))
    return None


@app.get("/api/auth/me", response_model=UserView)
def me(user: User = Depends(current_user)):
    return user


@app.get("/api/workspaces", response_model=list[WorkspaceView])
def list_workspaces(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Workspace).where(Workspace.owner_id == user.id).order_by(Workspace.updated_at.desc(), Workspace.id)).all()


def owned_workspace(workspace_id: int, user: User, db: Session) -> Workspace:
    workspace = db.scalar(select(Workspace).where(Workspace.id == workspace_id, Workspace.owner_id == user.id))
    if workspace is None:
        raise HTTPException(status_code=404, detail="工作区不存在")
    return workspace


@app.post("/api/workspaces", response_model=WorkspaceView, status_code=201)
def create_workspace(payload: WorkspaceCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    workspace = Workspace(name=payload.name.strip(), owner_id=user.id)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace


@app.get("/api/workspaces/{workspace_id}", response_model=WorkspaceView)
def get_workspace(workspace_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return owned_workspace(workspace_id, user, db)


@app.patch("/api/workspaces/{workspace_id}", response_model=WorkspaceView)
def update_workspace(workspace_id: int, payload: WorkspaceUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    workspace = owned_workspace(workspace_id, user, db)
    workspace.name = payload.name.strip()
    db.commit()
    db.refresh(workspace)
    return workspace
