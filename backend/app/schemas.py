from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class WorkspaceName(BaseModel):
    name: str = Field(min_length=1, max_length=120)

    @field_validator("name")
    @classmethod
    def trim_and_require_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("工作区名称不能为空")
        return value


class WorkspaceCreate(WorkspaceName):
    pass


class WorkspaceUpdate(WorkspaceName):
    pass


class UserView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr


class WorkspaceView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    created_at: datetime
    updated_at: datetime


class AuthResponse(BaseModel):
    token: str
    user: UserView
    workspaces: list[WorkspaceView]


class ExperienceGroupFields(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    type: Literal["internship", "project"]
    organization: str | None = Field(default=None, max_length=200)
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = None

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("经历名称不能为空")
        return value

    @field_validator("end_date")
    @classmethod
    def validate_date_range(cls, value: date | None, info):
        start = info.data.get("start_date")
        if value is not None and start is not None and value < start:
            raise ValueError("结束日期不能早于开始日期")
        return value


class ExperienceGroupCreate(ExperienceGroupFields):
    pass


class ExperienceGroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    type: Literal["internship", "project"] | None = None
    organization: str | None = Field(default=None, max_length=200)
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = None

    @field_validator("name")
    @classmethod
    def trim_optional_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("经历名称不能为空")
        return value


class ExperienceGroupView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    workspace_id: int
    name: str
    type: str
    organization: str | None
    start_date: date | None
    end_date: date | None
    description: str | None
    archived: bool
    created_at: datetime
    updated_at: datetime


class WorkContentFields(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    detailed_record: str | None = None
    technical_materials: str | None = None
    result_data: str | None = None
    supplementary_notes: str | None = None

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("具体工作内容标题不能为空")
        return value


class WorkContentCreate(WorkContentFields):
    pass


class WorkContentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    detailed_record: str | None = None
    technical_materials: str | None = None
    result_data: str | None = None
    supplementary_notes: str | None = None

    @field_validator("title")
    @classmethod
    def trim_optional_title(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("具体工作内容标题不能为空")
        return value


class WorkContentView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    experience_group_id: int
    title: str
    detailed_record: str | None
    technical_materials: str | None
    result_data: str | None
    supplementary_notes: str | None
    position: int
    archived: bool
    created_at: datetime
    updated_at: datetime


class WorkContentReorder(BaseModel):
    work_content_ids: list[int] = Field(min_length=1)
