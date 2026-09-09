import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("必须设置 DATABASE_URL，并使用 PostgreSQL 数据库")
if not DATABASE_URL.startswith("postgresql"):
    raise RuntimeError("DATABASE_URL 必须使用 PostgreSQL，SQLite 不受支持")

engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
