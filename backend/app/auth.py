"""Session-cookie auth with role-based access control. No JWT lib: one signed-ish opaque token in DB."""
import secrets

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session as DBSession

from .db import get_db
from .models import Session, User

COOKIE_NAME = "nexus_session"


def login(db: DBSession, email: str) -> User | None:
    user = db.query(User).filter(User.email == email).one_or_none()
    if not user:
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
