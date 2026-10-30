import secrets

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from ..auth import COOKIE_NAME, get_current_user
from ..db import get_db
from ..models import Session as UserSession
from ..models import User, audit
from ..schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: str


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, response: Response, db: DBSession = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.strip().lower()).one_or_none()
    if not user:
        raise HTTPException(401, "Unknown email. Demo accounts are seeded — see README.")
    token = UserSession(token=secrets.token_urlsafe(32), user_id=user.id)
    db.add(token)
    audit(db, actor=user, action="auth.login", entity_type="user", entity_id=user.id)
    db.commit()
    response.set_cookie(COOKIE_NAME, token.token, httponly=True, samesite="lax")
    return user


@router.post("/logout")
def logout(response: Response, db: DBSession = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(UserSession).filter(UserSession.user_id == user.id).delete()
    db.commit()
    response.delete_cookie(COOKIE_NAME)
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
