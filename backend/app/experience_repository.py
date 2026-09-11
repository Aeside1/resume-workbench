from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ExperienceGroup, User, WorkContent, Workspace


class ExperienceRepository:
    """Persistence adapter for the experience-content aggregate."""

    def __init__(self, db: Session):
        self.db = db

    def workspace_for_owner(self, workspace_id: int, owner_id: int) -> Workspace | None:
        return self.db.scalar(select(Workspace).where(Workspace.id == workspace_id, Workspace.owner_id == owner_id))

    def group_for_owner(self, group_id: int, owner_id: int) -> ExperienceGroup | None:
        return self.db.scalar(select(ExperienceGroup).where(ExperienceGroup.id == group_id, ExperienceGroup.workspace.has(Workspace.owner_id == owner_id)))

    def content_for_owner(self, content_id: int, owner_id: int) -> WorkContent | None:
        return self.db.scalar(select(WorkContent).where(WorkContent.id == content_id, WorkContent.experience_group.has(ExperienceGroup.workspace.has(Workspace.owner_id == owner_id))))

    def list_groups(self, workspace_id: int, include_archived: bool) -> list[ExperienceGroup]:
        query = select(ExperienceGroup).where(ExperienceGroup.workspace_id == workspace_id)
        if not include_archived:
            query = query.where(ExperienceGroup.archived.is_(False))
        return list(self.db.scalars(query.order_by(ExperienceGroup.updated_at.desc(), ExperienceGroup.id)).all())

    def list_contents(self, group_id: int, include_archived: bool) -> list[WorkContent]:
        query = select(WorkContent).where(WorkContent.experience_group_id == group_id)
        if not include_archived:
            query = query.where(WorkContent.archived.is_(False))
        return list(self.db.scalars(query.order_by(WorkContent.position, WorkContent.id)).all())

    def all_contents(self, group_id: int) -> list[WorkContent]:
        return list(self.db.scalars(select(WorkContent).where(WorkContent.experience_group_id == group_id)).all())

    def max_content_position(self, group_id: int) -> int | None:
        return self.db.scalar(select(WorkContent.position).where(WorkContent.experience_group_id == group_id).order_by(WorkContent.position.desc()).limit(1))

    def add(self, entity):
        self.db.add(entity)

    def commit(self):
        self.db.commit()

    def refresh(self, entity):
        self.db.refresh(entity)
