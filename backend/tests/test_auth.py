from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def register(email: str):
    response = client.post("/api/auth/register", json={"email": email, "password": "correct horse battery staple"})
    assert response.status_code == 201
    return response.json()


def test_register_login_logout_lifecycle():
    account = register("alice@example.com")
    assert account["user"]["email"] == "alice@example.com"
    assert account["token"]
    assert "workspaces" not in account

    headers = {"Authorization": f"Bearer {account['token']}"}
    me_resp = client.get("/api/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "alice@example.com"

    login = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "correct horse battery staple"})
    assert login.status_code == 200
    assert "workspaces" not in login.json()

    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_duplicate_registration_and_bad_login_are_rejected():
    register("duplicate@example.com")
    assert client.post("/api/auth/register", json={"email": "duplicate@example.com", "password": "another password"}).status_code == 409
    assert client.post("/api/auth/login", json={"email": "duplicate@example.com", "password": "wrong password"}).status_code == 401


def test_unauthorized_access_is_rejected():
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/experience-groups").status_code == 401
