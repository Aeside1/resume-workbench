"""方案留档与回滚（04e）：结构性变更留档、历史只增不减、按资产 id 重建。"""

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


def make_assets(auth: dict) -> dict:
    group = client.post(
        "/api/experience-groups",
        headers=auth,
        json={"name": "支付平台实习", "type": "internship", "organization": "示例科技"},
    ).json()
    content = client.post(
        f"/api/experience-groups/{group['id']}/work-contents",
        headers=auth,
        json={"title": "收银台跨端组件重构"},
    ).json()
    highlight = client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions",
        headers=auth,
        json={"label": "技术深度版", "content": "主导收银台跨端组件重构。"},
    ).json()
    return {"group": group, "content": content, "highlight": highlight}


def archives(auth: dict, plan_id: int) -> list[dict]:
    response = client.get(f"/api/resume-plans/{plan_id}/archives", headers=auth)
    assert response.status_code == 200
    return response.json()


def detail(auth: dict, plan_id: int) -> dict:
    response = client.get(f"/api/resume-plans/{plan_id}", headers=auth)
    assert response.status_code == 200
    return response.json()


def item_signature(plan_detail: dict) -> list[tuple]:
    """条目的**资产**签名（不用条目 id）：回滚后条目 id 必然变，资产引用必须一致。"""
    return [
        (block["experience_group_id"], block["show_work_content_titles"],
         tuple((item["work_content_id"], item["resume_description_id"]) for item in block["items"]))
        for block in plan_detail["experience_groups"]
    ]


def test_structural_changes_append_immutable_revisions():
    account = register("archive-append@example.com")
    auth = headers(account["token"])
    assets = make_assets(auth)

    plan = client.post("/api/resume-plans", headers=auth, json={"name": "2026 后端岗"}).json()
    assert [entry["summary"] for entry in archives(auth, plan["id"])] == ["创建方案"]

    block = client.post(
        f"/api/resume-plans/{plan['id']}/experience-groups",
        headers=auth,
        json={"experience_group_id": assets["group"]["id"]},
    ).json()
    client.post(
        f"/api/resume-plans/{plan['id']}/items",
        headers=auth,
        json={"block_id": block["id"], "work_content_id": assets["content"]["id"], "resume_description_id": assets["highlight"]["id"]},
    )
    client.patch(f"/api/resume-plans/{plan['id']}", headers=auth, json={"name": "2026 后端岗（支付）"})

    listed = archives(auth, plan["id"])
    # 倒序：最新在前；只增不改
    assert [entry["summary"] for entry in listed] == [
        "修改方案名称或用途",
        "添加简历亮点：技术深度版",
        "添加经历分组：支付平台实习",
        "创建方案",
    ]
    assert all(entry["source"] == "revision" for entry in listed)
    # 列表不返回 snapshot 全文
    assert all("snapshot" not in entry for entry in listed)


