from datetime import datetime

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
