"""Governance: password auth, rate limiting, file retention."""
from app.auth import _rate_buckets
from tests.conftest import cookie


def test_wrong_password_rejected(client, seeded):
    r = client.post("/auth/login", json={"email": "admin@nexus.test", "password": "wrong"})
    assert r.status_code == 401
    events = client.get("/audit-events", cookies=cookie(seeded, "administrator")).json()
    assert any(e["action"] == "auth.login_failed" for e in events)


def test_rate_limit_blocks_flood(client, seeded):
    # default limiter allows 8 logins/min per IP; drain it
    codes = [client.post("/auth/login", json={"email": "admin@nexus.test", "password": "demo1234"}).status_code
             for _ in range(10)]
    assert 429 in codes


def test_original_file_retained_and_downloadable(client, seeded):
    content = b"SUPPLIER QUOTE. Supplier: FileCorp. Total: 77 EUR."
    r = client.post("/documents", files={"file": ("retained.txt", content, "text/plain")},
                    cookies=cookie(seeded, "employee"))
    assert r.status_code == 200
    doc_id = r.json()["id"]
    dl = client.get(f"/documents/{doc_id}/file", cookies=cookie(seeded, "employee"))
    assert dl.status_code == 200
    assert dl.content == content
