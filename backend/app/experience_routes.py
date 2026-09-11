from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .database import get_db
from .dependencies import current_user
from .experience_service import ExperienceGroupService
from .models import User
from .schemas import (
    ExperienceGroupCreate,
    ExperienceGroupUpdate,
    ExperienceGroupView,
    WorkContentCreate,
    WorkContentReorder,
    WorkContentUpdate,
    WorkContentView,
)


router = APIRouter(tags=["experience"])


def service(user: User, db: Session) -> ExperienceGroupService:
    return ExperienceGroupService(db, user)


@router.get("/api/experience-groups", response_model=list[ExperienceGroupView])
def list_experience_groups(include_archived: bool = Query(default=False), user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).list_groups(include_archived)


@router.post("/api/experience-groups", response_model=ExperienceGroupView, status_code=201)
def create_experience_group(payload: ExperienceGroupCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).create_group(payload.model_dump())


@router.get("/api/experience-groups/{group_id}", response_model=ExperienceGroupView)
def get_experience_group(group_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).group(group_id)


@router.patch("/api/experience-groups/{group_id}", response_model=ExperienceGroupView)
def update_experience_group(group_id: int, payload: ExperienceGroupUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).update_group(group_id, payload.model_dump(exclude_unset=True))


@router.post("/api/experience-groups/{group_id}/archive", response_model=ExperienceGroupView)
def archive_experience_group(group_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).set_group_archived(group_id, True)


@router.post("/api/experience-groups/{group_id}/restore", response_model=ExperienceGroupView)
def restore_experience_group(group_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).set_group_archived(group_id, False)


@router.delete("/api/experience-groups/{group_id}", status_code=204)
def delete_experience_group(group_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    service(user, db).delete_group(group_id)


@router.get("/api/experience-groups/{group_id}/work-contents", response_model=list[WorkContentView])
def list_work_contents(group_id: int, include_archived: bool = Query(default=False), user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).list_contents(group_id, include_archived)


@router.post("/api/experience-groups/{group_id}/work-contents", response_model=WorkContentView, status_code=201)
def create_work_content(group_id: int, payload: WorkContentCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).create_content(group_id, payload.model_dump())


@router.patch("/api/work-contents/{content_id}", response_model=WorkContentView)
def update_work_content(content_id: int, payload: WorkContentUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).update_content(content_id, payload.model_dump(exclude_unset=True))


@router.post("/api/experience-groups/{group_id}/work-contents/reorder", response_model=list[WorkContentView])
def reorder_work_contents(group_id: int, payload: WorkContentReorder, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).reorder_contents(group_id, payload.work_content_ids)


@router.post("/api/work-contents/{content_id}/archive", response_model=WorkContentView)
def archive_work_content(content_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).set_content_archived(content_id, True)


@router.post("/api/work-contents/{content_id}/restore", response_model=WorkContentView)
def restore_work_content(content_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).set_content_archived(content_id, False)
