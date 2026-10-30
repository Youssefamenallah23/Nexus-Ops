from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

from ..auth import get_current_user
from ..db import get_db
from ..models import AuditEvent, Document, Task, User
from ..schemas import AuditOut, TaskOut

router = APIRouter(tags=["tasks"])


@router.get("/tasks", response_model=list[TaskOut])
def list_tasks(status: str | None = None, db: DBSession = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(Task).order_by(Task.created_at.desc())
    if status:
        q = q.filter(Task.status == status)
    return [
        TaskOut(
            id=t.id, title=t.title, description=t.description, status=t.status, priority=t.priority,
            department=t.department, document_id=t.document_id, project_id=t.project_id,
            due_date=t.due_date, assignee_name=t.assignee.name if t.assignee else None, created_at=t.created_at,
        )
        for t in q.limit(200)
    ]


class TaskUpdate(BaseModel):
    status: str | None = None
    assignee_id: str | None = None


VALID_TASK_STATUSES = {"pending_review", "approved", "in_progress", "blocked", "completed"}


@router.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: str, body: TaskUpdate, db: DBSession = Depends(get_db), user=Depends(get_current_user)):
    t = db.get(Task, __import__("uuid").UUID(task_id))
    if not t:
        raise HTTPException(404, "Task not found")
    if body.status and body.status not in VALID_TASK_STATUSES:
        raise HTTPException(422, f"Invalid status. Valid: {sorted(VALID_TASK_STATUSES)}")
    if body.status:
        t.status = body.status
        db.add(AuditEvent(actor_id=user.id, actor_label=user.name, action=f"task.status_{body.status}",
                          entity_type="task", entity_id=t.id))
    if body.assignee_id:
        if not db.get(User, __import__("uuid").UUID(body.assignee_id)):
            raise HTTPException(422, "Unknown assignee")
        t.assignee_id = body.assignee_id
    db.commit()
    return TaskOut(
        id=t.id, title=t.title, description=t.description, status=t.status, priority=t.priority,
        department=t.department, document_id=t.document_id, project_id=t.project_id, due_date=t.due_date,
        assignee_name=t.assignee.name if t.assignee else None, created_at=t.created_at,
    )


@router.get("/audit-events", response_model=list[AuditOut])
def list_audit(limit: int = 100, db: DBSession = Depends(get_db), user=Depends(get_current_user)):
    return [
        AuditOut(id=e.id, actor_label=e.actor_label, action=e.action, entity_type=e.entity_type,
                 entity_id=e.entity_id, detail=e.detail, created_at=e.created_at)
        for e in db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(min(limit, 500))
    ]


def estimated_hours_saved(manual_minutes: float, assisted_minutes: float, annual_volume: int) -> float:
    """Simulated assumption — NOT measured company results. (manual - assisted) * volume / 60."""
    return round((manual_minutes - assisted_minutes) * annual_volume / 60, 1)


BASELINE_MANUAL_MIN = 12.0   # documented simulator assumption, editable per scenario
ASSISTED_MIN = 3.0


@router.get("/analytics/overview")
def analytics_overview(db: DBSession = Depends(get_db), user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    by_status = dict(db.query(Document.status, func.count()).group_by(Document.status).all())
    by_type = dict(db.query(Document.doc_type, func.count()).group_by(Document.doc_type).all())
    tasks_by_status = dict(db.query(Task.status, func.count()).group_by(Task.status).all())
    overdue = db.query(func.count(Task.id)).filter(
        Task.due_date.is_not(None), Task.due_date < now, Task.status != "completed"
    ).scalar()
    total_docs = sum(by_status.values()) or 1
    approved = by_status.get("approved", 0)
    rejected = by_status.get("rejected", 0)
    return {
        "documents": {
            "total": total_docs,
            "by_status": by_status,
            "by_type": by_type,
            "pending_review": by_status.get("needs_review", 0),
            "straight_through_rate": round((approved + rejected) / total_docs, 3),
        },
        "tasks": {"by_status": tasks_by_status, "overdue": overdue},
        "automation": {
            # Share of documents that needed zero manual field correction after AI extraction.
            "ai_processed": total_docs,
            "manual_corrections": db.query(func.count(AuditEvent.id)).filter(
                AuditEvent.action == "extraction.edited").scalar(),
        },
        "time_saved_simulator": {
            "disclaimer": "Simulated assumptions, not measured company results.",
            "manual_minutes": BASELINE_MANUAL_MIN,
            "assisted_minutes": ASSISTED_MIN,
            "annual_volume": 1000,
            "estimated_hours_saved": estimated_hours_saved(BASELINE_MANUAL_MIN, ASSISTED_MIN, 1000),
            "formula": "(manual_minutes - assisted_minutes) * annual_volume / 60",
        },
    }

