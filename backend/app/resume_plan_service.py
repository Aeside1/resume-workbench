import json

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .experience_repository import ExperienceRepository
from .models import ExperienceGroup, PlanArchive, PlanExperienceGroup, PlanItem, ResumeDescription, ResumePlan, User, WorkContent
from .resume_description_repository import ResumeDescriptionRepository
from .resume_plan_assembly import REVISION_SOURCE, assemble_plan, snapshot_plan
from .resume_plan_repository import ResumePlanRepository


class ResumePlanService:
    """Application service for the resume-plan aggregate（简历方案 / 简历大纲）。"""

    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user
        self.repository = ResumePlanRepository(db)
        self.experience = ExperienceRepository(db)
        self.highlights = ResumeDescriptionRepository(db)

    # ---------- 方案本身 ----------

    def plan(self, plan_id: int) -> ResumePlan:
        plan = self.repository.plan_for_owner(plan_id, self.user.id)
        if plan is None:
            raise HTTPException(status_code=404, detail="简历方案不存在")
        return plan

    def list_plans(self, include_archived: bool) -> list[ResumePlan]:
        return self.repository.list_plans(self.user.id, include_archived)

    def create_plan(self, values: dict) -> ResumePlan:
        plan = self.repository.save(ResumePlan(user_id=self.user.id, **values))
        self.record_revision(plan, "创建方案")
        return plan

    def update_plan(self, plan_id: int, values: dict) -> ResumePlan:
        plan = self.plan(plan_id)
        for key, value in values.items():
            setattr(plan, key, value)
        saved = self.repository.save(plan)
        self.record_revision(saved, "修改方案名称或用途")
        return saved

    def set_plan_archived(self, plan_id: int, archived: bool) -> ResumePlan:
        plan = self.plan(plan_id)
        plan.archived = archived
        return self.repository.save(plan)

    def delete_plan(self, plan_id: int) -> None:
        self.repository.delete(self.plan(plan_id))

    def document(self, plan_id: int) -> dict:
        """读时装配（ADR 005 §2.3）：与中栏预览、切片 05 的导出快照共用同一份结果。"""
        return assemble_plan(self.plan(plan_id))

    # ---------- 经历块 ----------

    def block(self, plan: ResumePlan, block_id: int) -> PlanExperienceGroup:
        block = next((candidate for candidate in plan.experience_groups if candidate.id == block_id), None)
        if block is None:
            raise HTTPException(status_code=404, detail="经历块不存在")
        return block

    def group(self, group_id: int) -> ExperienceGroup:
        group = self.experience.group_for_owner(group_id, self.user.id)
        if group is None:
            raise HTTPException(status_code=404, detail="经历分组不存在")
        return group

    def add_block(self, plan_id: int, group_id: int) -> PlanExperienceGroup:
        plan = self.plan(plan_id)
        group = self.group(group_id)
        if group.archived:
            raise HTTPException(status_code=422, detail="已归档的经历分组不能加入简历方案")
        if any(candidate.experience_group_id == group.id for candidate in plan.experience_groups):
            raise HTTPException(status_code=409, detail="该经历分组已经在简历大纲里")
        max_position = self.repository.max_block_position(plan.id)
        block = PlanExperienceGroup(
            plan_id=plan.id,
            experience_group_id=group.id,
            position=max_position + 1 if max_position is not None else 0,
        )
        saved = self.repository.save(block)
        self.record_revision(plan, f"添加经历分组：{group.name}")
        return saved

    def update_block(self, plan_id: int, block_id: int, values: dict) -> PlanExperienceGroup:
        plan = self.plan(plan_id)
        block = self.block(plan, block_id)
        for key, value in values.items():
            setattr(block, key, value)
        saved = self.repository.save(block)
        if "show_work_content_titles" in values:
            self.record_revision(
                plan,
                "文稿中打印工作内容标题" if values["show_work_content_titles"] else "文稿中不打印工作内容标题",
            )
        return saved

    def remove_block(self, plan_id: int, block_id: int) -> None:
        plan = self.plan(plan_id)
        block = self.block(plan, block_id)
        group_name = block.experience_group.name if block.experience_group is not None else "经历分组"
        self.repository.delete(block)
        self.record_revision(plan, f"移除经历分组：{group_name}")

    def reorder_blocks(self, plan_id: int, block_ids: list[int]) -> list[PlanExperienceGroup]:
        plan = self.plan(plan_id)
        blocks = list(plan.experience_groups)
        by_id = {block.id: block for block in blocks}
        if len(block_ids) != len(blocks) or set(block_ids) != set(by_id):
            raise HTTPException(status_code=422, detail="排序内容必须完整覆盖该简历方案的经历块")
        for position, block_id in enumerate(block_ids):
            by_id[block_id].position = position
        self.repository.commit()
        self.record_revision(plan, "调整经历块顺序")
        return [by_id[block_id] for block_id in block_ids]

    # ---------- 简历条目 ----------

    def item(self, plan: ResumePlan, item_id: int) -> PlanItem:
        for block in plan.experience_groups:
            for item in block.items:
                if item.id == item_id:
                    return item
        raise HTTPException(status_code=404, detail="简历条目不存在")

    def content(self, content_id: int) -> WorkContent:
        content = self.experience.content_for_owner(content_id, self.user.id)
        if content is None:
            raise HTTPException(status_code=404, detail="具体工作内容不存在")
        return content

    def highlight(self, highlight_id: int) -> ResumeDescription:
        highlight = self.highlights.highlight_for_owner(highlight_id, self.user.id)
        if highlight is None:
            raise HTTPException(status_code=404, detail="简历亮点不存在")
        return highlight

    def _validated_highlight(self, content: WorkContent, highlight_id: int) -> ResumeDescription:
        highlight = self.highlight(highlight_id)
        if highlight.work_content_id != content.id:
            raise HTTPException(status_code=422, detail="简历亮点必须属于该条目的具体工作内容")
        return highlight

    def _default_highlight(self, content: WorkContent) -> ResumeDescription:
        candidates = self.highlights.list_highlights(content.id, include_archived=False)
        if not candidates:
            raise HTTPException(status_code=422, detail="该具体工作内容还没有简历亮点，请先在经历资产里创建")
        return candidates[0]

    def add_item(self, plan_id: int, payload: dict) -> PlanItem:
        plan = self.plan(plan_id)
        block = self.block(plan, payload["block_id"])
        content = self.content(payload["work_content_id"])
        if content.experience_group_id != block.experience_group_id:
            raise HTTPException(status_code=422, detail="该具体工作内容不属于这个经历块")
        if content.archived:
            raise HTTPException(status_code=422, detail="已归档的具体工作内容不能加入简历方案")

        highlight_id = payload.get("resume_description_id")
        if highlight_id is None:
            # 显式指定时允许引用已归档亮点（用户是刻意选的）；自动挑选只取未归档的
            highlight = self._default_highlight(content)
        else:
            highlight = self._validated_highlight(content, highlight_id)

        max_position = self.repository.max_item_position(block.id)
        item = PlanItem(
            plan_experience_group_id=block.id,
            work_content_id=content.id,
            resume_description_id=highlight.id,
            position=max_position + 1 if max_position is not None else 0,
        )
        saved = self.repository.save(item)
        self.record_revision(plan, f"添加简历亮点：{highlight.label}")
        return saved

    def switch_item_highlight(self, plan_id: int, item_id: int, highlight_id: int) -> PlanItem:
        plan = self.plan(plan_id)
        item = self.item(plan, item_id)
        if item.work_content is None:
            raise HTTPException(status_code=422, detail="这条条目的来源已失效，请先重新选择具体工作内容")
        highlight = self._validated_highlight(item.work_content, highlight_id)
        item.resume_description_id = highlight.id
        saved = self.repository.save(item)
        self.record_revision(plan, f"更换简历亮点：{highlight.label}")
        return saved

    def remove_item(self, plan_id: int, item_id: int) -> None:
        plan = self.plan(plan_id)
        item = self.item(plan, item_id)
        label = item.resume_description.label if item.resume_description is not None else "简历条目"
        self.repository.delete(item)
        self.record_revision(plan, f"移除简历条目：{label}")

    def reorder_items(self, plan_id: int, block_id: int, item_ids: list[int]) -> list[PlanItem]:
        plan = self.plan(plan_id)
        block = self.block(plan, block_id)
        items = list(block.items)
        by_id = {item.id: item for item in items}
        if len(item_ids) != len(items) or set(item_ids) != set(by_id):
            raise HTTPException(status_code=422, detail="排序内容必须完整覆盖该经历块的简历条目")
        for position, item_id in enumerate(item_ids):
            by_id[item_id].position = position
        self.repository.commit()
        self.record_revision(plan, "调整条目顺序")
        return [by_id[item_id] for item_id in item_ids]

    # ---------- 方案留档（ADR 005 §2.3） ----------

    def record_revision(self, plan: ResumePlan, summary: str) -> PlanArchive:
        """结构性变更追加一条 revision 留档。

        追加即不可变，**不做同分钟合并**：每次变更一条，回滚粒度就是每次变更。
        拖拽排序会产生多条记录，属真实历史。
        """
        self.db.refresh(plan)  # 变更已提交：重新加载以保证快照读到的关系是最新的
        archive = PlanArchive(
            plan_id=plan.id,
            source=REVISION_SOURCE,
            summary=summary,
            snapshot=json.dumps(snapshot_plan(plan), ensure_ascii=False),
        )
        return self.repository.save(archive)

    def list_archives(self, plan_id: int) -> list[PlanArchive]:
        return self.repository.list_archives(self.plan(plan_id).id)

    def restore_archive(self, plan_id: int, archive_id: int) -> ResumePlan:
        """按留档的**资产 id** 重建经历块与条目，然后追加一条新留档（历史只增不减）。"""
        plan = self.plan(plan_id)
        archive = self.repository.archive_for_plan(archive_id, plan.id)
        if archive is None:
            raise HTTPException(status_code=404, detail="方案留档不存在")
        data = json.loads(archive.snapshot)

        for block in list(plan.experience_groups):
            self.db.delete(block)
        self.db.commit()

        skipped = 0
        for block_data in sorted(data.get("blocks", []), key=lambda entry: entry["position"]):
            group = self.experience.group_for_owner(block_data["experience_group_id"], self.user.id)
            if group is None:
                skipped += 1
                continue
            block = PlanExperienceGroup(
                plan_id=plan.id,
                experience_group_id=group.id,
                position=block_data["position"],
                show_work_content_titles=block_data.get("show_work_content_titles", True),
            )
            self.db.add(block)
            self.db.flush()
            for item_data in sorted(block_data.get("items", []), key=lambda entry: entry["position"]):
                content = (
                    self.experience.content_for_owner(item_data["work_content_id"], self.user.id)
                    if item_data.get("work_content_id") is not None
                    else None
                )
                highlight = None
                if content is not None and item_data.get("resume_description_id") is not None:
                    candidate = self.highlights.highlight_for_owner(item_data["resume_description_id"], self.user.id)
                    if candidate is not None and candidate.work_content_id == content.id:
                        highlight = candidate
                if content is None:
                    skipped += 1
                self.db.add(
                    PlanItem(
                        plan_experience_group_id=block.id,
                        work_content_id=content.id if content is not None else None,
                        resume_description_id=highlight.id if highlight is not None else None,
                        position=item_data["position"],
                    )
                )

        plan.name = data.get("name") or plan.name
        plan.purpose = data.get("purpose")
        self.db.commit()

        summary = f"回滚到 {archive.created_at:%Y-%m-%d %H:%M}"
        if skipped:
            # 与 04b 同口径：引用解析不到时不静默丢弃，保留占位让用户重修（“引用已失效”）
            summary += f"（{skipped} 条引用已失效，已保留占位）"
        self.record_revision(plan, summary)
        self.db.expire_all()
        return self.plan(plan_id)

    # ---------- 可选素材 ----------

    def candidates(self, plan_id: int) -> dict:
        """可加入方案的素材：排除已归档资产，并标记哪些已经在方案里。"""
        plan = self.plan(plan_id)
        added_groups = {block.experience_group_id for block in plan.experience_groups}
        added_contents = {
            item.work_content_id
            for block in plan.experience_groups
            for item in block.items
            if item.work_content_id is not None
        }
        added_highlights = {
            item.resume_description_id
            for block in plan.experience_groups
            for item in block.items
            if item.resume_description_id is not None
        }

        groups = []
        for group in self.experience.list_groups(self.user.id, include_archived=False):
            contents = []
            for content in self.experience.list_contents(group.id, include_archived=False):
                highlights = [
                    {
                        "id": highlight.id,
                        "label": highlight.label,
                        "content": highlight.content,
                        "position": highlight.position,
                        "already_added": highlight.id in added_highlights,
                    }
                    for highlight in self.highlights.list_highlights(content.id, include_archived=False)
                ]
                contents.append(
                    {
                        "id": content.id,
                        "title": content.title,
                        "already_added": content.id in added_contents,
                        "highlights": highlights,
                    }
                )
            groups.append(
                {
                    "id": group.id,
                    "name": group.name,
                    "type": group.type,
                    "organization": group.organization,
                    "start_date": group.start_date,
                    "end_date": group.end_date,
                    "already_added": group.id in added_groups,
                    "work_contents": contents,
                }
            )
        return {"experience_groups": groups}
