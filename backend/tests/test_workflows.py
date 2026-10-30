"""Workflow emission tests: recording, mock mode, retry, and role checks."""
from app.models import WorkflowExecution
from tests.conftest import TestSession, cookie


def test_emit_records_mock_execution_when_no_webhook():
    from app.services.n8n import emit

    db = TestSession()
    row = emit(db, workflow_type="document_approved", entity_type="document", entity_id="x",
               payload={"filename": "a.txt"})
    assert row.status == "mock"
    assert "mock" in (row.error or "").lower()
    assert row.payload["filename"] == "a.txt"


def test_approve_emits_workflow(client, seeded):
    r = client.post("/documents", files={"file": ("q.txt", "QUOTATION. Supplier: TestCorp. Total: 5 EUR.".encode(),
                                                 "text/plain")}, cookies=cookie(seeded, "employee"))
    doc_id = r.json()["id"]
    client.post(f"/documents/{doc_id}/approve", cookies=cookie(seeded, "manager"))
    execs = client.get("/workflows/executions", cookies=cookie(seeded, "manager")).json()
    assert any(e["workflow_type"] == "document_approved" and e["entity_id"] == doc_id for e in execs)
    # every recorded execution has a terminal status
    assert all(e["status"] in ("success", "failed", "mock") for e in execs)


def test_employee_cannot_retry(client, seeded):
    from app.services.n8n import emit

    db = TestSession()
    row = emit(db, workflow_type="task_reminder", entity_type="task", entity_id="t1", payload={})
    r = client.post(f"/workflows/executions/{row.id}/retry", cookies=cookie(seeded, "employee"))
    assert r.status_code == 403
    r = client.post(f"/workflows/executions/{row.id}/retry", cookies=cookie(seeded, "manager"))
    assert r.status_code == 200
    assert r.json()["new_status"] == "mock"


def test_reminders_report_counts(client, seeded):
    r = client.post("/workflows/reminders", cookies=cookie(seeded, "manager"))
    assert r.status_code == 200
    body = r.json()
    assert body["sent"] + body["failed"] + body["mock"] >= 0


def test_config_reports_mock_mode(client, seeded):
    r = client.get("/workflows/config", cookies=cookie(seeded, "employee"))
    assert r.status_code == 200
    assert r.json()["mock_mode"] in (True, False)
