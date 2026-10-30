"""Routing rules: document type -> owning department + task template. Editable, one small table."""
from ..models import Document, Task, audit

# ponytail: static dict is enough; move to a DB table when non-engineers need to edit rules
ROUTING_RULES = {
    "supplier_quote": {"department": "Administration", "title": "Review supplier quote {ref}"},
    "purchase_request": {"department": "Warehouse", "title": "Process purchase request {ref}"},
    "intervention_report": {"department": "Field Operations", "title": "Follow up intervention at {site}"},
    "maintenance_report": {"department": "Field Operations", "title": "Schedule maintenance for {site}"},
    "meeting_minutes": {"department": "Project Management", "title": "Process action items from meeting"},
    "other": {"department": "Administration", "title": "Review document {filename}"},
}


def create_task_for_document(db, doc: Document, created_by) -> Task:
    rule = ROUTING_RULES.get(doc.doc_type, ROUTING_RULES["other"])
    latest = doc.extractions[-1].data if doc.extractions else {}
    title = rule["title"].format(
        ref=latest.get("reference") or doc.filename,
        site=latest.get("site") or "site",
        filename=doc.filename,
    )
    task = Task(
        title=title,
        description=f"Auto-created from approved document '{doc.filename}'.",
        status="pending_review",
        priority="medium",
        department=rule["department"],
        document_id=doc.id,
        project_id=doc.project_id,
        created_by=created_by.id if created_by else None,
    )
    db.add(task)
    audit(db, actor=created_by, actor_label="system:workflow-engine", action="task.created_from_document",
          entity_type="task", entity_id=task.id, detail={"document_id": str(doc.id), "department": task.department})
    return task
