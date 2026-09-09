import os
import uuid

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url


def _configure_test_database() -> tuple[str, str]:
    raw_url = os.getenv("TEST_DATABASE_URL")
    if not raw_url:
        pytest.exit("TEST_DATABASE_URL 必须指向 Docker PostgreSQL 测试连接，例如 postgresql+psycopg://...", returncode=2)
    if not raw_url.startswith("postgresql"):
        pytest.exit("TEST_DATABASE_URL 必须使用 PostgreSQL，禁止使用 SQLite 测试", returncode=2)

    schema = f"test_{uuid.uuid4().hex}"
    admin_engine = create_engine(raw_url, future=True)
    with admin_engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    admin_engine.dispose()

    url = make_url(raw_url)
    query = dict(url.query)
    query["options"] = f"-csearch_path={schema}"
    os.environ["DATABASE_URL"] = url.set(query=query).render_as_string(hide_password=False)
    return raw_url, schema


TEST_DATABASE_URL, TEST_SCHEMA = _configure_test_database()

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import User, Workspace  # noqa: E402

Base.metadata.create_all(bind=engine)


@pytest.fixture(autouse=True)
def clean_database():
    db = SessionLocal()
    db.query(Workspace).delete()
    db.query(User).delete()
    db.commit()
    db.close()
    yield


@pytest.fixture(scope="session", autouse=True)
def remove_test_schema():
    yield
    admin_engine = create_engine(TEST_DATABASE_URL, future=True)
    with admin_engine.begin() as connection:
        connection.execute(text(f'DROP SCHEMA IF EXISTS "{TEST_SCHEMA}" CASCADE'))
    admin_engine.dispose()
