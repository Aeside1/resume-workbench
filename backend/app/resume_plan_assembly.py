"""简历方案的读时装配（ADR 005 §2.3）。

装配是纯函数：输入方案（含经历块、条目与解析到的资产），产出结构化大纲与 Markdown 文稿；
结果不落库。方案编辑器的中栏编排视图、`/document` 与切片 05 的导出快照共用本模块，
以满足「预览与导出使用同一份组装结果」。

引用解析不到时不静默丢弃：条目渲染为显式的「待选简历亮点」或「引用已失效」。
"""

from datetime import date

from .models import PlanItem, ResumePlan


# 板块固定枚举（ADR 005 §2.1）：实习经历在前，项目经历在后
SECTIONS: tuple[tuple[str, str], ...] = (("internship", "实习经历"), ("project", "项目经历"))

MISSING_SOURCE_LABEL = "引用已失效"
MISSING_HIGHLIGHT_LABEL = "待选简历亮点"

# 方案留档的两类来源（ADR 005 §2.3）
REVISION_SOURCE = "revision"
EXPORT_SOURCE = "export"


def snapshot_plan(plan: ResumePlan) -> dict:
    """留档用的结构快照。

    只存**资产 id**（经历分组 / 具体工作内容 / 简历亮点）与顺序、块级开关、方案名称与用途；
    不存经历块 id 与条目 id——回滚是按资产重建的，条目 id 在重建后必然变化（04e 票面提醒）。
    """
    return {
        "name": plan.name,
        "purpose": plan.purpose,
        "blocks": [
            {
                "experience_group_id": block.experience_group_id,
                "position": block.position,
                "show_work_content_titles": block.show_work_content_titles,
                "items": [
                    {
                        "work_content_id": item.work_content_id,
                        "resume_description_id": item.resume_description_id,
                        "position": item.position,
                    }
                    for item in sorted(block.items, key=lambda candidate: (candidate.position, candidate.id))
                ],
            }
            for block in sorted(plan.experience_groups, key=lambda candidate: (candidate.position, candidate.id))
        ],
    }


def format_month(value: date | None) -> str | None:
    return f"{value.year:04d}.{value.month:02d}" if value is not None else None


def format_period(start: date | None, end: date | None) -> str | None:
    if start is None and end is None:
        return None
    if start is None:
        return format_month(end)
    return f"{format_month(start)}–{format_month(end) or '至今'}"


def item_status(item: PlanItem) -> str:
    """条目引用的解析状态：ok / missing_highlight（没选亮点）/ missing_source（来源已不存在）。"""
    if item.work_content is None:
        return "missing_source"
    if item.resume_description is None:
        return "missing_highlight"
    return "ok"


def render_item(item: PlanItem) -> dict:
    status = item_status(item)
    return {
        "id": item.id,
        "plan_experience_group_id": item.plan_experience_group_id,
        "work_content_id": item.work_content_id,
        "resume_description_id": item.resume_description_id,
        "position": item.position,
        "work_content_title": item.work_content.title if item.work_content is not None else None,
        "highlight_label": item.resume_description.label if item.resume_description is not None else None,
        "highlight_content": item.resume_description.content if item.resume_description is not None else None,
        "status": status,
    }


def render_block(block) -> dict:
    group = block.experience_group
    items = sorted(block.items, key=lambda candidate: (candidate.position, candidate.id))
    return {
        "id": block.id,
        "plan_id": block.plan_id,
        "experience_group_id": block.experience_group_id,
        "position": block.position,
        "show_work_content_titles": block.show_work_content_titles,
        "name": group.name if group is not None else "",
        "type": group.type if group is not None else "project",
        "organization": group.organization if group is not None else None,
        "start_date": group.start_date if group is not None else None,
        "end_date": group.end_date if group is not None else None,
        "items": [render_item(item) for item in items],
    }


def plan_blocks(plan: ResumePlan) -> list[dict]:
    """按块级顺序渲染全部经历块（不按板块分组，供方案详情使用）。"""
    blocks = sorted(plan.experience_groups, key=lambda candidate: (candidate.position, candidate.id))
    return [render_block(block) for block in blocks]


def build_detail(plan: ResumePlan) -> dict:
    return {
        "id": plan.id,
        "user_id": plan.user_id,
        "name": plan.name,
        "purpose": plan.purpose,
        "archived": plan.archived,
        "created_at": plan.created_at,
        "updated_at": plan.updated_at,
        "experience_groups": plan_blocks(plan),
    }


def build_outline(plan: ResumePlan) -> dict:
    """板块 → 经历块 → 条目的结构化大纲；板块恒为两个，空板块也保留（编辑器需要）。"""
    rendered = plan_blocks(plan)
    sections = []
    for section_key, section_title in SECTIONS:
        sections.append(
            {
                "section": section_key,
                "title": section_title,
                "blocks": [block for block in rendered if block["type"] == section_key],
            }
        )
    return {
        "name": plan.name,
        "purpose": plan.purpose,
        "sections": sections,
    }


def block_heading(block: dict) -> str:
    """经历块抬头：分组名 · 组织 · 时间范围（缺项自动省略）。"""
    parts = [block["name"] or "未命名经历"]
    if block["organization"]:
        parts.append(block["organization"])
    period = format_period(block["start_date"], block["end_date"])
    if period:
        parts.append(period)
    return " · ".join(part for part in parts if part)


def render_markdown(plan: ResumePlan, outline: dict) -> str:
    lines: list[str] = [f"# {plan.name}"]
    if plan.purpose:
        lines.extend(["", f"> {plan.purpose}"])

    for section in outline["sections"]:
        blocks = section["blocks"]
        if not blocks:
            continue
        lines.extend(["", f"## {section['title']}"])
        for block in blocks:
            lines.extend(["", f"### {block_heading(block)}"])
            previous_work_content_id: int | None = None
            for item in block["items"]:
                if block["show_work_content_titles"] and item["work_content_title"]:
                    # 同一工作内容的连续条目只打印一次标题，保持用户拖出的条目顺序
                    if item["work_content_id"] != previous_work_content_id:
                        lines.extend(["", f"**{item['work_content_title']}**"])
                previous_work_content_id = item["work_content_id"]

                if item["status"] == "missing_source":
                    lines.extend(["", f"> {MISSING_SOURCE_LABEL}：这条条目的原具体工作内容已不存在。"])
                elif item["status"] == "missing_highlight":
                    lines.extend(["", f"> {MISSING_HIGHLIGHT_LABEL}：这条条目还没有选定简历亮点。"])
                else:
                    lines.extend(["", item["highlight_content"] or ""])
    return "\n".join(lines).strip() + "\n"


def assemble_plan(plan: ResumePlan) -> dict:
    """返回 `{"markdown": str, "outline": dict}`；调用方负责在事务内加载好关系。"""
    outline = build_outline(plan)
    return {"markdown": render_markdown(plan, outline), "outline": outline}
