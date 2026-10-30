"""End-to-end API tests: upload -> review -> approve -> task -> audit, plus permissions."""
from tests.conftest import TestSession, cookie

QUOTE_TXT = (
    "SUPPLIER QUOTE. Reference: QT-TEST-1. Supplier: TestCorp. Total: 1,500 EUR. "
    "Delivery date 2026-12-01."
)


def test_upload_classifies_and_extracts(client, seeded):
    r = client.post("/documents", files={"file": ("q.txt", QUOTE_TXT.encode(), "text/plain")},
                    cookies=cookie(seeded, "employee"))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["doc_type"] == "supplier_quote"
    assert d["status"] == "needs_review"
    assert d["latest_confidence"] > 0
    assert d["missing_fields"] == []


def test_upload_rejects_bad_type_and_empty(client, seeded):
    r = client.post("/documents", files={"file": ("x.exe", b"MZ", "application/x-msdownload")},
                    cookies=cookie(seeded, "employee"))
    assert r.status_code == 422
    r = client.post("/documents", files={"file": ("empty.txt", b"", "text/plain")},
                    cookies=cookie(seeded, "employee"))
    assert r.status_code == 422


def test_employee_cannot_approve_manager_can(client, seeded):
    r = client.post("/documents", files={"file": ("q.txt", QUOTE_TXT.encode(), "text/plain")},
                    cookies=cookie(seeded, "employee"))
    doc_id = r.json()["id"]
    # employee blocked
    r = client.post(f"/documents/{doc_id}/approve", cookies=cookie(seeded, "employee"))
    assert r.status_code == 403
    # manager succeeds and a task is created
    r = client.post(f"/documents/{doc_id}/approve", cookies=cookie(seeded, "manager"))
    assert r.status_code == 200
    assert r.json()["task_department"] == "Administration"
    tasks = client.get("/tasks", cookies=cookie(seeded, "manager")).json()
    assert any(t["document_id"] == doc_id for t in tasks)


def test_approve_is_idempotent_guarded(client, seeded):
    r = client.post("/documents", files={"file": ("q.txt", QUOTE_TXT.encode(), "text/plain")},
                    cookies=cookie(seeded, "employee"))
    doc_id = r.json()["id"]
    client.post(f"/documents/{doc_id}/approve", cookies=cookie(seeded, "manager"))
    r = client.post(f"/documents/{doc_id}/approve", cookies=cookie(seeded, "manager"))
    assert r.status_code == 409


def test_manual_edit_creates_new_revision_and_updates_missing(client, seeded):
    r = client.post("/documents", files={"file": ("q.txt", QUOTE_TXT.encode(), "text/plain")},
                    cookies=cookie(seeded, "employee"))
    doc_id = r.json()["id"]
    r2 = client.post(f"/documents/{doc_id}/extraction",
                     json={"data": {"supplier": "TestCorp", "reference": "QT-TEST-1", "amount": 1500,
                                    "currency": "EUR", "requester": None, "site": None,
                                    "due_date": "2026-12-01", "summary": "ok"}},
                     cookies=cookie(seeded, "employee"))
    assert r2.status_code == 200, r2.text
    body = r2.json()
    assert body["extractions"][-1]["revision"] == 2
    assert body["extractions"][-1]["created_by"] != "ai"


def test_invalid_edit_payload_rejected(client, seeded):
    r = client.post("/documents", files={"file": ("q.txt", QUOTE_TXT.encode(), "text/plain")},
                    cookies=cookie(seeded, "employee"))
    doc_id = r.json()["id"]
    r2 = client.post(f"/documents/{doc_id}/extraction",
                     json={"data": {"amount": "not-a-number", "confidence": 1.0}},
                     cookies=cookie(seeded, "employee"))
    assert r2.status_code == 422


def test_unauthenticated_requests_rejected(client):
    assert client.get("/documents").status_code == 401


def test_audit_trail_records_approval(client, seeded):
    r = client.post("/documents", files={"file": ("q.txt", QUOTE_TXT.encode(), "text/plain")},
                    cookies=cookie(seeded, "employee"))
    doc_id = r.json()["id"]
    client.post(f"/documents/{doc_id}/approve", cookies=cookie(seeded, "administrator"))
    events = client.get("/audit-events", cookies=cookie(seeded, "administrator")).json()
    actions = {e["action"] for e in events}
    assert "extraction.approved" in actions
    assert any(a.startswith("workflow.") for a in actions)  # automation agent emitted to n8n
    assert "ai.pipeline_planned" in actions  # supervisor planned the run

