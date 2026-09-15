"""Fork 简历方案（04f）：只复制引用，不复制内容与历史。

界面上这个动作叫「复制」，Fork 是内部概念（见 CONTEXT.md 用词说明）。
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


def build_source_plan(auth: dict, name: str = "2026 后端岗") -> dict:
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
        json={"label": "技术深度版", "content": "主导收银台跨端组件重构，首屏耗时降低 75%。"},
    ).json()
    alt = client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions",
        headers=auth,
        json={"label": "业务成效版", "content": "保障大促零故障。"},
    ).json()

    plan = client.post("/api/resume-plans", headers=auth, json={"name": name, "purpose": "支付中台方向"}).json()
    block = client.post(
        f"/api/resume-plans/{plan['id']}/experience-groups",
        headers=auth,
        json={"experience_group_id": group["id"]},
    ).json()
    client.patch(
        f"/api/resume-plans/{plan['id']}/experience-groups/{block['id']}",
        headers=auth,
        json={"show_work_content_titles": False},
    )
    for index, item_highlight in enumerate([highlight, alt]):
        client.post(
            f"/api/resume-plans/{plan['id']}/items",
            headers=auth,
            json={
                "block_id": block["id"],
                "work_content_id": content["id"],
                "resume_description_id": item_highlight["id"],
            },
        )
    return {"group": group, "content": content, "highlight": highlight, "alt": alt, "plan": plan, "block": block}


def structure(plan_detail: dict) -> list[tuple]:
    return [
        (
            block["experience_group_id"],
            block["show_work_content_titles"],
            tuple((item["work_content_id"], item["resume_description_id"]) for item in block["items"]),
        )
        for block in plan_detail["experience_groups"]
    ]


def test_fork_copies_structure_and_shares_references():
    account = register("fork-structure@example.com")
    auth = headers(account["token"])
    assets = build_source_plan(auth)

    forked = client.post(f"/api/resume-plans/{assets['plan']['id']}/fork", headers=auth)
    assert forked.status_code == 201
    copy = forked.json()

    assert copy["id"] != assets["plan"]["id"]
    assert copy["name"] == "2026 后端岗 副本"
    assert copy["purpose"] == "支付中台方向"
    assert copy["archived"] is False

    source_detail = client.get(f"/api/resume-plans/{assets['plan']['id']}", headers=auth).json()
    # 结构（块级开关、两级顺序、资产引用）完全一致
    assert structure(copy) == structure(source_detail)
    assert len(copy["experience_groups"][0]["items"]) == 2

    # 引用共享：改亮点正文，父子方案的文稿同时变
    client.patch(
        f"/api/resume-descriptions/{assets['highlight']['id']}",
        headers=auth,
        json={"content": "改过的正文：首屏耗时降低 90%。"},
    )
    source_doc = client.get(f"/api/resume-plans/{assets['plan']['id']}/document", headers=auth).json()["markdown"]
    copy_doc = client.get(f"/api/resume-plans/{copy['id']}/document", headers=auth).json()["markdown"]
    assert "改过的正文" in source_doc and "改过的正文" in copy_doc

    # 改父方案的编排不影响副本
    items = source_detail["experience_groups"][0]["items"]
    client.delete(f"/api/resume-plans/{assets['plan']['id']}/items/{items[0]['id']}", headers=auth)
    after = client.get(f"/api/resume-plans/{copy['id']}", headers=auth).json()
    assert len(after["experience_groups"][0]["items"]) == 2

    # 副本自身可独立编辑
    client.patch(f"/api/resume-plans/{copy['id']}", headers=auth, json={"name": "2026 后端岗 副本（已改）"})
    assert client.get(f"/api/resume-plans/{assets['plan']['id']}", headers=auth).json()["name"] == "2026 后端岗"


def test_fork_does_not_carry_archives():
    account = register("fork-archives@example.com")
    auth = headers(account["token"])
    assets = build_source_plan(auth)

    source_archives = client.get(f"/api/resume-plans/{assets['plan']['id']}/archives", headers=auth).json()
    assert len(source_archives) >= 4  # 创建 + 加块 + 开关 + 两条条目

    forked = client.post(f"/api/resume-plans/{assets['plan']['id']}/fork", headers=auth).json()
    copy_archives = client.get(f"/api/resume-plans/{forked['id']}/archives", headers=auth).json()
    assert len(copy_archives) == 1
    # 血缘不落列，但写进第一条留档：历史面板里查得到来源
    assert copy_archives[0]["summary"] == "复制自《2026 后端岗》"
    assert copy_archives[0]["source"] == "revision"


def test_fork_is_isolated_by_user():
    alice = register("fork-alice@example.com")
    bob = register("fork-bob@example.com")
    alice_auth, bob_auth = headers(alice["token"]), headers(bob["token"])
    assets = build_source_plan(alice_auth, name="Alice 的方案")

    assert client.post(f"/api/resume-plans/{assets['plan']['id']}/fork", headers=bob_auth).status_code == 404
    assert client.get("/api/resume-plans", headers=bob_auth).json() == []
