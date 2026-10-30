"""Multi-agent graph tests: interrupt/resume around the human gate + observatory traces."""
from app.models import AgentTrace
from tests.conftest import TestSession, cookie


def test_pipeline_writes_agent_traces(client, seeded):
    r = client.post("/documents", files={"file": ("q.txt", "QUOTATION. Supplier: TraceCorp. "
                                                  "Total: 900 EUR. Delivery date 2027-02-01.".encode(),
                                                 "text/plain")}, cookies=cookie(seeded, "employee"))
    assert r.status_code == 200
    doc_id = r.json()["id"]
    db = TestSession()
    agents = {t.agent for t in db.query(AgentTrace).filter(AgentTrace.document_id == __import__("uuid").UUID(doc_id))}
    # supervisor + classification + document-intelligence + qa all ran before the gate
    assert {"supervisor", "classification-agent", "document-intelligence-agent", "qa-agent"} <= agents
    assert "automation-agent" not in agents  # human gate not passed yet


def test_approval_runs_automation_agent_and_updates_doc(client, seeded):
    r = client.post("/documents", files={"file": ("q.txt", "QUOTATION. Supplier: TraceCorp. "
                                                  "Total: 900 EUR. Delivery date 2027-02-01.".encode(),
                                                 "text/plain")}, cookies=cookie(seeded, "employee"))
    doc_id = r.json()["id"]
    ap = client.post(f"/documents/{doc_id}/approve", cookies=cookie(seeded, "manager"))
    assert ap.status_code == 200, ap.text
    db = TestSession()
    auto = (db.query(AgentTrace)
            .filter(AgentTrace.agent == "automation-agent", AgentTrace.document_id == __import__("uuid").UUID(doc_id)).all())
    assert auto, "automation agent must run after approval"
    from app.models import Document

    doc = db.get(Document, __import__("uuid").UUID(doc_id))
    assert doc.status == "approved"


def test_qa_agent_flags_low_confidence(client, seeded):
    # gibberish document -> low confidence -> QA must flag it
    r = client.post("/documents", files={"file": ("x.txt", "zzz qqq flurb blorp snorp".encode(),
                                                 "text/plain")}, cookies=cookie(seeded, "employee"))
    assert r.status_code == 200
    doc_id = r.json()["id"]
    detail = client.get(f"/documents/{doc_id}", cookies=cookie(seeded, "manager")).json()
    assert detail["qa_ok"] is False
    assert detail["qa_issues"]


def test_observatory_summary(client, seeded):
    client.post("/documents", files={"file": ("q.txt", "QUOTATION. Supplier: TraceCorp. "
                                              "Total: 900 EUR.".encode(), "text/plain")},
                cookies=cookie(seeded, "employee"))
    s = client.get("/observatory/summary", cookies=cookie(seeded, "manager")).json()
    assert s["total_calls"] >= 4
    assert any(a["agent"] == "supervisor" for a in s["by_agent"])
    assert 0 <= s["fallback_rate"] <= 1

