from fastapi import HTTPException
from sqlalchemy.orm import Session

from .experience_repository import ExperienceRepository
from .models import ExperienceGroup, User, WorkContent
from .resume_plan_repository import PlanReferenceGuard


class ExperienceGroupService:
    """Application service for the experience-content aggregate."""

    def __init__(self, db: Session, user: User):
        self.repository = ExperienceRepository(db)
        self.references = PlanReferenceGuard(db)
        self.user = user

    def group(self, group_id: int) -> ExperienceGroup:
        group = self.repository.group_for_owner(group_id, self.user.id)
        if group is None:
            raise HTTPException(status_code=404, detail="经历分组不存在")
        return group

    def content(self, content_id: int) -> WorkContent:
        content = self.repository.content_for_owner(content_id, self.user.id)
        if content is None:
            raise HTTPException(status_code=404, detail="具体工作内容不存在")
        return content

    def list_groups(self, include_archived: bool) -> list[ExperienceGroup]:
        return self.repository.list_groups(self.user.id, include_archived)

    def create_group(self, values: dict) -> ExperienceGroup:
        group = ExperienceGroup(user_id=self.user.id, **values)
        return self.repository.save(group)

    def update_group(self, group_id: int, values: dict) -> ExperienceGroup:
        group = self.group(group_id)
        start = values.get("start_date", group.start_date)
        end = values.get("end_date", group.end_date)
        if start is not None and end is not None and end < start:
            raise HTTPException(status_code=422, detail="结束日期不能早于开始日期")
        for key, value in values.items():
            setattr(group, key, value)
        return self.repository.save(group)

    def set_group_archived(self, group_id: int, archived: bool) -> ExperienceGroup:
        group = self.group(group_id)
        group.archived = archived
        return self.repository.save(group)

    def delete_group(self, group_id: int) -> None:
        group = self.group(group_id)
        # 被简历方案引用的经历分组（含其下具体工作内容）不允许彻底删除（ADR 005 §2.4）
        self.references.ensure_group_deletable(group.id)
        self.repository.delete(group)

    def list_contents(self, group_id: int, include_archived: bool) -> list[WorkContent]:
        group = self.group(group_id)
        return self.repository.list_contents(group.id, include_archived)

    def create_content(self, group_id: int, values: dict) -> WorkContent:
        group = self.group(group_id)
        max_position = self.repository.max_content_position(group.id)
        content = WorkContent(
            experience_group_id=group.id,
            position=max_position + 1 if max_position is not None else 0,
            **values,
        )
        return self.repository.save(content)

    def update_content(self, content_id: int, values: dict) -> WorkContent:
        content = self.content(content_id)
        for key, value in values.items():
            setattr(content, key, value)
        return self.repository.save(content)

    def reorder_contents(self, group_id: int, content_ids: list[int]) -> list[WorkContent]:
        group = self.group(group_id)
        contents = self.repository.all_contents(group.id)
        by_id = {item.id: item for item in contents}
        if len(content_ids) != len(contents) or set(content_ids) != set(by_id):
            raise HTTPException(status_code=422, detail="排序内容必须完整覆盖该经历分组")
        for position, content_id in enumerate(content_ids):
            by_id[content_id].position = position
        self.repository.commit()
        return self.repository.list_contents(group.id, include_archived=True)

    def set_content_archived(self, content_id: int, archived: bool) -> WorkContent:
        content = self.content(content_id)
        content.archived = archived
        return self.repository.save(content)

    def delete_content(self, content_id: int) -> None:
        content = self.content(content_id)
        self.references.ensure_content_deletable(content.id)
        self.repository.delete(content)

