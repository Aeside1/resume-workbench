from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def register(email: str):
    response = client.post("/api/auth/register", json={"email": email, "password": "correct horse battery staple"})
    assert response.status_code == 201
    return response.json()


def test_register_login_logout_and_workspace_lifecycle():
    account = register("alice@example.com")
    assert account["user"]["email"] == "alice@example.com"
    assert account["token"]

    headers = {"Authorization": f"Bearer {account['token']}"}
    workspaces = client.get("/api/workspaces", headers=headers)
    assert workspaces.status_code == 200
    assert len(workspaces.json()) == 1

    created = client.post("/api/workspaces", headers=headers, json={"name": "求职准备"})
    assert created.status_code == 201
    workspace_id = created.json()["id"]
    assert client.get(f"/api/workspaces/{workspace_id}", headers=headers).status_code == 200

    login = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "correct horse battery staple"})
    assert login.status_code == 200
    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/workspaces", headers=headers).status_code == 401


def test_authentication_and_workspace_ownership_are_enforced():
    alice = register("alice-isolated@example.com")
    bob = register("bob-isolated@example.com")
    alice_headers = {"Authorization": f"Bearer {alice['token']}"}
    bob_headers = {"Authorization": f"Bearer {bob['token']}"}
    workspace_id = client.post("/api/workspaces", headers=alice_headers, json={"name": "Alice 私有区"}).json()["id"]

    assert client.get("/api/workspaces").status_code == 401
    assert client.get(f"/api/workspaces/{workspace_id}", headers=bob_headers).status_code == 404
    assert client.patch(f"/api/workspaces/{workspace_id}", headers=bob_headers, json={"name": "越权"}).status_code == 404
    assert all(item["id"] != workspace_id for item in client.get("/api/workspaces", headers=bob_headers).json())


def test_duplicate_registration_and_bad_login_are_rejected():
    register("duplicate@example.com")
    assert client.post("/api/auth/register", json={"email": "duplicate@example.com", "password": "another password"}).status_code == 409
    assert client.post("/api/auth/login", json={"email": "duplicate@example.com", "password": "wrong password"}).status_code == 401


def test_workspace_name_must_contain_non_whitespace_text():
    account = register("workspace-name@example.com")
    headers = {"Authorization": f"Bearer {account['token']}"}
    assert client.post("/api/workspaces", headers=headers, json={"name": "   "}).status_code == 422
