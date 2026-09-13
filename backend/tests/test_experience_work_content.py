from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def register(email: str):
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct horse battery staple"},
    )
    assert response.status_code == 201
    return response.json()


def headers(token: str):
    return {"Authorization": f"Bearer {token}"}


def test_experience_group_and_work_contents_lifecycle_is_persistent():
    account = register("experience@example.com")
    auth = headers(account["token"])

    group_response = client.post(
        "/api/experience-groups",
        headers=auth,
        json={
            "name": "支付平台实习",
            "type": "internship",
            "organization": "示例科技",
            "start_date": "2024-03-01",
            "end_date": "2024-08-31",
            "description": "负责支付链路稳定性建设",
        },
    )
    assert group_response.status_code == 201
    group = group_response.json()
    assert group["type"] == "internship"
    assert group["organization"] == "示例科技"
    assert group["archived"] is False
    assert group["user_id"] == account["user"]["id"]

    first = client.post(
        f"/api/experience-groups/{group['id']}/work-contents",
        headers=auth,
        json={
            "title": "统一发布状态模型",
            "detailed_record": "梳理发布状态与失败转移条件。",
            "technical_materials": "Rust、PostgreSQL、状态机",
            "result_data": "发布回滚耗时从 15 分钟降至 3 分钟",
            "supplementary_notes": "补充灰度发布方案",
        },
    )
    second = client.post(
        f"/api/experience-groups/{group['id']}/work-contents",
        headers=auth,
        json={"title": "补充失败重试机制", "detailed_record": "增加幂等重试。"},
    )
    assert first.status_code == second.status_code == 201
    first_content, second_content = first.json(), second.json()
    assert [item["title"] for item in client.get(f"/api/experience-groups/{group['id']}/work-contents", headers=auth).json()] == [
        "统一发布状态模型",
        "补充失败重试机制",
    ]

    update = client.patch(
        f"/api/work-contents/{first_content['id']}",
        headers=auth,
        json={"result_data": "发布回滚耗时从 15 分钟降至 3 分钟，成功率 99.9%"},
    )
    assert update.status_code == 200
    assert update.json()["result_data"].endswith("99.9%")

    reorder = client.post(
        f"/api/experience-groups/{group['id']}/work-contents/reorder",
        headers=auth,
        json={"work_content_ids": [second_content["id"], first_content["id"]]},
    )
    assert reorder.status_code == 200
    assert [item["id"] for item in reorder.json()] == [second_content["id"], first_content["id"]]

    assert client.post(f"/api/experience-groups/{group['id']}/archive", headers=auth).status_code == 200
    assert client.get("/api/experience-groups", headers=auth).json() == []
    assert client.get("/api/experience-groups?include_archived=true", headers=auth).json()[0]["archived"] is True
    assert client.post(f"/api/experience-groups/{group['id']}/restore", headers=auth).status_code == 200
    assert client.get("/api/experience-groups", headers=auth).json()[0]["id"] == group["id"]

    assert client.post(f"/api/work-contents/{first_content['id']}/archive", headers=auth).status_code == 200
    assert client.get(f"/api/experience-groups/{group['id']}/work-contents", headers=auth).json()[0]["id"] == second_content["id"]
    assert client.post(f"/api/work-contents/{first_content['id']}/restore", headers=auth).status_code == 200

    # 重新请求仍能看到相同的关系和已保存字段。
    fresh = client.get(f"/api/experience-groups/{group['id']}/work-contents?include_archived=true", headers=auth)
    assert fresh.status_code == 200
    restored = next(item for item in fresh.json() if item["id"] == first_content["id"])
    assert restored["technical_materials"] == "Rust、PostgreSQL、状态机"
    assert restored["result_data"].endswith("99.9%")


