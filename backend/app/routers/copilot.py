from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session as DBSession

from ..auth import get_current_user, require_role
from ..db import get_db
from ..models import User, audit
from ..services.rag import answer_question, ingest_document

router = APIRouter(prefix="/copilot", tags=["copilot"])


class AskIn(BaseModel):
    question: str = Field(max_length=2000)


@router.post("/ask")
def ask(body: AskIn, db: DBSession = Depends(get_db), user: User = Depends(get_current_user)):
    if not body.question.strip():
        return {"answer": "Ask a question about the approved documents.", "citations": [], "supported": False, "provider": "none", "fallback": False}
    try:
        result = answer_question(db, user, body.question.strip())
    except Exception:
        db.rollback()
        raise HTTPException(503, "Approved sources could not be searched. Check the embedding provider and rebuild the copilot index if its configuration changed.")
    audit(db, actor=user, action="copilot.asked", entity_type="copilot",
          detail={"question": body.question[:200], "supported": result["supported"],
                  "provider": result["provider"], "citations": len(result["citations"])})
    db.commit()
    return result


@router.post("/reindex")
def reindex(db: DBSession = Depends(get_db), user: User = Depends(require_role("administrator"))):
    from ..models import Document

    approved = db.query(Document).filter(Document.status == "approved").all()
    total = sum(ingest_document(db, doc) for doc in approved)
    audit(db, actor=user, action="copilot.reindexed", entity_type="copilot",
          detail={"documents": len(approved), "chunks": total})
    db.commit()
    return {"ok": True, "documents": len(approved), "chunks": total}
