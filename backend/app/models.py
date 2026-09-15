from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """个人用户账号：遵循 ADR 002，账号本身即为唯一工作空间，经历资产与简历方案均直连 user_id。"""
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    experience_groups: Mapped[list["ExperienceGroup"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    resume_plans: Mapped[list["ResumePlan"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class ExperienceGroup(Base):
    __tablename__ = "experience_groups"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(32))
    organization: Mapped[str | None] = mapped_column(String(200), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    user: Mapped[User] = relationship(back_populates="experience_groups")
    work_contents: Mapped[list["WorkContent"]] = relationship(back_populates="experience_group", cascade="all, delete-orphan", order_by="WorkContent.position")


class WorkContent(Base):
    __tablename__ = "work_contents"
    id: Mapped[int] = mapped_column(primary_key=True)
    experience_group_id: Mapped[int] = mapped_column(ForeignKey("experience_groups.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    detailed_record: Mapped[str | None] = mapped_column(Text, nullable=True)
    technical_materials: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    supplementary_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    experience_group: Mapped[ExperienceGroup] = relationship(back_populates="work_contents")
    resume_descriptions: Mapped[list["ResumeDescription"]] = relationship(
        back_populates="work_content",
        cascade="all, delete-orphan",
        order_by="ResumeDescription.position",
    )


class ResumeDescription(Base):
    """简历亮点（术语见 CONTEXT.md）：某条具体工作内容下的一种可直接放进简历的写法。

    与具体工作内容的详细记录保持独立；同一工作内容下可有多条，各自有稳定 id、
    顺序与归档状态，供简历方案的条目引用。

    legacy_id 记录迁移前 JSON 内的旧 id（幂等搬运脚本的去重键），新建记录为空。
    """

    __tablename__ = "resume_descriptions"
    __table_args__ = (UniqueConstraint("work_content_id", "legacy_id", name="uq_resume_descriptions_legacy"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    work_content_id: Mapped[int] = mapped_column(ForeignKey("work_contents.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    legacy_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    work_content: Mapped[WorkContent] = relationship(back_populates="resume_descriptions")


class ResumePlan(Base):
    """简历方案（术语见 CONTEXT.md）：面向一次求职准备的一套可编辑简历组合。

    只保存引用（经历块 + 简历条目），不保存组合结果的文本副本；
    读时装配见 `resume_plan_assembly.assemble_plan`。
    """

    __tablename__ = "resume_plans"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    purpose: Mapped[str | None] = mapped_column(String(200), nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    user: Mapped[User] = relationship(back_populates="resume_plans")
    experience_groups: Mapped[list["PlanExperienceGroup"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="PlanExperienceGroup.position",
    )
    archives: Mapped[list["PlanArchive"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="PlanArchive.id",
    )


class PlanExperienceGroup(Base):
    """经历块（简历大纲里的一段经历）：引用一段经历分组，块内承载若干简历条目。

    所属板块由 `experience_group.type` 自动决定，不在本表落列（ADR 005 §2.1）。
    """

    __tablename__ = "plan_experience_groups"
    __table_args__ = (UniqueConstraint("plan_id", "experience_group_id", name="uq_plan_experience_groups"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("resume_plans.id", ondelete="CASCADE"), index=True)
    experience_group_id: Mapped[int] = mapped_column(ForeignKey("experience_groups.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    show_work_content_titles: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    plan: Mapped[ResumePlan] = relationship(back_populates="experience_groups")
    experience_group: Mapped[ExperienceGroup] = relationship()
    items: Mapped[list["PlanItem"]] = relationship(
        back_populates="block",
        cascade="all, delete-orphan",
        order_by="PlanItem.position",
    )


class PlanItem(Base):
    """简历条目：简历大纲里的一行 = 某条具体工作内容下的某条简历亮点被采纳进本方案。

    两个引用列都可为空，并采用 ON DELETE SET NULL：删除资产的正路被 409 守卫拦住，
    万一出现悬挂引用，装配时渲染成显式的「待选简历亮点」/「引用已失效」而不是静默丢弃
    （CONTEXT.md 核心业务边界）。
    """

    __tablename__ = "plan_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    plan_experience_group_id: Mapped[int] = mapped_column(
        ForeignKey("plan_experience_groups.id", ondelete="CASCADE"), index=True
    )
    work_content_id: Mapped[int | None] = mapped_column(
        ForeignKey("work_contents.id", ondelete="SET NULL"), nullable=True, index=True
    )
    resume_description_id: Mapped[int | None] = mapped_column(
        ForeignKey("resume_descriptions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    block: Mapped[PlanExperienceGroup] = relationship(back_populates="items")
    work_content: Mapped[WorkContent | None] = relationship()
    resume_description: Mapped[ResumeDescription | None] = relationship()


class PlanArchive(Base):
    """方案留档：简历方案在某一时刻的完整内容留档（不可变）。

    `source` 区分两类：`revision`（结构性变更自动留档，供回滚）与 `export`（导出快照，切片 05）。
    行为实现见工单 04e；本切片只建表，避免后续再加表。
    """

    __tablename__ = "plan_archives"
    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("resume_plans.id", ondelete="CASCADE"), index=True)
    source: Mapped[str] = mapped_column(String(16), nullable=False)
    summary: Mapped[str | None] = mapped_column(String(200), nullable=True)
    snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    plan: Mapped[ResumePlan] = relationship(back_populates="archives")
