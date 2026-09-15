"""简历亮点（resume_descriptions）行为测试：独立记录、排序、复制、归档与归属。

术语口径见 CONTEXT.md：面向用户的正式名是「简历亮点」，代码标识符沿用 ResumeDescription。
"""

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def register(email: str) -> dict:
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct horse battery staple"},
    )
    assert response.status_code == 201
    return response.json()


def headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def create_content(auth: dict, *, title: str = "收银台重构", notes: str | None = None) -> dict:
    group = client.post(
        "/api/experience-groups",
        headers=auth,
        json={"name": "支付平台实习", "type": "internship", "organization": "示例科技"},
    ).json()
    response = client.post(
        f"/api/experience-groups/{group['id']}/work-contents",
        headers=auth,
        json={"title": title, "supplementary_notes": notes},
    )
    assert response.status_code == 201
    return response.json()


def get_highlight(auth: dict, highlight_id: int) -> dict:
    response = client.get(f"/api/resume-descriptions/{highlight_id}", headers=auth)
    assert response.status_code == 200
    return response.json()


def highlights(auth: dict, content_id: int, include_archived: bool = False) -> list[dict]:
    response = client.get(
        f"/api/work-contents/{content_id}/resume-descriptions?include_archived={str(include_archived).lower()}",
        headers=auth,
    )
    assert response.status_code == 200
    return response.json()


def test_highlight_lifecycle_is_independent_from_work_content():
    account = register("highlight@example.com")
    auth = headers(account["token"])
    content = create_content(auth)

    assert highlights(auth, content["id"]) == []

    first = client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions",
        headers=auth,
        json={"label": "技术深度版", "content": "设计并落地收银台跨端组件重构。"},
    )
    second = client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions",
        headers=auth,
        json={"label": "精简版", "content": "重构收银台跨端组件。"},
    )
    assert first.status_code == 201 and second.status_code == 201
    first_highlight, second_highlight = first.json(), second.json()

    # 每条亮点是独立记录：有服务端 id、归属与顺序
    assert isinstance(first_highlight["id"], int)
    assert first_highlight["work_content_id"] == content["id"]
    assert first_highlight["label"] == "技术深度版"
    assert first_highlight["archived"] is False
    assert [first_highlight["position"], second_highlight["position"]] == [0, 1]

    listed = highlights(auth, content["id"])
    assert [item["label"] for item in listed] == ["技术深度版", "精简版"]

    # 编辑亮点不触碰具体工作内容的详细记录
    updated = client.patch(
        f"/api/resume-descriptions/{first_highlight['id']}",
        headers=auth,
        json={"content": "设计并落地收银台跨端组件重构，大促零故障。"},
    )
    assert updated.status_code == 200
    assert updated.json()["content"].endswith("大促零故障。")
    reloaded = client.get(
        f"/api/experience-groups/{content['experience_group_id']}/work-contents",
        headers=auth,
    ).json()[0]
    assert reloaded["supplementary_notes"] is None

    # 排序：一次提交完整 id 序列
    reordered = client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions/reorder",
        headers=auth,
        json={"resume_description_ids": [second_highlight["id"], first_highlight["id"]]},
    )
    assert reordered.status_code == 200
    assert [item["id"] for item in reordered.json()] == [second_highlight["id"], first_highlight["id"]]
    assert [item["id"] for item in highlights(auth, content["id"])] == [second_highlight["id"], first_highlight["id"]]


def test_highlight_reorder_rejects_incomplete_set():
    account = register("highlight-reorder@example.com")
    auth = headers(account["token"])
    content = create_content(auth)
    first = client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions",
        headers=auth,
        json={"label": "版一"},
    ).json()
    client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions",
        headers=auth,
        json={"label": "版二"},
    )

    incomplete = client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions/reorder",
        headers=auth,
        json={"resume_description_ids": [first["id"]]},
    )
    assert incomplete.status_code == 422
    assert [item["label"] for item in highlights(auth, content["id"])] == ["版一", "版二"]


def test_highlight_copy_creates_new_record_with_same_content():
    account = register("highlight-copy@example.com")
    auth = headers(account["token"])
    content = create_content(auth)
    original = client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions",
        headers=auth,
        json={"label": "技术深度版", "content": "第一行\n第二行"},
    ).json()

    copied = client.post(f"/api/resume-descriptions/{original['id']}/copy", headers=auth)
    assert copied.status_code == 201
    clone = copied.json()
    assert clone["id"] != original["id"]
    assert clone["label"] == "技术深度版 副本"
    assert clone["content"] == original["content"]
    assert clone["position"] == 1

    # 复制后各自独立：改副本不影响原件
    client.patch(f"/api/resume-descriptions/{clone['id']}", headers=auth, json={"content": "只改副本"})
    assert get_highlight(auth, original["id"])["content"] == "第一行\n第二行"
    assert get_highlight(auth, clone["id"])["content"] == "只改副本"


def test_highlight_archive_and_delete_follow_two_stage_pattern():
    account = register("highlight-archive@example.com")
    auth = headers(account["token"])
    content = create_content(auth)
    highlight = client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions",
        headers=auth,
        json={"label": "会被归档的写法"},
    ).json()

    assert client.post(f"/api/resume-descriptions/{highlight['id']}/archive", headers=auth).status_code == 200
    assert highlights(auth, content["id"]) == []
    assert [item["id"] for item in highlights(auth, content["id"], include_archived=True)] == [highlight["id"]]

    assert client.post(f"/api/resume-descriptions/{highlight['id']}/restore", headers=auth).status_code == 200
    assert [item["id"] for item in highlights(auth, content["id"])] == [highlight["id"]]

    assert client.delete(f"/api/resume-descriptions/{highlight['id']}", headers=auth).status_code == 204
    assert client.get(f"/api/resume-descriptions/{highlight['id']}", headers=auth).status_code == 404


def test_highlight_is_isolated_by_user():
    alice = register("highlight-alice@example.com")
    bob = register("highlight-bob@example.com")
    alice_auth, bob_auth = headers(alice["token"]), headers(bob["token"])
    content = create_content(alice_auth)
    highlight = client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions",
        headers=alice_auth,
        json={"label": "仅 Alice 可见"},
    ).json()

    assert client.get(f"/api/work-contents/{content['id']}/resume-descriptions", headers=bob_auth).status_code == 404
    assert client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions",
        headers=bob_auth,
        json={"label": "越权新建"},
    ).status_code == 404
    assert client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions/reorder",
        headers=bob_auth,
        json={"resume_description_ids": [highlight["id"]]},
    ).status_code == 404
    assert client.get(f"/api/resume-descriptions/{highlight['id']}", headers=bob_auth).status_code == 404
    assert client.patch(
        f"/api/resume-descriptions/{highlight['id']}",
        headers=bob_auth,
        json={"label": "越权改名"},
    ).status_code == 404
    assert client.post(f"/api/resume-descriptions/{highlight['id']}/copy", headers=bob_auth).status_code == 404
    assert client.post(f"/api/resume-descriptions/{highlight['id']}/archive", headers=bob_auth).status_code == 404
    assert client.post(f"/api/resume-descriptions/{highlight['id']}/restore", headers=bob_auth).status_code == 404
    assert client.delete(f"/api/resume-descriptions/{highlight['id']}", headers=bob_auth).status_code == 404
    assert client.get(f"/api/resume-descriptions/999999", headers=bob_auth).status_code == 404
