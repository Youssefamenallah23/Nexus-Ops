"""Regressions for provider fallback, review corrections, and seeded workflows."""
from datetime import date

import pytest
from pydantic import ValidationError

from app.models import Document, Extraction, Session as UserSession, Task, User
from app.services import pipeline
from app.services.llm import GeminiProvider
from tests.conftest import TestSession, cookie

QUOTE = "SUPPLIER QUOTE. Supplier: DemoCorp. Reference: DEMO-01. Total: 1500 EUR. Delivery date: 2030-12-01."


@pytest.mark.parametrize("raw, expected", [("49,600.00", 49600), ("4.200,00", 4200), ("1,234,567", 1234567), ("1.234.567,89", 1234567.89), ("1500,50", 1500.5), ("1,2,3", None)])
def test_demo_amount_formats(raw, expected):
    from app.services.llm import _parse_amount
    assert _parse_amount(raw) == expected


def test_gemini_implements_provider_interface(monkeypatch):
    provider = GeminiProvider("not-a-real-key", "test-model")
    monkeypatch.setattr(provider, "_generate", lambda prompt: {"doc_type": "other", "text": "From sources"})
    assert provider.classify("sample")["doc_type"] == "other"
    assert provider.extract("sample")["doc_type"] == "other"
    assert provider.complete("question") == "From sources"


def test_fallback_does_not_call_failed_provider_again(monkeypatch):
    calls = []

    class FailingProvider:
        def classify(self, text):
            calls.append("classify")
            raise TimeoutError("unavailable")

        def extract(self, text):
            calls.append("extract")
            raise TimeoutError("unavailable")

    monkeypatch.setattr(pipeline, "get_provider", FailingProvider)
    result = pipeline.process_document(QUOTE)
    assert calls.count("extract") == 1
    assert result["fallback"] is True
    assert result["data"]["amount"] == 1500
    assert result["missing_fields"] == []


def test_extraction_preserves_valid_fields_when_one_is_invalid():
    class InvalidAmountProvider:
        def extract(self, text):
            return {"supplier": " Valid supplier ", "amount": -1, "currency": "eur", "due_date": "2030-02-30"}

    result = pipeline.extract_fields("", "supplier_quote", provider=InvalidAmountProvider())
    assert result["data"]["supplier"] == "Valid supplier"
    assert result["data"]["currency"] == "EUR"
    assert result["data"]["amount"] is None
    assert {"amount", "due_date"} <= set(result["missing_fields"])


@pytest.mark.parametrize("fields", [{"due_date": "2030-02-30"}, {"due_date": "20301201"}, {"currency": "INVALID"}])
def test_invalid_human_fields_are_rejected(fields):
    with pytest.raises(ValidationError):
        pipeline.ExtractedFields(**fields)


def test_login_creates_one_session(client, seeded):
    with TestSession() as db:
        before = db.query(UserSession).count()
        response = client.post("/auth/login", json={"email": "admin@nexus.test", "password": "demo1234"})
        assert response.status_code == 200
        assert db.query(UserSession).count() == before + 1


def test_approval_uses_saved_fields_and_due_date(client, seeded):
    response = client.post("/documents", files={"file": ("demo.txt", QUOTE.encode(), "text/plain")}, cookies=cookie(seeded, "employee"))
    doc_id = response.json()["id"]
    edited = client.post(f"/documents/{doc_id}/extraction", json={"data": {"supplier": "DemoCorp", "reference": "CORRECTED-REF", "amount": 1500, "currency": "EUR", "due_date": "2031-01-15", "summary": "Corrected summary"}}, cookies=cookie(seeded, "employee"))
    assert edited.status_code == 200
    approved = client.post(f"/documents/{doc_id}/approve", cookies=cookie(seeded, "manager"))
    assert approved.status_code == 200, approved.text
    tasks = client.get("/tasks", cookies=cookie(seeded, "manager")).json()
    task = next(task for task in tasks if task["document_id"] == doc_id)
    assert "CORRECTED-REF" in task["title"]
    assert date.fromisoformat(task["due_date"][:10]) == date(2031, 1, 15)


def test_seeded_document_without_checkpoint_can_be_approved(client, seeded):
    with TestSession() as db:
        user = db.query(User).filter_by(email="admin@nexus.test").one()
        doc = Document(filename="seeded-review.txt", mime_type="text/plain", size_bytes=len(QUOTE), text_content=QUOTE, status="needs_review", doc_type="supplier_quote", uploaded_by=user.id, department="Administration", classification_confidence=.9)
        db.add(doc)
        db.flush()
        db.add(Extraction(document_id=doc.id, revision=1, data={"reference": "SEEDED-01", "due_date": "2030-12-01"}, missing_fields=[], confidence=.9))
        db.commit()
        doc_id = str(doc.id)
    response = client.post(f"/documents/{doc_id}/approve", cookies=cookie(seeded, "manager"))
    assert response.status_code == 200, response.text
    with TestSession() as db:
        import uuid
        assert db.query(Task).filter_by(document_id=uuid.UUID(doc_id)).count() == 1
    assert client.post(f"/documents/{doc_id}/approve", cookies=cookie(seeded, "manager")).status_code == 409