def test_experience_data_is_isolated_by_user():
    alice = register("experience-alice@example.com")
    bob = register("experience-bob@example.com")
    alice_auth, bob_auth = headers(alice["token"]), headers(bob["token"])
    group = client.post(
        "/api/experience-groups",
        headers=alice_auth,
        json={"name": "Alice 项目", "type": "project"},
    ).json()
    content = client.post(
        f"/api/experience-groups/{group['id']}/work-contents",
        headers=alice_auth,
        json={"title": "仅 Alice 可见的具体工作内容"},
    ).json()

    assert client.get("/api/experience-groups", headers=bob_auth).json() == []
    assert client.get(f"/api/experience-groups/{group['id']}", headers=bob_auth).status_code == 404
    assert client.patch(f"/api/experience-groups/{group['id']}", headers=bob_auth, json={"name": "越权"}).status_code == 404
    assert client.post(f"/api/experience-groups/{group['id']}/work-contents", headers=bob_auth, json={"title": "越权"}).status_code == 404
    assert client.get(f"/api/experience-groups/{group['id']}/work-contents", headers=bob_auth).status_code == 404
    assert client.post(
        f"/api/experience-groups/{group['id']}/work-contents/reorder",
        headers=bob_auth,
        json={"work_content_ids": [content["id"]]},
    ).status_code == 404
    assert client.patch(f"/api/work-contents/{content['id']}", headers=bob_auth, json={"title": "越权"}).status_code == 404
    assert client.post(f"/api/work-contents/{content['id']}/archive", headers=bob_auth).status_code == 404
    assert client.post(f"/api/work-contents/{content['id']}/restore", headers=bob_auth).status_code == 404
    assert client.post(f"/api/experience-groups/{group['id']}/archive", headers=bob_auth).status_code == 404
    assert client.delete(f"/api/work-contents/{content['id']}", headers=bob_auth).status_code == 404
    assert client.delete(f"/api/experience-groups/{group['id']}", headers=bob_auth).status_code == 404




def test_experience_group_validation_rejects_invalid_type_and_range():
    account = register("experience-validation@example.com")
    auth = headers(account["token"])
    invalid_type = client.post(
        "/api/experience-groups",
        headers=auth,
        json={"name": "未知", "type": "other"},
    )
    assert invalid_type.status_code == 422
    invalid_range = client.post(
        "/api/experience-groups",
        headers=auth,
        json={"name": "日期错误", "type": "project", "start_date": "2025-02-01", "end_date": "2024-01-01"},
    )
    assert invalid_range.status_code == 422


def test_delete_experience_group_cascades_work_contents():
    account = register("experience-delete@example.com")
    auth = headers(account["token"])
    group = client.post(
        "/api/experience-groups",
        headers=auth,
        json={"name": "待删除项目", "type": "project"},
    ).json()
    content = client.post(
        f"/api/experience-groups/{group['id']}/work-contents",
        headers=auth,
        json={"title": "待级联删除工作项"},
    ).json()

    delete_resp = client.delete(f"/api/experience-groups/{group['id']}", headers=auth)
    assert delete_resp.status_code == 204

    # 再次查询经历分组应返回 404
    assert client.get(f"/api/experience-groups/{group['id']}", headers=auth).status_code == 404
    # 再次查询经历分组关联的工作项列表应返回 404
    assert client.get(f"/api/experience-groups/{group['id']}/work-contents", headers=auth).status_code == 404
    # 对已被级联删除的单条工作内容操作应返回 404
    assert client.patch(f"/api/work-contents/{content['id']}", headers=auth, json={"title": "新标题"}).status_code == 404


def test_delete_work_content_removes_item():
    account = register("experience-delete-wc@example.com")
    auth = headers(account["token"])
    group = client.post(
        "/api/experience-groups",
        headers=auth,
        json={"name": "工作项删除测试", "type": "project"},
    ).json()
    first = client.post(
        f"/api/experience-groups/{group['id']}/work-contents",
        headers=auth,
        json={"title": "待保留第一项"},
    ).json()
    second = client.post(
        f"/api/experience-groups/{group['id']}/work-contents",
        headers=auth,
        json={"title": "待删除第二项"},
    ).json()

    # 删除第二项
    resp = client.delete(f"/api/work-contents/{second['id']}", headers=auth)
    assert resp.status_code == 204

    # 再次查询工作内容列表，只剩第一项
    contents = client.get(f"/api/experience-groups/{group['id']}/work-contents", headers=auth).json()
    assert len(contents) == 1
    assert contents[0]["id"] == first["id"]

    # 再次请求已删除项应返回 404
    assert client.patch(f"/api/work-contents/{second['id']}", headers=auth, json={"title": "无法修改"}).status_code == 404



