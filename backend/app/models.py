import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

# JSONB on Postgres, plain JSON elsewhere (in-memory SQLite for the test suite).
JSONType = JSONB().with_variant(JSON(), "sqlite")
# pgvector on Postgres; JSON fallback so the SQLite test suite can still create tables.
EmbeddingType = Vector(768).with_variant(JSON(), "sqlite")



def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> "uuid.UUID":
    return uuid.uuid4()


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(Uuid, primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    # ponytail: role as plain string; enum table only if roles grow past 3
    role: Mapped[str] = mapped_column(String, default="employee")  # administrator | manager | employee
    department: Mapped[str] = mapped_column(String, default="Administration")

    sessions: Mapped[list["Session"]] = relationship(back_populates="user")


class Session(Base):
    __tablename__ = "sessions"

    token: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship(back_populates="sessions")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(Uuid, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[str] = mapped_column(Text, default="")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(Uuid, primary_key=True, default=new_id)
    filename: Mapped[str] = mapped_column(String)
    mime_type: Mapped[str] = mapped_column(String)
    size_bytes: Mapped[int] = mapped_column(Integer)
    text_content: Mapped[str] = mapped_column(Text, default="")
    # uploaded | needs_review | approved | rejected
    status: Mapped[str] = mapped_column(String, default="uploaded", index=True)
    # supplier_quote | purchase_request | intervention_report | maintenance_report | meeting_minutes | other
    doc_type: Mapped[str] = mapped_column(String, default="other", index=True)
    classification_confidence: Mapped[float | None] = mapped_column()
    department: Mapped[str | None] = mapped_column(String)
    uploaded_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))

    uploader: Mapped[User] = relationship(foreign_keys=[uploaded_by])
    reviewer: Mapped[User] = relationship(foreign_keys=[reviewed_by])
    project: Mapped[Project | None] = relationship()
    extractions: Mapped[list["Extraction"]] = relationship(back_populates="document", order_by="Extraction.created_at")
    tasks: Mapped[list["Task"]] = relationship(back_populates="document")
    chunks: Mapped[list["Chunk"]] = relationship(back_populates="document", order_by="Chunk.chunk_index")



class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(Uuid, primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text, default="")
    # pending_review | approved | in_progress | blocked | completed
    status: Mapped[str] = mapped_column(String, default="pending_review", index=True)
    priority: Mapped[str] = mapped_column(String, default="medium")  # low | medium | high
    department: Mapped[str] = mapped_column(String)
    assignee_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    document_id: Mapped[str | None] = mapped_column(ForeignKey("documents.id"), index=True)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    assignee: Mapped[User | None] = relationship(foreign_keys=[assignee_id])
    document: Mapped[Document | None] = relationship(back_populates="tasks")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(Uuid, primary_key=True, default=new_id)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    actor_label: Mapped[str] = mapped_column(String, default="system")  # user name, "ai:<agent>", "system"
    action: Mapped[str] = mapped_column(String, index=True)  # e.g. document.uploaded, extraction.approved
    entity_type: Mapped[str] = mapped_column(String)
    entity_id: Mapped[str | None] = mapped_column(String)
    detail: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class Chunk(Base):
    """A chunk of an approved document's text with its embedding, for RAG retrieval."""

    __tablename__ = "chunks"

    id: Mapped[str] = mapped_column(Uuid, primary_key=True, default=new_id)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    embedding = mapped_column(EmbeddingType)
    department: Mapped[str | None] = mapped_column(String)  # denormalized for access filtering

    document: Mapped[Document] = relationship(back_populates="chunks")

    def to_result(self, score: float) -> dict:
        return {
            "document_id": str(self.document_id),
            "filename": self.document.filename,
            "doc_type": self.document.doc_type,
            "chunk_index": self.chunk_index,
            "excerpt": self.content,
            "score": round(score, 4),
        }


def audit(db, *, actor=None, actor_label="system", action, entity_type, entity_id=None, detail=None):
    db.add(
        AuditEvent(
            actor_id=actor.id if actor else None,
            actor_label=actor.name if actor else actor_label,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            detail=detail or {},
        )
    )


class Extraction(Base):
    """One revision of AI-extracted fields for a document. Latest row wins."""

    __tablename__ = "extractions"

    id: Mapped[str] = mapped_column(Uuid, primary_key=True, default=new_id)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    data: Mapped[dict] = mapped_column(JSONType)
    missing_fields: Mapped[list] = mapped_column(JSONType, default=list)
    confidence: Mapped[float] = mapped_column(default=0.0)
    created_by: Mapped[str] = mapped_column(String, default="ai")  # "ai" or user id for manual edits
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    document: Mapped[Document] = relationship(back_populates="extractions")

