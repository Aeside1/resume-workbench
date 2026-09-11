from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
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
    # 注：ResumePlan（简历方案）将在工单 04 中实现，外键直连 users.id 并在此关联 back_populates


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
