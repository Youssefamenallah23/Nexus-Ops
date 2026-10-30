"""Automation Agent: the only node that acts on the world — runs after the human gate."""
import time

from sqlalchemy.orm import Session as DBSession

from ..models import AgentTrace, Document, audit
from ..services.n8n import emit
from ..services.routing import create_task_for_document
from .state import PipelineState


def automation_node(state: PipelineState, db: DBSession, user) -> dict:
    """Creates the routed task and fires the n8n webhook.
    Only runs after the human approval gate (graph interrupt)."""
    import uuid
    from datetime import datetime, timezone

    t0 = time.time()
    doc_id = state["document_id"]
    doc_id = uuid.UUID(doc_id) if isinstance(doc_id, str) else doc_id
    doc = db.get(Document, doc_id)
    cls = state.get("classification") or {}
    task = create_task_for_document(db, doc, user, priority=cls.get("priority", "medium"))
    doc.status = "approved"

    doc.reviewed_at = datetime.now(timezone.utc)
    if user:
        doc.reviewed_by = user.id
    audit(db, actor=user, action="extraction.approved", entity_type="document", entity_id=doc.id)
    db.commit()
    emit(db, workflow_type="document_approved", entity_type="document", entity_id=str(doc.id),
         payload={"document_id": str(doc.id), "filename": doc.filename, "doc_type": doc.doc_type,
                  "department": task.department, "task_id": str(task.id), "task_title": task.title},
         actor=user)
    db.add(AgentTrace(
        agent="automation-agent", provider="n8n", model="webhook-v1", document_id=doc.id,
        input_summary=f"task for {task.department}",
        output={"task_id": str(task.id), "department": task.department},
        latency_ms=int((time.time() - t0) * 1000), status="ok",
    ))
    db.commit()
    return {}