def test_restore_rebuilds_from_asset_ids_and_appends_a_new_revision():
    account = register("archive-restore@example.com")
    auth = headers(account["token"])
    assets = make_assets(auth)

    plan = client.post("/api/resume-plans", headers=auth, json={"name": "2026 后端岗", "purpose": "支付方向"}).json()
    block = client.post(
        f"/api/resume-plans/{plan['id']}/experience-groups",
        headers=auth,
        json={"experience_group_id": assets["group"]["id"]},
    ).json()
    client.post(
        f"/api/resume-plans/{plan['id']}/items",
        headers=auth,
        json={"block_id": block["id"], "work_content_id": assets["content"]["id"], "resume_description_id": assets["highlight"]["id"]},
    )
    rollback_point = archives(auth, plan["id"])[0]["id"]
    rollback_signature = item_signature(detail(auth, plan["id"]))
    count_at_rollback_point = len(archives(auth, plan["id"]))

    # 再做两次变更：改开关 + 改名
    client.patch(
        f"/api/resume-plans/{plan['id']}/experience-groups/{block['id']}",
        headers=auth,
        json={"show_work_content_titles": False},
    )
    client.patch(f"/api/resume-plans/{plan['id']}", headers=auth, json={"name": "改坏了"})
    assert len(archives(auth, plan["id"])) == count_at_rollback_point + 2

    restored = client.post(f"/api/resume-plans/{plan['id']}/archives/{rollback_point}/restore", headers=auth)
    assert restored.status_code == 200
    restored_detail = restored.json()
    # 按资产引用比较：条目 id 变了，资产关系必须一致
    assert item_signature(restored_detail) == rollback_signature
    assert restored_detail["name"] == "2026 后端岗"
    assert restored_detail["experience_groups"][0]["show_work_content_titles"] is True

    # 回滚本身追加一条新留档（历史只增不减）
    listed = archives(auth, plan["id"])
    assert len(listed) == count_at_rollback_point + 3
    assert listed[0]["summary"].startswith("回滚到 ")

    # 再回滚一次可以回到「改坏了」那一版（回滚是可逆的）
    broken = next(entry for entry in listed if entry["summary"] == "修改方案名称或用途")
    again = client.post(f"/api/resume-plans/{plan['id']}/archives/{broken['id']}/restore", headers=auth)
    assert again.status_code == 200
    assert again.json()["name"] == "改坏了"


def test_restore_skips_references_that_no_longer_exist():
    account = register("archive-dangling@example.com")
    auth = headers(account["token"])
    assets = make_assets(auth)

    plan = client.post("/api/resume-plans", headers=auth, json={"name": "2026 后端岗"}).json()
    block = client.post(
        f"/api/resume-plans/{plan['id']}/experience-groups",
        headers=auth,
        json={"experience_group_id": assets["group"]["id"]},
    ).json()
    item = client.post(
        f"/api/resume-plans/{plan['id']}/items",
        headers=auth,
        json={"block_id": block["id"], "work_content_id": assets["content"]["id"], "resume_description_id": assets["highlight"]["id"]},
    ).json()
    rollback_point = archives(auth, plan["id"])[0]["id"]

    # 先移除引用，再彻底删掉这份工作内容（此刻已无人引用，允许删）
    assert client.delete(f"/api/resume-plans/{plan['id']}/items/{item['id']}", headers=auth).status_code == 204
    assert client.delete(f"/api/work-contents/{assets['content']['id']}", headers=auth).status_code == 204

    restored = client.post(f"/api/resume-plans/{plan['id']}/archives/{rollback_point}/restore", headers=auth)
    assert restored.status_code == 200
    restored_detail = restored.json()
    # 经历块能恢复；那一条引用的工作内容已不存在 → 保留占位（与 04b 同口径：不静默丢弃）
    assert len(restored_detail["experience_groups"]) == 1
    restored_items = restored_detail["experience_groups"][0]["items"]
    assert len(restored_items) == 1
    assert restored_items[0]["work_content_id"] is None
    assert restored_items[0]["status"] == "missing_source"
    markdown = client.get(f"/api/resume-plans/{plan['id']}/document", headers=auth).json()["markdown"]
    assert "引用已失效" in markdown
    summary = archives(auth, plan["id"])[0]["summary"]
    assert "引用已失效，已保留占位" in summary


def test_archives_are_isolated_by_user():
    alice = register("archive-alice@example.com")
    bob = register("archive-bob@example.com")
    alice_auth, bob_auth = headers(alice["token"]), headers(bob["token"])

    plan = client.post("/api/resume-plans", headers=alice_auth, json={"name": "Alice 的方案"}).json()
    archive_id = archives(alice_auth, plan["id"])[0]["id"]

    assert client.get(f"/api/resume-plans/{plan['id']}/archives", headers=bob_auth).status_code == 404
    assert client.post(
        f"/api/resume-plans/{plan['id']}/archives/{archive_id}/restore", headers=bob_auth
    ).status_code == 404
    # 不存在的留档 id 也是 404
    assert client.post(
        f"/api/resume-plans/{plan['id']}/archives/999999/restore", headers=alice_auth
    ).status_code == 404
