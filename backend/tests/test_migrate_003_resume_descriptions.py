"""迁移 003 的行为测试：把 supplementary_notes 的历史形状展开为独立简历亮点，且幂等。"""

import json
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.database import engine
from app.main import app


client = TestClient(app)
MIGRATION = Path(__file__).resolve().parents[1] / "migrate_003_resume_descriptions.sql"


def run_migration() -> None:
    with engine.begin() as connection:
        connection.execute(text(MIGRATION.read_text(encoding="utf-8")))


def register(email: str) -> dict:
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct horse battery staple"},
    )
    assert response.status_code == 201
    return response.json()


def create_content(auth: dict, title: str, notes: str | None) -> int:
    group = client.post(
        "/api/experience-groups",
        headers=auth,
        json={"name": "迁移测试分组", "type": "project"},
    ).json()
    response = client.post(
        f"/api/experience-groups/{group['id']}/work-contents",
        headers=auth,
        json={"title": title, "supplementary_notes": notes},
    )
    assert response.status_code == 201
    return response.json()["id"]


def rows_of(content_id: int) -> list[dict]:
    with engine.connect() as connection:
        result = connection.execute(
            text(
                "select legacy_id, label, content, position, archived"
                " from resume_descriptions where work_content_id = :content_id"
                " order by position, id"
            ),
            {"content_id": content_id},
        )
        return [dict(row._mapping) for row in result.all()]


def total_rows() -> int:
    with engine.connect() as connection:
        return connection.scalar(text("select count(*) from resume_descriptions"))


def test_migration_expands_every_legacy_shape_and_is_idempotent():
    account = register("migration@example.com")
    auth = {"Authorization": f"Bearer {account['token']}"}

    versions_content = create_content(
        auth,
        "新形状：versions 数组",
        json.dumps(
            {
                "note": "灰度发布补充说明",
                "versions": [
                    {"id": "desc_legacy_1", "label": "技术深度版", "content": "第一行\n第二行"},
                    {"id": "desc_legacy_2", "label": "精简版", "content": "精简正文"},
                ],
            },
            ensure_ascii=False,
        ),
    )
    legacy_content = create_content(
        auth,
        "旧形状：descriptions + points",
        json.dumps(
            {
                "note": "主导双周全链路压测复盘",
                "descriptions": [
                    {"id": "desc_1", "label": "技术架构版", "points": ["要点一", "要点二"]},
                ],
            },
            ensure_ascii=False,
        ),
    )
    plain_content = create_content(auth, "纯文本", "支撑日均千万级消息吞吐")
    note_only_content = create_content(auth, "只有说明", json.dumps({"note": "只有 note"}, ensure_ascii=False))
    empty_content = create_content(auth, "空", None)

    run_migration()

    assert rows_of(versions_content) == [
        {"legacy_id": "desc_legacy_1", "label": "技术深度版", "content": "第一行\n第二行", "position": 0, "archived": False},
        {"legacy_id": "desc_legacy_2", "label": "精简版", "content": "精简正文", "position": 1, "archived": False},
    ]
    assert rows_of(legacy_content) == [
        {"legacy_id": "desc_1", "label": "技术架构版", "content": "要点一\n要点二", "position": 0, "archived": False},
    ]
    assert rows_of(plain_content) == [
        {"legacy_id": "default", "label": "默认写法", "content": "支撑日均千万级消息吞吐", "position": 0, "archived": False},
    ]
    # note 与空值不产生亮点
    assert rows_of(note_only_content) == []
    assert rows_of(empty_content) == []
    assert total_rows() == 4

    run_migration()

    assert total_rows() == 4
    assert rows_of(versions_content)[0]["content"] == "第一行\n第二行"


def test_migration_does_not_touch_records_created_through_the_api():
    account = register("migration-api@example.com")
    auth = {"Authorization": f"Bearer {account['token']}"}
    content_id = create_content(
        auth,
        "已经有新亮点的内容",
        json.dumps({"note": "旧说明", "versions": [{"id": "old_1", "label": "旧写法", "content": "旧正文"}]}, ensure_ascii=False),
    )
    created = client.post(
        f"/api/work-contents/{content_id}/resume-descriptions",
        headers=auth,
        json={"label": "新建亮点", "content": "新正文"},
    )
    assert created.status_code == 201

    run_migration()

    labels = [row["label"] for row in rows_of(content_id)]
    assert "新建亮点" in labels
    assert "旧写法" in labels
    # 新建记录不带旧 id，脚本不会把它当成迁移目标反复写入
    assert rows_of(content_id)[0]["legacy_id"] is None

    run_migration()
    assert len(rows_of(content_id)) == 2
