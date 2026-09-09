from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .auth import decode_token
from .database import get_db
from .models import User


def bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="需要登录")
    return authorization.split(" ", 1)[1].strip()


def current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    token = bearer_token(authorization)
    user_id = decode_token(token)
    user = db.get(User, user_id) if user_id else None
    if user is None:
        raise HTTPException(status_code=401, detail="登录状态无效或已过期")
    return user
