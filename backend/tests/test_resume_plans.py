"""简历方案（ResumePlan）行为测试：经历块、条目、两级排序、读时装配与删除守卫。

术语口径见 CONTEXT.md：简历方案 / 简历大纲 / 板块 / 经历块 / 简历条目 / 简历亮点。
"""

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.database import engine
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
    """一段实习经历 + 两条具体工作内容 + 两条亮点。"""
    group = client.post(
        "/api/experience-groups",
        headers=auth,
        json={"name": "支付平台实习", "type": "internship", "organization": "示例科技", "start_date": "2024-03-01", "end_date": "2024-08-31"},
    ).json()
    content = client.post(
        f"/api/experience-groups/{group['id']}/work-contents",
        headers=auth,
        json={"title": "收银台跨端组件重构"},
    ).json()
    other = client.post(
        f"/api/experience-groups/{group['id']}/work-contents",
        headers=auth,
        json={"title": "大促容灾演练"},
    ).json()
    highlight = client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions",
        headers=auth,
        json={"label": "技术深度版", "content": "主导收银台跨端组件重构，首屏渲染耗时降低 75%。"},
    ).json()
    alt = client.post(
        f"/api/work-contents/{content['id']}/resume-descriptions",
        headers=auth,
        json={"label": "业务成效版", "content": "保障大促零故障，支撑日均千万级交易。"},
    ).json()
    other_highlight = client.post(
        f"/api/work-contents/{other['id']}/resume-descriptions",
        headers=auth,
        json={"label": "容灾版", "content": "主导大促容灾演练，核心链路零故障。"},
    ).json()
    return {
        "group": group,
        "content": content,
        "other": other,
        "highlight": highlight,
        "alt": alt,
        "other_highlight": other_highlight,
    }


def create_plan(auth: dict, name: str = "2026 后端岗", purpose: str = "支付中台方向") -> dict:
    response = client.post("/api/resume-plans", headers=auth, json={"name": name, "purpose": purpose})
    assert response.status_code == 201
    return response.json()


def add_block(auth: dict, plan_id: int, group_id: int) -> dict:
    response = client.post(f"/api/resume-plans/{plan_id}/experience-groups", headers=auth, json={"experience_group_id": group_id})
    assert response.status_code == 201, response.text
    return response.json()


