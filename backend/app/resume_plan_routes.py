from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .database import get_db
from .dependencies import current_user
from .models import User
from .resume_plan_assembly import build_detail, render_block, render_item
from .resume_plan_service import ResumePlanService
from .schemas import (
    PlanArchiveView,
    PlanBlockCreate,
    PlanBlockReorder,
    PlanBlockUpdate,
    PlanBlockView,
    PlanCandidatesView,
    PlanDocumentView,
    PlanItemCreate,
    PlanItemReorder,
    PlanItemUpdate,
    PlanItemView,
    ResumePlanCreate,
    ResumePlanDetailView,
    ResumePlanUpdate,
    ResumePlanView,
)


router = APIRouter(tags=["resume-plans"])


def service(user: User, db: Session) -> ResumePlanService:
    return ResumePlanService(db, user)


@router.get("/api/resume-plans", response_model=list[ResumePlanView])
def list_resume_plans(
    include_archived: bool = Query(default=False),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return service(user, db).list_plans(include_archived)


@router.post("/api/resume-plans", response_model=ResumePlanView, status_code=201)
def create_resume_plan(payload: ResumePlanCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).create_plan(payload.model_dump())


@router.get("/api/resume-plans/{plan_id}", response_model=ResumePlanDetailView)
def get_resume_plan(plan_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return build_detail(service(user, db).plan(plan_id))


@router.patch("/api/resume-plans/{plan_id}", response_model=ResumePlanView)
def update_resume_plan(
    plan_id: int,
    payload: ResumePlanUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return service(user, db).update_plan(plan_id, payload.model_dump(exclude_unset=True))


@router.post("/api/resume-plans/{plan_id}/archive", response_model=ResumePlanView)
def archive_resume_plan(plan_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).set_plan_archived(plan_id, True)


@router.post("/api/resume-plans/{plan_id}/restore", response_model=ResumePlanView)
def restore_resume_plan(plan_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).set_plan_archived(plan_id, False)


@router.delete("/api/resume-plans/{plan_id}", status_code=204)
def delete_resume_plan(plan_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    service(user, db).delete_plan(plan_id)


@router.post("/api/resume-plans/{plan_id}/experience-groups", response_model=PlanBlockView, status_code=201)
def add_plan_experience_group(
    plan_id: int,
    payload: PlanBlockCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    block = service(user, db).add_block(plan_id, payload.experience_group_id)
    return render_block(block)


@router.patch("/api/resume-plans/{plan_id}/experience-groups/{block_id}", response_model=PlanBlockView)
def update_plan_experience_group(
    plan_id: int,
    block_id: int,
    payload: PlanBlockUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    block = service(user, db).update_block(plan_id, block_id, payload.model_dump(exclude_unset=True))
    return render_block(block)


@router.delete("/api/resume-plans/{plan_id}/experience-groups/{block_id}", status_code=204)
def remove_plan_experience_group(
    plan_id: int,
    block_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    service(user, db).remove_block(plan_id, block_id)


@router.post("/api/resume-plans/{plan_id}/experience-groups/reorder", response_model=list[PlanBlockView])
def reorder_plan_experience_groups(
    plan_id: int,
    payload: PlanBlockReorder,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    blocks = service(user, db).reorder_blocks(plan_id, payload.block_ids)
    return [render_block(block) for block in blocks]


@router.post("/api/resume-plans/{plan_id}/items", response_model=PlanItemView, status_code=201)
def add_plan_item(
    plan_id: int,
    payload: PlanItemCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return render_item(service(user, db).add_item(plan_id, payload.model_dump()))


@router.patch("/api/resume-plans/{plan_id}/items/{item_id}", response_model=PlanItemView)
def update_plan_item(
    plan_id: int,
    item_id: int,
    payload: PlanItemUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    item = service(user, db).switch_item_highlight(plan_id, item_id, payload.resume_description_id)
    return render_item(item)


@router.delete("/api/resume-plans/{plan_id}/items/{item_id}", status_code=204)
def remove_plan_item(plan_id: int, item_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    service(user, db).remove_item(plan_id, item_id)


@router.post(
    "/api/resume-plans/{plan_id}/experience-groups/{block_id}/items/reorder",
    response_model=list[PlanItemView],
)
def reorder_plan_items(
    plan_id: int,
    block_id: int,
    payload: PlanItemReorder,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    items = service(user, db).reorder_items(plan_id, block_id, payload.item_ids)
    return [render_item(item) for item in items]


@router.get("/api/resume-plans/{plan_id}/candidates", response_model=PlanCandidatesView)
def get_plan_candidates(plan_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).candidates(plan_id)


@router.get("/api/resume-plans/{plan_id}/document", response_model=PlanDocumentView)
def get_plan_document(plan_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).document(plan_id)


@router.get("/api/resume-plans/{plan_id}/archives", response_model=list[PlanArchiveView])
def list_plan_archives(plan_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return service(user, db).list_archives(plan_id)


@router.post("/api/resume-plans/{plan_id}/archives/{archive_id}/restore", response_model=ResumePlanDetailView)
def restore_plan_archive(
    plan_id: int,
    archive_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    plan = service(user, db).restore_archive(plan_id, archive_id)
    return build_detail(plan)
