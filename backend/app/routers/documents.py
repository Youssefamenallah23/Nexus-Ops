from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session as DBSession

from ..auth import get_current_user, require_role
from ..db import get_db
from ..models import Document, Extraction, User, audit
from ..schemas import DocumentDetail, DocumentOut
from ..services import pipeline, text_extract
from ..services.routing import create_task_for_document

router = APIRouter(prefix="/documents", tags=["documents"])


def _uuid(value: str):
    import uuid
    return uuid.UUID(value)


def doc_to_out(db: DBSession, d: Document) -> DocumentOut:
    latest = d.extractions[-1] if d.extractions else None
    return DocumentOut(
        id=d.id,
        filename=d.filename,
        mime_type=d.mime_type,
        size_bytes=d.size_bytes,
        status=d.status,
        doc_type=d.doc_type,
        classification_confidence=d.classification_confidence,
        department=d.department,
        uploaded_by=d.uploaded_by,
        uploaded_at=d.uploaded_at,
        uploader_name=d.uploader.name if d.uploader else None,
        project_name=d.project.name if d.project else None,
        missing_fields=latest.missing_fields if latest else [],
        latest_confidence=latest.confidence if latest else None,
    )


@router.post("", response_model=DocumentOut)
def upload_document(
    file: UploadFile = File(...),
    project_id: str | None = Form(None),
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    raw = file.file.read()
    err = text_extract.validate_upload(file.filename, file.content_type or "", len(raw))
    if err:
        raise HTTPException(422, err)
    try:
        text = text_extract.extract_text(raw, file.content_type)
    except Exception:
        raise HTTPException(422, "Could not read the file. It may be corrupted or password-protected.")
    if not text.strip():
        raise HTTPException(422, "No extractable text found in the document.")

    result = pipeline.process_document(text)
    cls = result["classification"]

    doc = Document(
        filename=file.filename,
        mime_type=file.content_type,
        size_bytes=len(raw),
        text_content=text,
        status="needs_review",
        doc_type=cls["doc_type"],
        classification_confidence=cls["confidence"],
        department=cls["department"],
        uploaded_by=user.id,
        project_id=project_id,
    )
    db.add(doc)
    db.flush()
    db.add(
        Extraction(
            document_id=doc.id,
            revision=1,
            data=result["data"],
            missing_fields=result["missing_fields"],
            confidence=result["confidence"],
            created_by="ai",
        )
    )
    audit(db, actor=user, action="document.uploaded", entity_type="document", entity_id=doc.id,
          detail={"filename": doc.filename, "doc_type": doc.doc_type, "provider": pipeline.get_provider().name})
    audit(db, actor_label="ai:classification-agent", action="ai.classified", entity_type="document",
          entity_id=doc.id, detail=cls)
    db.commit()
    return doc_to_out(db, doc)



@router.get("/{doc_id}", response_model=DocumentDetail)
def get_document(doc_id: str, db: DBSession = Depends(get_db), user: User = Depends(get_current_user)):
    d = db.get(Document, _uuid(doc_id))
    if not d:
        raise HTTPException(404, "Document not found")
    out = doc_to_out(db, d).model_dump()
    out.update(
        text_content=d.text_content,
        extractions=[
            dict(revision=e.revision, data=e.data, missing_fields=e.missing_fields,
                 confidence=e.confidence, created_by=e.created_by, created_at=e.created_at)
            for e in d.extractions
        ],
        reviewer_name=d.reviewer.name if d.reviewer else None,
    )
    audit(db, actor=user, action="document.viewed", entity_type="document", entity_id=d.id)
    db.commit()
    return out


class FieldEdit(BaseModel):
    data: dict


@router.post("/{doc_id}/extraction", response_model=DocumentDetail)
def edit_extraction(doc_id: str, body: FieldEdit, db: DBSession = Depends(get_db),
                    user: User = Depends(get_current_user)):
    """Human corrects AI fields -> new revision. Original AI revision is kept."""
    d = db.get(Document, _uuid(doc_id))
    if not d:
        raise HTTPException(404, "Document not found")
    if d.status != "needs_review":
        raise HTTPException(409, f"Cannot edit a document in status '{d.status}'.")
    # Validate through the same schema the AI output must pass.
    try:
        fields = pipeline.ExtractedFields(**{**body.data, "confidence": 1.0})
    except ValidationError as e:
        raise HTTPException(422, str(e))
    data = fields.public()
    missing = [k for k in pipeline.REQUIRED_FIELDS.get(d.doc_type, []) if data.get(k) in (None, "")]
    db.add(Extraction(document_id=d.id, revision=len(d.extractions) + 1, data=data,
                      missing_fields=missing, confidence=1.0, created_by=str(user.id)))
    audit(db, actor=user, action="extraction.edited", entity_type="document", entity_id=d.id,
          detail={"revision": len(d.extractions) + 1})
    db.commit()
    db.expire(d)  # reload the extractions collection so the new revision is visible
    return get_document(doc_id, db, user)


@router.post("/{doc_id}/approve")
def approve_document(doc_id: str, db: DBSession = Depends(get_db),
                     user: User = Depends(require_role("administrator", "manager"))):
    d = db.get(Document, _uuid(doc_id))
    if not d:
        raise HTTPException(404, "Document not found")
    if d.status != "needs_review":
        raise HTTPException(409, f"Only documents in review can be approved (current: {d.status}).")
    d.status = "approved"
    d.reviewed_by = user.id
    d.reviewed_at = datetime.now(timezone.utc)
    task = create_task_for_document(db, d, user)
    audit(db, actor=user, action="extraction.approved", entity_type="document", entity_id=d.id)
    db.commit()
    return {"ok": True, "task_id": task.id, "task_department": task.department}


@router.post("/{doc_id}/reject")
def reject_document(doc_id: str, db: DBSession = Depends(get_db),
                    user: User = Depends(require_role("administrator", "manager"))):
    d = db.get(Document, _uuid(doc_id))
    if not d:
        raise HTTPException(404, "Document not found")
    if d.status != "needs_review":
        raise HTTPException(409, f"Only documents in review can be rejected (current: {d.status}).")
    d.status = "rejected"
    d.reviewed_by = user.id
    d.reviewed_at = datetime.now(timezone.utc)
    audit(db, actor=user, action="document.rejected", entity_type="document", entity_id=d.id)
    db.commit()
    return {"ok": True}

@router.get("", response_model=list[DocumentOut])
def list_documents(status: str | None = None, doc_type: str | None = None, db: DBSession = Depends(get_db),
                   user: User = Depends(get_current_user)):
    q = db.query(Document).order_by(Document.uploaded_at.desc())
    if status:
        q = q.filter(Document.status == status)
    if doc_type:
        q = q.filter(Document.doc_type == doc_type)
    return [doc_to_out(db, d) for d in q.limit(200)]


