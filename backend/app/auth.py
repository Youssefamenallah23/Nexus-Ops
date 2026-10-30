"""Session-cookie auth with role-based access control + password hashing.

Passwords: PBKDF2-HMAC-SHA256 (stdlib, 200k iterations, per-user salt).
Rate limiting: in-process sliding window on sensitive endpoints
(ponytail: good enough for single-instance demo; use Redis for a cluster)."""
import hashlib
import hmac
import secrets
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session as DBSession

from .db import get_db
from .models import Session, User

COOKIE_NAME = "nexus_session"

_PBKDF2_ITERATIONS = 200_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), _PBKDF2_ITERATIONS).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored or "$" not in stored:
        return False
    salt, digest = stored.split("$", 1)
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), _PBKDF2_ITERATIONS).hex()
    return hmac.compare_digest(candidate, digest)


_rate_buckets: dict[str, deque] = defaultdict(deque)


def rate_limit(*, max_requests: int, window_seconds: int):
    """Sliding-window per-IP limiter as a FastAPI dependency."""

    def checker(request: Request) -> None:
        ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        bucket = _rate_buckets[f"{ip}:{id(checker)}"]
        while bucket and now - bucket[0] > window_seconds:
            bucket.popleft()
        if len(bucket) >= max_requests:
            raise HTTPException(429, f"Too many requests — try again in {window_seconds}s.")
        bucket.append(now)

    return checker


def login(db: DBSession, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email).one_or_none()
    if not user or not verify_password(password, user.password_hash):
        return None
    db.add(Session(token=secrets.token_urlsafe(32), user_id=user.id))
    db.commit()
    return user


def get_current_user(request: Request, db: DBSession = Depends(get_db)) -> User:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(401, "Not authenticated")
    session = db.query(Session).filter(Session.token == token).one_or_none()
    if not session:
        raise HTTPException(401, "Invalid session")
    return db.get(User, session.user_id)


def require_role(*roles: str):
    """Server-side authorization. Use: Depends(require_role('administrator', 'manager'))."""

    def checker(user: User = Depends(get_current_user)) -> User:
        if roles and user.role not in roles:
            raise HTTPException(403, f"Requires role: {' or '.join(roles)}")
        return user

    return checker

