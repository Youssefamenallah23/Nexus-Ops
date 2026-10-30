import os

# Force the deterministic mock provider for the whole test suite — no network, no keys.
os.environ.setdefault("GOOGLE_API_KEY", "")
os.environ.setdefault("NVIDIA_API_KEY", "")
os.environ["N8N_WEBHOOK_URL"] = ""  # workflow tests must run in mock mode
os.environ["EMBEDDING_PROVIDER"] = "test"  # no model download in CI
os.environ["DATABASE_URL"] = "sqlite://"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.db import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
Base.metadata.create_all(engine)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Rate-limit buckets are process-global; reset around every test."""
    from app.auth import _rate_buckets

    _rate_buckets.clear()
    yield
    _rate_buckets.clear()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def seeded(client):
    """Create three role users, then log in once per role."""
    from app.models import User

    db = TestSession()
    roles = {"admin@nexus.test": ("administrator", "Administration"),
             "manager@nexus.test": ("manager", "Project Management"),
             "employee@nexus.test": ("employee", "Field Operations")}
    sessions = {}
    from app.auth import hash_password

    demo_pw = hash_password("demo1234")
    for email, (role, dept) in roles.items():
        if not db.query(User).filter(User.email == email).one_or_none():
            db.add(User(email=email, name=email.split("@")[0].title(), role=role,
                        department=dept, password_hash=demo_pw))
    db.commit()
    for email in roles:
        r = client.post("/auth/login", json={"email": email, "password": "demo1234"})
        assert r.status_code == 200, r.text
        sessions[roles[email][0]] = r.cookies.get("nexus_session")
    db.close()
    # httpx2's cookie jar overrides per-request cookies — clear it so each test
    # request authenticates with the explicit cookie it passes.
    try:
        client.cookies.delete("nexus_session")
    except Exception:
        pass
    return sessions


def cookie(sessions, role):
    return {"nexus_session": sessions[role]}
