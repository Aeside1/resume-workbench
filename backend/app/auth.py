import base64
import hashlib
import hmac
import json
import os
import secrets
import time


_secret_text = os.getenv("SECRET_KEY")
if os.getenv("ENVIRONMENT", "development") != "development" and not _secret_text:
    raise RuntimeError("生产环境必须设置 SECRET_KEY")
SECRET = (_secret_text or "local-development-secret-change-me").encode()
_revoked_tokens: set[str] = set()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return f"{base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        salt_text, digest_text = encoded.split("$", 1)
        salt = base64.urlsafe_b64decode(salt_text.encode())
        expected = base64.urlsafe_b64decode(digest_text.encode())
    except (ValueError, TypeError):
        return False
    actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return hmac.compare_digest(actual, expected)


def create_token(user_id: int) -> str:
    payload = json.dumps({"sub": user_id, "exp": int(time.time()) + 60 * 60 * 24, "jti": secrets.token_hex(12)}, separators=(",", ":")).encode()
    body = base64.urlsafe_b64encode(payload).rstrip(b"=")
    signature = hmac.new(SECRET, body, hashlib.sha256).digest()
    return f"{body.decode()}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode()}"


def decode_token(token: str) -> int | None:
    if token in _revoked_tokens:
        return None
    try:
        body_text, signature_text = token.split(".", 1)
        body = body_text.encode()
        expected = base64.urlsafe_b64decode(signature_text + "===")
        actual = hmac.new(SECRET, body, hashlib.sha256).digest()
        if not hmac.compare_digest(actual, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(body_text + "===").decode())
        if payload["exp"] < int(time.time()):
            return None
        return int(payload["sub"])
    except (ValueError, KeyError, TypeError, json.JSONDecodeError, UnicodeDecodeError):
        return None


def revoke_token(token: str) -> None:
    _revoked_tokens.add(token)
