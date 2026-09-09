from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .dependencies import current_user
from .models import User, Workspace
from .schemas import WorkspaceCreate, WorkspaceUpdate, WorkspaceView


router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


def owned_workspace(workspace_id: int, user: User, db: Session) -> Workspace:
    workspace = db.scalar(select(Workspace).where(Workspace.id == workspace_id, Workspace.owner_id == user.id))
    if workspace is None:
        raise HTTPException(status_code=404, detail="工作区不存在")
    return workspace


@router.get("", response_model=list[WorkspaceView])
def list_workspaces(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Workspace).where(Workspace.owner_id == user.id).order_by(Workspace.updated_at.desc(), Workspace.id)).all()


@router.post("", response_model=WorkspaceView, status_code=201)
def create_workspace(payload: WorkspaceCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    workspace = Workspace(name=payload.name, owner_id=user.id)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace


@router.get("/{workspace_id}", response_model=WorkspaceView)
def get_workspace(workspace_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return owned_workspace(workspace_id, user, db)


@router.patch("/{workspace_id}", response_model=WorkspaceView)
def update_workspace(workspace_id: int, payload: WorkspaceUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    workspace = owned_workspace(workspace_id, user, db)
    workspace.name = payload.name
    db.commit()
    db.refresh(workspace)
    return workspace
