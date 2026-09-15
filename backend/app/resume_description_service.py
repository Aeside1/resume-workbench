from fastapi import HTTPException
from sqlalchemy.orm import Session

from .models import ResumeDescription, User, WorkContent
from .resume_description_repository import ResumeDescriptionRepository
from .resume_plan_repository import PlanReferenceGuard


DEFAULT_LABEL = "新的简历亮点"


class ResumeDescriptionService:
    """Application service for the resume-highlight aggregate（简历亮点）。"""

    def __init__(self, db: Session, user: User):
        self.repository = ResumeDescriptionRepository(db)
        self.references = PlanReferenceGuard(db)
        self.user = user

    def content(self, content_id: int) -> WorkContent:
        content = self.repository.content_for_owner(content_id, self.user.id)
        if content is None:
            raise HTTPException(status_code=404, detail="具体工作内容不存在")
        return content

    def highlight(self, highlight_id: int) -> ResumeDescription:
        highlight = self.repository.highlight_for_owner(highlight_id, self.user.id)
        if highlight is None:
            raise HTTPException(status_code=404, detail="简历亮点不存在")
        return highlight

    def list_highlights(self, content_id: int, include_archived: bool) -> list[ResumeDescription]:
        content = self.content(content_id)
        return self.repository.list_highlights(content.id, include_archived)

    def create_highlight(self, content_id: int, values: dict) -> ResumeDescription:
        content = self.content(content_id)
        max_position = self.repository.max_position(content.id)
        highlight = ResumeDescription(
            work_content_id=content.id,
            label=values.get("label") or DEFAULT_LABEL,
            content=values.get("content") or "",
            position=max_position + 1 if max_position is not None else 0,
        )
        return self.repository.save(highlight)

    def update_highlight(self, highlight_id: int, values: dict) -> ResumeDescription:
        highlight = self.highlight(highlight_id)
        for key, value in values.items():
            setattr(highlight, key, value)
        return self.repository.save(highlight)

    def copy_highlight(self, highlight_id: int) -> ResumeDescription:
        """复制成新的简历亮点：内容独立，此后各自编辑互不影响。"""
        original = self.highlight(highlight_id)
        max_position = self.repository.max_position(original.work_content_id)
        clone = ResumeDescription(
            work_content_id=original.work_content_id,
            label=f"{original.label} 副本",
            content=original.content,
            position=max_position + 1 if max_position is not None else 0,
        )
        return self.repository.save(clone)

    def set_archived(self, highlight_id: int, archived: bool) -> ResumeDescription:
        highlight = self.highlight(highlight_id)
        highlight.archived = archived
        return self.repository.save(highlight)

    def delete_highlight(self, highlight_id: int) -> None:
        highlight = self.highlight(highlight_id)
        # 被简历方案条目引用的亮点不允许彻底删除（ADR 005 §2.4）；归档不受影响
        self.references.ensure_highlight_deletable(highlight.id)
        self.repository.delete(highlight)

    def reorder_highlights(self, content_id: int, highlight_ids: list[int]) -> list[ResumeDescription]:
        content = self.content(content_id)
        highlights = self.repository.all_highlights(content.id)
        by_id = {item.id: item for item in highlights}
        if len(highlight_ids) != len(highlights) or set(highlight_ids) != set(by_id):
            raise HTTPException(status_code=422, detail="排序内容必须完整覆盖该具体工作内容")
        for position, highlight_id in enumerate(highlight_ids):
            by_id[highlight_id].position = position
        self.repository.commit()
        return self.repository.list_highlights(content.id, include_archived=True)
