from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import create_token, hash_password, revoke_token, verify_password
from .database import get_db
from .dependencies import bearer_token, current_user
from .models import User, Workspace
from .schemas import AuthResponse, Credentials, UserView, WorkspaceView


router = APIRouter(prefix="/api/auth", tags=["auth"])


def auth_response(user: User, db: Session) -> AuthResponse:
    workspaces = db.scalars(select(Workspace).where(Workspace.owner_id == user.id).order_by(Workspace.id)).all()
    return AuthResponse(token=create_token(user.id), user=UserView.model_validate(user), workspaces=[WorkspaceView.model_validate(item) for item in workspaces])


@router.post("/register", response_model=AuthResponse, status_code=201)
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


@router.post("/login", response_model=AuthResponse)
def login(payload: Credentials, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    return auth_response(user, db)


@router.post("/logout", status_code=204)
def logout(authorization: str | None = Header(default=None), _: User = Depends(current_user)):
    revoke_token(bearer_token(authorization))
    return None


@router.get("/me", response_model=UserView)
def me(user: User = Depends(current_user)):
    return user
