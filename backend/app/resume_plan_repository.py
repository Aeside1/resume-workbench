from fastapi import HTTPException
from sqlalchemy import distinct, or_, select
from sqlalchemy.orm import Session

from .models import (
    ExperienceGroup,
    PlanArchive,
    PlanExperienceGroup,
    PlanItem,
    ResumeDescription,
    ResumePlan,
    WorkContent,
)


class ResumePlanRepository:
    """Persistence adapter for the resume-plan aggregate."""

    def __init__(self, db: Session):
        self.db = db

    def plan_for_owner(self, plan_id: int, owner_id: int) -> ResumePlan | None:
        return self.db.scalar(select(ResumePlan).where(ResumePlan.id == plan_id, ResumePlan.user_id == owner_id))

    def list_plans(self, user_id: int, include_archived: bool) -> list[ResumePlan]:
        query = select(ResumePlan).where(ResumePlan.user_id == user_id)
        if not include_archived:
            query = query.where(ResumePlan.archived.is_(False))
        return list(self.db.scalars(query.order_by(ResumePlan.updated_at.desc(), ResumePlan.id)).all())

    def latest_archive(self, plan_id: int) -> PlanArchive | None:
        return self.db.scalar(
            select(PlanArchive)
            .where(PlanArchive.plan_id == plan_id)
            .order_by(PlanArchive.id.desc())
            .limit(1)
        )

    def list_archives(self, plan_id: int) -> list[PlanArchive]:
        return list(
            self.db.scalars(
                select(PlanArchive).where(PlanArchive.plan_id == plan_id).order_by(PlanArchive.id.desc())
            ).all()
        )

    def archive_for_plan(self, archive_id: int, plan_id: int) -> PlanArchive | None:
        return self.db.scalar(
            select(PlanArchive).where(PlanArchive.id == archive_id, PlanArchive.plan_id == plan_id)
        )

    def max_block_position(self, plan_id: int) -> int | None:
        return self.db.scalar(
            select(PlanExperienceGroup.position)
            .where(PlanExperienceGroup.plan_id == plan_id)
            .order_by(PlanExperienceGroup.position.desc())
            .limit(1)
        )

    def max_item_position(self, block_id: int) -> int | None:
        return self.db.scalar(
            select(PlanItem.position)
            .where(PlanItem.plan_experience_group_id == block_id)
            .order_by(PlanItem.position.desc())
            .limit(1)
        )

    def save(self, entity):
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, entity):
        self.db.delete(entity)
        self.db.commit()

    def commit(self):
        self.db.commit()


class PlanReferenceRepository:
    """反查「哪些简历方案引用了这个资产」，供删除守卫使用（ADR 005 §2.4）。"""

    def __init__(self, db: Session):
        self.db = db

    def _plan_names(self, condition) -> list[str]:
        statement = (
            select(distinct(ResumePlan.name))
            .join(PlanExperienceGroup, PlanExperienceGroup.plan_id == ResumePlan.id)
            .join(PlanItem, PlanItem.plan_experience_group_id == PlanExperienceGroup.id)
            .where(condition)
            .order_by(ResumePlan.name)
        )
        return list(self.db.scalars(statement).all())

    def plans_referencing_group(self, group_id: int) -> list[str]:
        """引用了该经历分组的方案：包含「有经历块指向它」与「有条目指向它下面的具体工作内容」两种。"""
        return self._plan_names(
            or_(
                PlanExperienceGroup.experience_group_id == group_id,
                PlanItem.work_content_id.in_(
                    select(WorkContent.id).where(WorkContent.experience_group_id == group_id)
                ),
            )
        )

    def plans_referencing_content(self, content_id: int) -> list[str]:
        return self._plan_names(PlanItem.work_content_id == content_id)

    def plans_referencing_highlight(self, highlight_id: int) -> list[str]:
        return self._plan_names(PlanItem.resume_description_id == highlight_id)


def guard_message(plan_names: list[str]) -> str:
    joined = "、".join(f"《{name}》" for name in plan_names)
    return f"该内容正被简历方案{joined}引用，请先在方案中移除或替换对应条目，再执行删除。"


class PlanReferenceGuard:
    """删除守卫：被方案引用的资产不允许彻底删除（归档不受影响，ADR 005 §2.4）。"""

    def __init__(self, db: Session):
        self.repository = PlanReferenceRepository(db)

    def ensure_group_deletable(self, group_id: int) -> None:
        names = self.repository.plans_referencing_group(group_id)
        if names:
            raise HTTPException(status_code=409, detail=guard_message(names))

    def ensure_content_deletable(self, content_id: int) -> None:
        names = self.repository.plans_referencing_content(content_id)
        if names:
            raise HTTPException(status_code=409, detail=guard_message(names))

    def ensure_highlight_deletable(self, highlight_id: int) -> None:
        names = self.repository.plans_referencing_highlight(highlight_id)
        if names:
            raise HTTPException(status_code=409, detail=guard_message(names))


__all__ = [
    "PlanReferenceGuard",
    "PlanReferenceRepository",
    "ResumePlanRepository",
    "guard_message",
]
