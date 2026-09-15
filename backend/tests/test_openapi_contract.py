"""接口契约测试：把方案与简历亮点相关路由固化为快照，防止前后端路径/字段静默漂移。

快照由本测试生成（缺失时写入并失败，提示核对后提交）；前端 `frontend/src/api.contract.test.ts`
读取同一份文件断言 `api.ts` 里的调用都存在对应后端路由。
"""

import json
from pathlib import Path

from app.main import app


CONTRACT = Path(__file__).resolve().parents[2] / "frontend" / "src" / "contracts" / "openapi-plan-paths.json"
# 快照放在前端源码树内：web 镜像的构建上下文只有 `frontend/`，而 `npm run build` 会
# typecheck 测试文件，放在仓库根会导致容器内构建失败。
TRACKED_PREFIXES = (
    "/api/resume-plans",
    "/api/resume-descriptions",
    "/api/work-contents/{content_id}/resume-descriptions",
)
HTTP_METHODS = ("get", "post", "patch", "delete", "put")


def collect_contract() -> dict:
    schema = app.openapi()
    entries: dict[str, dict] = {}
    for path, operations in schema["paths"].items():
        if not any(path.startswith(prefix) for prefix in TRACKED_PREFIXES):
            continue
        for method, operation in operations.items():
            if method not in HTTP_METHODS:
                continue
            entry: dict = {}
            body = operation.get("requestBody")
            if body is not None:
                ref = body["content"]["application/json"]["schema"].get("$ref")
                if ref:
                    name = ref.rsplit("/", 1)[-1]
                    entry["request_fields"] = sorted(schema["components"]["schemas"][name].get("properties", {}))
            entries[f"{method.upper()} {path}"] = entry
    return dict(sorted(entries.items()))


def test_plan_routes_match_committed_contract():
    current = collect_contract()
    if not CONTRACT.exists():
        CONTRACT.parent.mkdir(parents=True, exist_ok=True)
        CONTRACT.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        raise AssertionError(f"契约快照缺失，已生成 {CONTRACT}；请核对内容后提交")

    expected = json.loads(CONTRACT.read_text(encoding="utf-8"))
    added = sorted(set(current) - set(expected))
    removed = sorted(set(expected) - set(current))
    assert not removed, f"契约快照里的路由已从后端消失：{removed}；若是有意删除，请同步更新快照与前端 api.ts"
    assert not added, f"后端新增了未登记的方案/亮点路由：{added}；请更新快照并确认前端是否需要接入"
    for key, entry in current.items():
        assert expected[key] == entry, f"{key} 的请求体字段与快照不一致：{expected[key]} != {entry}"
