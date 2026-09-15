from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ExperienceGroup, ResumeDescription, WorkContent


class ResumeDescriptionRepository:
    """Persistence adapter for the resume-highlight aggregate（简历亮点）。"""

    def __init__(self, db: Session):
        self.db = db

    def content_for_owner(self, content_id: int, owner_id: int) -> WorkContent | None:
        return self.db.scalar(
            select(WorkContent).where(
                WorkContent.id == content_id,
                WorkContent.experience_group.has(ExperienceGroup.user_id == owner_id),
            )
        )

    def highlight_for_owner(self, highlight_id: int, owner_id: int) -> ResumeDescription | None:
        return self.db.scalar(
            select(ResumeDescription).where(
                ResumeDescription.id == highlight_id,
                ResumeDescription.work_content.has(
                    WorkContent.experience_group.has(ExperienceGroup.user_id == owner_id)
                ),
            )
        )

    def list_highlights(self, content_id: int, include_archived: bool) -> list[ResumeDescription]:
        query = select(ResumeDescription).where(ResumeDescription.work_content_id == content_id)
        if not include_archived:
            query = query.where(ResumeDescription.archived.is_(False))
        return list(self.db.scalars(query.order_by(ResumeDescription.position, ResumeDescription.id)).all())

    def all_highlights(self, content_id: int) -> list[ResumeDescription]:
        return list(self.db.scalars(select(ResumeDescription).where(ResumeDescription.work_content_id == content_id)).all())

    def max_position(self, content_id: int) -> int | None:
        return self.db.scalar(
            select(ResumeDescription.position)
            .where(ResumeDescription.work_content_id == content_id)
            .order_by(ResumeDescription.position.desc())
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
