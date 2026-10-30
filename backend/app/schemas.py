from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

Id = UUID | str  # ids are UUIDs in the DB; serialized as strings over JSON


class UserOut(BaseModel):
    id: Id
    email: str
    name: str
    role: str
    department: str


class ExtractionOut(BaseModel):
    revision: int
    data: dict
    missing_fields: list
    confidence: float
    created_by: str
    created_at: datetime


class DocumentOut(BaseModel):
    id: Id
    filename: str
    mime_type: str
    size_bytes: int
    status: str
    doc_type: str
    classification_confidence: float | None
    department: str | None
    uploaded_by: Id
    uploaded_at: datetime
    uploader_name: str | None = None
    project_name: str | None = None
    missing_fields: list = []
    latest_confidence: float | None = None


class DocumentDetail(DocumentOut):
    text_content: str
    extractions: list[ExtractionOut]
    reviewer_name: str | None = None


class TaskOut(BaseModel):
    id: Id
    title: str
    description: str
    status: str
    priority: str
    department: str
    document_id: Id | None
    project_id: Id | None
    due_date: datetime | None
    assignee_name: str | None = None
    created_at: datetime


class AuditOut(BaseModel):
    id: Id
    actor_label: str
    action: str
    entity_type: str
    entity_id: str | None
    detail: dict
    created_at: datetime
