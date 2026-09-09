import pytest

from app.database import SessionLocal
from app.models import User, Workspace


@pytest.fixture(autouse=True)
def clean_database():
    db = SessionLocal()
    db.query(Workspace).delete()
    db.query(User).delete()
    db.commit()
    db.close()
    yield