def add_item(auth: dict, plan_id: int, block_id: int, content_id: int, highlight_id: int | None = None) -> dict:
    payload: dict = {"block_id": block_id, "work_content_id": content_id}
    if highlight_id is not None:
        payload["resume_description_id"] = highlight_id
    response = client.post(f"/api/resume-plans/{plan_id}/items", headers=auth, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_plan_lifecycle_and_two_stage_archive():
    account = register("plan-lifecycle@example.com")
    auth = headers(account["token"])
    assets = make_assets(auth)

    plan = create_plan(auth)
    assert plan["name"] == "2026 后端岗"
    assert plan["purpose"] == "支付中台方向"
    assert plan["archived"] is False

    renamed = client.patch(f"/api/resume-plans/{plan['id']}", headers=auth, json={"name": "2026 后端岗（支付）", "purpose": "支付方向"})
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "2026 后端岗（支付）"

    assert client.post(f"/api/resume-plans/{plan['id']}/archive", headers=auth).status_code == 200
    assert client.get("/api/resume-plans", headers=auth).json() == []
    assert [item["id"] for item in client.get("/api/resume-plans?include_archived=true", headers=auth).json()] == [plan["id"]]
    assert client.post(f"/api/resume-plans/{plan['id']}/restore", headers=auth).status_code == 200
    assert [item["id"] for item in client.get("/api/resume-plans", headers=auth).json()] == [plan["id"]]

    block = add_block(auth, plan["id"], assets["group"]["id"])
    add_item(auth, plan["id"], block["id"], assets["content"]["id"], assets["highlight"]["id"])

    assert client.delete(f"/api/resume-plans/{plan['id']}", headers=auth).status_code == 204
    assert client.get(f"/api/resume-plans/{plan['id']}", headers=auth).status_code == 404
    # 级联删掉经历块与条目，但资产仍在
    with engine.connect() as connection:
        assert connection.scalar(text("select count(*) from plan_experience_groups where plan_id = :id"), {"id": plan["id"]}) == 0
        assert connection.scalar(text("select count(*) from plan_items")) == 0
    assert client.get(f"/api/work-contents/{assets['content']['id']}/resume-descriptions", headers=auth).status_code == 200


def test_plan_validates_name_and_purpose():
    account = register("plan-validation@example.com")
    auth = headers(account["token"])

    assert client.post("/api/resume-plans", headers=auth, json={"name": "   "}).status_code == 422
    plan = create_plan(auth)
    assert client.patch(f"/api/resume-plans/{plan['id']}", headers=auth, json={"name": "  "}).status_code == 422


def test_block_and_item_ordering_are_two_independent_levels():
    account = register("plan-ordering@example.com")
    auth = headers(account["token"])
    assets = make_assets(auth)
    project_group = client.post(
        "/api/experience-groups",
        headers=auth,
        json={"name": "消息中台项目", "type": "project"},
    ).json()
    project_assets = create_content_with_highlight(auth, project_group["id"], "幂等消费改造", "幂等版", "引入幂等键与去重表。")

    plan = create_plan(auth)
    internship_block = add_block(auth, plan["id"], assets["group"]["id"])
    project_block = add_block(auth, plan["id"], project_group["id"])

    # 同一分组不能加两次
    duplicate = client.post(f"/api/resume-plans/{plan['id']}/experience-groups", headers=auth, json={"experience_group_id": assets["group"]["id"]})
    assert duplicate.status_code == 409

    # 块级排序：全量序列
    reordered = client.post(
        f"/api/resume-plans/{plan['id']}/experience-groups/reorder",
        headers=auth,
        json={"block_ids": [project_block["id"], internship_block["id"]]},
    )
    assert reordered.status_code == 200
    assert [block["id"] for block in reordered.json()] == [project_block["id"], internship_block["id"]]
    incomplete = client.post(
        f"/api/resume-plans/{plan['id']}/experience-groups/reorder",
        headers=auth,
        json={"block_ids": [project_block["id"]]},
    )
    assert incomplete.status_code == 422

    # 块内条目排序：全量序列，且只覆盖本块
    first = add_item(auth, plan["id"], internship_block["id"], assets["content"]["id"], assets["highlight"]["id"])
    second = add_item(auth, plan["id"], internship_block["id"], assets["other"]["id"])
    assert [first["position"], second["position"]] == [0, 1]

    item_reorder = client.post(
        f"/api/resume-plans/{plan['id']}/experience-groups/{internship_block['id']}/items/reorder",
        headers=auth,
        json={"item_ids": [second["id"], first["id"]]},
    )
    assert item_reorder.status_code == 200
    assert [item["id"] for item in item_reorder.json()] == [second["id"], first["id"]]

    bad_reorder = client.post(
        f"/api/resume-plans/{plan['id']}/experience-groups/{internship_block['id']}/items/reorder",
        headers=auth,
        json={"item_ids": [first["id"]]},
    )
    assert bad_reorder.status_code == 422

    # 块级顺序不受块内排序影响
    blocks = client.get(f"/api/resume-plans/{plan['id']}", headers=auth).json()["experience_groups"]
    assert [block["id"] for block in blocks] == [project_block["id"], internship_block["id"]]


def test_item_requires_highlight_of_the_same_work_content():
    account = register("plan-item-validation@example.com")
    auth = headers(account["token"])
    assets = make_assets(auth)
    other_highlight = client.post(
        f"/api/work-contents/{assets['other']['id']}/resume-descriptions",
        headers=auth,
        json={"label": "容灾版（第二条）", "content": "主导大促容灾演练。"},
    ).json()

    plan = create_plan(auth)
    block = add_block(auth, plan["id"], assets["group"]["id"])

    mismatched = client.post(
        f"/api/resume-plans/{plan['id']}/items",
        headers=auth,
        json={"block_id": block["id"], "work_content_id": assets["content"]["id"], "resume_description_id": other_highlight["id"]},
    )
    assert mismatched.status_code == 422

    # 未指定亮点时自动取该工作内容下第一条未归档亮点
    auto = add_item(auth, plan["id"], block["id"], assets["content"]["id"])
    assert auto["resume_description_id"] == assets["highlight"]["id"]
    assert auto["work_content_id"] == assets["content"]["id"]

    # 没有任何亮点的工作内容不能加入方案
    empty_content = client.post(
        f"/api/experience-groups/{assets['group']['id']}/work-contents",
        headers=auth,
        json={"title": "还没有亮点的内容"},
    ).json()
    no_highlight = client.post(
        f"/api/resume-plans/{plan['id']}/items",
        headers=auth,
        json={"block_id": block["id"], "work_content_id": empty_content["id"]},
    )
    assert no_highlight.status_code == 422

    # 换亮点只改引用
    switched = client.patch(
        f"/api/resume-plans/{plan['id']}/items/{auto['id']}",
        headers=auth,
        json={"resume_description_id": assets["alt"]["id"]},
    )
    assert switched.status_code == 200
    assert switched.json()["resume_description_id"] == assets["alt"]["id"]
    assert switched.json()["work_content_id"] == assets["content"]["id"]
    # 资产本身未被改写
    unchanged = client.get(f"/api/resume-descriptions/{assets['highlight']['id']}", headers=auth).json()
    assert unchanged["label"] == "技术深度版"

    # 移除条目只解除引用
    assert client.delete(f"/api/resume-plans/{plan['id']}/items/{auto['id']}", headers=auth).status_code == 204
    assert client.get(f"/api/work-contents/{assets['content']['id']}/resume-descriptions", headers=auth).status_code == 200


def create_content_with_highlight(auth: dict, group_id: int, title: str, label: str = "默认版", content: str = "示例正文。") -> dict:
    work_content = client.post(
        f"/api/experience-groups/{group_id}/work-contents",
        headers=auth,
        json={"title": title},
    ).json()
    highlight = client.post(
        f"/api/work-contents/{work_content['id']}/resume-descriptions",
        headers=auth,
        json={"label": label, "content": content},
    ).json()
    return {"content": work_content, "highlight": highlight}


def test_removing_block_removes_its_items_only():
    account = register("plan-block-removal@example.com")
    auth = headers(account["token"])
    assets = make_assets(auth)
    project_group = client.post("/api/experience-groups", headers=auth, json={"name": "项目甲", "type": "project"}).json()

    plan = create_plan(auth)
    internship_block = add_block(auth, plan["id"], assets["group"]["id"])
    project_block = add_block(auth, plan["id"], project_group["id"])
    add_item(auth, plan["id"], internship_block["id"], assets["content"]["id"], assets["highlight"]["id"])
    project_assets = create_content_with_highlight(auth, project_group["id"], "项目甲的工作内容")
    project_item = add_item(auth, plan["id"], project_block["id"], project_assets["content"]["id"], project_assets["highlight"]["id"])

    assert client.delete(f"/api/resume-plans/{plan['id']}/experience-groups/{internship_block['id']}", headers=auth).status_code == 204
    blocks = client.get(f"/api/resume-plans/{plan['id']}", headers=auth).json()["experience_groups"]
    assert [block["id"] for block in blocks] == [project_block["id"]]
    assert [item["id"] for item in blocks[0]["items"]] == [project_item["id"]]


def test_candidates_exclude_archived_and_mark_added_assets():
    account = register("plan-candidates@example.com")
    auth = headers(account["token"])
    assets = make_assets(auth)
    archived_content = client.post(
        f"/api/experience-groups/{assets['group']['id']}/work-contents",
        headers=auth,
        json={"title": "已归档内容"},
    ).json()
    client.post(f"/api/work-contents/{archived_content['id']}/resume-descriptions", headers=auth, json={"label": "归档版", "content": "x"})
    client.post(f"/api/work-contents/{archived_content['id']}/archive", headers=auth)

    plan = create_plan(auth)
    candidates = client.get(f"/api/resume-plans/{plan['id']}/candidates", headers=auth).json()
    group_entry = next(item for item in candidates["experience_groups"] if item["id"] == assets["group"]["id"])
    assert group_entry["already_added"] is False
    assert "已归档内容" not in [content["title"] for content in group_entry["work_contents"]]
    content_entry = next(item for item in group_entry["work_contents"] if item["id"] == assets["content"]["id"])
    assert [highlight["label"] for highlight in content_entry["highlights"]] == ["技术深度版", "业务成效版"]
    assert content_entry["already_added"] is False

    block = add_block(auth, plan["id"], assets["group"]["id"])
    add_item(auth, plan["id"], block["id"], assets["content"]["id"], assets["highlight"]["id"])

    after = client.get(f"/api/resume-plans/{plan['id']}/candidates", headers=auth).json()
    after_group = next(item for item in after["experience_groups"] if item["id"] == assets["group"]["id"])
    assert after_group["already_added"] is True
    after_content = next(item for item in after_group["work_contents"] if item["id"] == assets["content"]["id"])
    assert after_content["already_added"] is True
    assert [h["already_added"] for h in after_content["highlights"]] == [True, False]


def test_assembly_groups_by_section_and_honours_work_content_title_switch():
    account = register("plan-assembly@example.com")
    auth = headers(account["token"])
    assets = make_assets(auth)
    project_group = client.post("/api/experience-groups", headers=auth, json={"name": "消息中台", "type": "project", "organization": "示例研究院"}).json()
    project_content = client.post(
        f"/api/experience-groups/{project_group['id']}/work-contents",
        headers=auth,
        json={"title": "幂等消费改造"},
    ).json()
    project_highlight = client.post(
        f"/api/work-contents/{project_content['id']}/resume-descriptions",
        headers=auth,
        json={"label": "幂等版", "content": "引入幂等键与去重表，消息重复率降至 0。"},
    ).json()

    plan = create_plan(auth)
    internship_block = add_block(auth, plan["id"], assets["group"]["id"])
    project_block = add_block(auth, plan["id"], project_group["id"])
    add_item(auth, plan["id"], internship_block["id"], assets["content"]["id"], assets["highlight"]["id"])
    add_item(auth, plan["id"], project_block["id"], project_content["id"], project_highlight["id"])

    document = client.get(f"/api/resume-plans/{plan['id']}/document", headers=auth).json()
    markdown = document["markdown"]
    assert "# 2026 后端岗" in markdown
    assert "支付中台方向" in markdown
    assert "## 实习经历" in markdown and "## 项目经历" in markdown
    assert "### 支付平台实习" in markdown
    assert "示例科技" in markdown and "2024.03" in markdown
    assert "**收银台跨端组件重构**" in markdown
    assert "主导收银台跨端组件重构，首屏渲染耗时降低 75%。" in markdown
    assert "### 消息中台" in markdown
    assert "引入幂等键与去重表，消息重复率降至 0。" in markdown
    # 实习板块排在项目板块之前，且板块内按块顺序
    assert markdown.index("## 实习经历") < markdown.index("## 项目经历")
    assert document["outline"]["sections"][0]["section"] == "internship"
    assert document["outline"]["sections"][1]["section"] == "project"

    # 关掉工作内容标题后不再打印该行
    switched = client.patch(
        f"/api/resume-plans/{plan['id']}/experience-groups/{internship_block['id']}",
        headers=auth,
        json={"show_work_content_titles": False},
    )
    assert switched.status_code == 200
    assert switched.json()["show_work_content_titles"] is False
    after = client.get(f"/api/resume-plans/{plan['id']}/document", headers=auth).json()["markdown"]
    assert "**收银台跨端组件重构**" not in after
    assert "**幂等消费改造**" in after
    assert "主导收银台跨端组件重构，首屏渲染耗时降低 75%。" in after

    # 同一数据两次装配结果一致
    assert client.get(f"/api/resume-plans/{plan['id']}/document", headers=auth).json()["markdown"] == after


def test_assembly_marks_dangling_references_instead_of_dropping_them():
    account = register("plan-dangling@example.com")
    auth = headers(account["token"])
    assets = make_assets(auth)

    plan = create_plan(auth)
    block = add_block(auth, plan["id"], assets["group"]["id"])
    item = add_item(auth, plan["id"], block["id"], assets["content"]["id"], assets["highlight"]["id"])

    # API 路径被 409 挡住，这里直接改库模拟「引用已失效」的兜底路径
    with engine.begin() as connection:
        connection.execute(text("update plan_items set resume_description_id = null where id = :id"), {"id": item["id"]})
    missing_highlight = client.get(f"/api/resume-plans/{plan['id']}/document", headers=auth).json()
    assert "待选简历亮点" in missing_highlight["markdown"]
    assert missing_highlight["outline"]["sections"][0]["blocks"][0]["items"][0]["status"] == "missing_highlight"

    with engine.begin() as connection:
        connection.execute(text("update plan_items set work_content_id = null where id = :id"), {"id": item["id"]})
    missing_source = client.get(f"/api/resume-plans/{plan['id']}/document", headers=auth).json()
    assert "引用已失效" in missing_source["markdown"]
    assert missing_source["outline"]["sections"][0]["blocks"][0]["items"][0]["status"] == "missing_source"


def test_deleting_referenced_assets_is_rejected_with_plan_names():
    account = register("plan-guards@example.com")
    auth = headers(account["token"])
    assets = make_assets(auth)

    plan = create_plan(auth, name="2026 后端岗")
    block = add_block(auth, plan["id"], assets["group"]["id"])
    add_item(auth, plan["id"], block["id"], assets["content"]["id"], assets["highlight"]["id"])

    for path in (
        f"/api/resume-descriptions/{assets['highlight']['id']}",
        f"/api/work-contents/{assets['content']['id']}",
        f"/api/experience-groups/{assets['group']['id']}",
    ):
        blocked = client.delete(path, headers=auth)
        assert blocked.status_code == 409, path
        assert "2026 后端岗" in blocked.json()["detail"], path

    # 归档不阻断引用：仍能归档，且已有条目照常装配
    assert client.post(f"/api/resume-descriptions/{assets['highlight']['id']}/archive", headers=auth).status_code == 200
    assert client.post(f"/api/work-contents/{assets['content']['id']}/archive", headers=auth).status_code == 200
    assert client.post(f"/api/experience-groups/{assets['group']['id']}/archive", headers=auth).status_code == 200
    markdown = client.get(f"/api/resume-plans/{plan['id']}/document", headers=auth).json()["markdown"]
    assert "主导收银台跨端组件重构，首屏渲染耗时降低 75%。" in markdown

    # 移除引用后即可删除
    items = client.get(f"/api/resume-plans/{plan['id']}", headers=auth).json()["experience_groups"][0]["items"]
    for item in items:
        assert client.delete(f"/api/resume-plans/{plan['id']}/items/{item['id']}", headers=auth).status_code == 204
    assert client.delete(f"/api/resume-descriptions/{assets['highlight']['id']}", headers=auth).status_code == 204
    assert client.delete(f"/api/work-contents/{assets['content']['id']}", headers=auth).status_code == 204


def test_plan_resources_are_isolated_by_user():
    alice = register("plan-alice@example.com")
    bob = register("plan-bob@example.com")
    alice_auth, bob_auth = headers(alice["token"]), headers(bob["token"])
    assets = make_assets(alice_auth)
    plan = create_plan(alice_auth)
    block = add_block(alice_auth, plan["id"], assets["group"]["id"])
    item = add_item(alice_auth, plan["id"], block["id"], assets["content"]["id"], assets["highlight"]["id"])

    assert client.get("/api/resume-plans", headers=bob_auth).json() == []
    assert client.get(f"/api/resume-plans/{plan['id']}", headers=bob_auth).status_code == 404
    assert client.patch(f"/api/resume-plans/{plan['id']}", headers=bob_auth, json={"name": "越权"}).status_code == 404
    assert client.post(f"/api/resume-plans/{plan['id']}/archive", headers=bob_auth).status_code == 404
    assert client.post(f"/api/resume-plans/{plan['id']}/restore", headers=bob_auth).status_code == 404
    assert client.delete(f"/api/resume-plans/{plan['id']}", headers=bob_auth).status_code == 404
    assert client.post(
        f"/api/resume-plans/{plan['id']}/experience-groups",
        headers=bob_auth,
        json={"experience_group_id": assets["group"]["id"]},
    ).status_code == 404
    assert client.post(
        f"/api/resume-plans/{plan['id']}/items",
        headers=bob_auth,
        json={"block_id": block["id"], "work_content_id": assets["content"]["id"]},
    ).status_code == 404
    assert client.patch(f"/api/resume-plans/{plan['id']}/items/{item['id']}", headers=bob_auth, json={"resume_description_id": assets["alt"]["id"]}).status_code == 404
    assert client.delete(f"/api/resume-plans/{plan['id']}/items/{item['id']}", headers=bob_auth).status_code == 404
    assert client.get(f"/api/resume-plans/{plan['id']}/document", headers=bob_auth).status_code == 404
    assert client.get(f"/api/resume-plans/{plan['id']}/candidates", headers=bob_auth).status_code == 404
    # Bob 也不能把自己的资产塞进 Alice 的方案
    bob_assets = make_assets(bob_auth)
    assert client.post(
        f"/api/resume-plans/{plan['id']}/items",
        headers=bob_auth,
        json={"block_id": block["id"], "work_content_id": bob_assets["content"]["id"]},
    ).status_code == 404
    assert client.post(
        f"/api/resume-plans/{plan['id']}/experience-groups",
        headers=bob_auth,
        json={"experience_group_id": bob_assets["group"]["id"]},
    ).status_code == 404
