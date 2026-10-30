from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from ..auth import get_current_user, require_role
from ..config import get_settings
from ..db import get_db
from ..models import Task, User, WorkflowExecution, audit
from ..services.n8n import emit

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("/config")
def config(user: User = Depends(get_current_user)):
    s = get_settings()
    return {
        "n8n_configured": bool(s.n8n_webhook_url),
        "webhook_url": s.n8n_webhook_url or None,
        "mock_mode": not s.n8n_webhook_url,
    }


@router.get("/executions")
def list_executions(status: str | None = None, db: DBSession = Depends(get_db),
                    user: User = Depends(get_current_user)):
    q = db.query(WorkflowExecution).order_by(WorkflowExecution.created_at.desc())
    if status:
        q = q.filter(WorkflowExecution.status == status)
    return [
        {
            "id": str(e.id), "workflow_type": e.workflow_type, "entity_type": e.entity_type,
            "entity_id": e.entity_id, "status": e.status, "attempt": e.attempt,
            "payload": e.payload, "response": e.response, "error": e.error,
            "created_at": e.created_at, "finished_at": e.finished_at,
        }
        for e in q.limit(100)
    ]


@router.post("/executions/{exec_id}/retry")
def retry_execution(exec_id: str, db: DBSession = Depends(get_db),
                    user: User = Depends(require_role("administrator", "manager"))):
    import uuid

    original = db.get(WorkflowExecution, uuid.UUID(exec_id))
    if not original:
        raise HTTPException(404, "Execution not found")
    new = emit(db, workflow_type=original.workflow_type, entity_type=original.entity_type,
               entity_id=original.entity_id, payload=original.payload, actor=user)
    new.attempt = original.attempt + 1
    db.commit()
    audit(db, actor=user, action="workflow.retried", entity_type="workflow_execution",
          entity_id=new.id, detail={"original": str(original.id), "result": new.status})
    db.commit()
    return {"ok": True, "new_status": new.status, "new_id": str(new.id)}


class ReminderOut(BaseModel):
    sent: int
    failed: int
    mock: int


@router.post("/reminders", response_model=ReminderOut)
def send_overdue_reminders(db: DBSession = Depends(get_db),
                           user: User = Depends(require_role("administrator", "manager"))):
    """Emit a reminder workflow for every overdue, non-completed task."""
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    overdue = (db.query(Task)
               .filter(Task.due_date.is_not(None), Task.due_date < now, Task.status != "completed")
               .all())
    counts = {"sent": 0, "failed": 0, "mock": 0}
    for t in overdue:
        row = emit(db, workflow_type="task_reminder", entity_type="task", entity_id=str(t.id),
                   payload={"task_id": str(t.id), "title": t.title, "department": t.department,
                            "due_date": t.due_date.isoformat(), "assignee": t.assignee.name if t.assignee else None},
                   actor=user)
        counts[row.status if row.status in ("success", "failed", "mock") else "failed"] += 1
    return counts
