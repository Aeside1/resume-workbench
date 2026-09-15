from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .database import get_db
from .dependencies import current_user
from .models import User
from .resume_description_service import ResumeDescriptionService
from .schemas import (
    ResumeDescriptionCreate,
    ResumeDescriptionReorder,
    ResumeDescriptionUpdate,
    ResumeDescriptionView,
)


router = APIRouter(tags=["resume-descriptions"])


def service(user: User, db: Session) -> ResumeDescriptionService:
    return ResumeDescriptionService(db, user)


@router.get("/api/work-contents/{content_id}/resume-descriptions", response_model=list[ResumeDescriptionView])
def list_resume_descriptions(
    content_id: int,
    include_archived: bool = Query(default=False),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return service(user, db).list_highlights(content_id, include_archived)


@router.post("/api/work-contents/{content_id}/resume-descriptions", response_model=ResumeDescriptionView, status_code=201)
def create_resume_description(
    content_id: int,
    payload: ResumeDescriptionCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return service(user, db).create_highlight(content_id, payload.model_dump())


@router.post("/api/work-contents/{content_id}/resume-descriptions/reorder", response_model=list[ResumeDescriptionView])
def reorder_resume_descriptions(
    content_id: int,
    payload: ResumeDescriptionReorder,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return service(user, db).reorder_highlights(content_id, payload.resume_description_ids)


@router.get("/api/resume-descriptions/{highlight_id}", response_model=ResumeDescriptionView)
def get_resume_description(highlight_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).highlight(highlight_id)


@router.patch("/api/resume-descriptions/{highlight_id}", response_model=ResumeDescriptionView)
def update_resume_description(
    highlight_id: int,
    payload: ResumeDescriptionUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return service(user, db).update_highlight(highlight_id, payload.model_dump(exclude_unset=True))


@router.post("/api/resume-descriptions/{highlight_id}/copy", response_model=ResumeDescriptionView, status_code=201)
def copy_resume_description(highlight_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).copy_highlight(highlight_id)


@router.post("/api/resume-descriptions/{highlight_id}/archive", response_model=ResumeDescriptionView)
def archive_resume_description(highlight_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).set_archived(highlight_id, True)


@router.post("/api/resume-descriptions/{highlight_id}/restore", response_model=ResumeDescriptionView)
def restore_resume_description(highlight_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).set_archived(highlight_id, False)


@router.delete("/api/resume-descriptions/{highlight_id}", status_code=204)
def delete_resume_description(highlight_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    service(user, db).delete_highlight(highlight_id)
