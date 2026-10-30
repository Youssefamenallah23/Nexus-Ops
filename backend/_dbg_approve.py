import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from tests.conftest import cookie, client as client_fixture, seeded as seeded_fixture

# pytest fixtures used manually
client = next(iter([client_fixture.__wrapped__()] if hasattr(client_fixture, "__wrapped__") else [None])) or None

from fastapi.testclient import TestClient
import tests.conftest as cf

client = TestClient(cf.app)
seeded = cf.seeded.__wrapped__(client) if hasattr(cf.seeded, "__wrapped__") else None

# emulate the seeded fixture manually
from tests.conftest import TestSession
from app.models import User

db = TestSession()
roles = {"admin@nexus.test": ("administrator", "Administration"),
         "manager@nexus.test": ("manager", "Project Management"),
         "employee@nexus.test": ("employee", "Field Operations")}
for email, (role, dept) in roles.items():
    if not db.query(User).filter(User.email == email).one_or_none():
        db.add(User(email=email, name=email.split("@")[0].title(), role=role, department=dept))
db.commit()

sessions = {}
for email in roles:
    r = client.post("/auth/login", json={"email": email})
    sessions[roles[email][0]] = r.cookies.get("nexus_session")
print("sessions:", {k: (v or "MISSING")[:8] for k, v in sessions.items()})

me = client.get("/auth/me", cookies=cookie(sessions, "manager"))
print("manager /auth/me:", me.status_code, me.json())
from app.models import Session as UserSession

db2 = TestSession()
for role, tok in sessions.items():
    s = db2.query(UserSession).filter(UserSession.token == tok).one_or_none()
    if s:
        u = db2.get(User, s.user_id)
        print(f"{role} token -> user {u.email} ({u.role})")
    else:
        print(f"{role} token -> NOT FOUND")



