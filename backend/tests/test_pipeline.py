from app.services import pipeline
from app.services.llm import MockProvider

QUOTE = (
    "SUPPLIER QUOTE — Schneider Electric France. Reference: QT-2026-0417. Supplier: Schneider Electric. "
    "Total: 49,600.00 EUR. Delivery: 2026-05-15."
)


def test_classifies_supplier_quote():
    c = MockProvider().classify(QUOTE)
    assert c["doc_type"] == "supplier_quote"
    assert c["department"] == "Administration"
    assert 0 <= c["confidence"] <= 1


def test_classifies_unknown_text_as_other():
    c = MockProvider().classify("zzz qqq random gibberish nothing matches")
    assert c["doc_type"] == "other"
    assert c["confidence"] < 0.5


def test_extraction_finds_core_fields():
    r = pipeline.extract_fields(QUOTE, "supplier_quote")
    assert r["data"]["supplier"] == "Schneider Electric"
    assert r["data"]["amount"] == 49600.0
    assert r["data"]["currency"] == "EUR"
    assert r["data"]["due_date"] == "2026-05-15"
    assert "amount" not in r["missing_fields"]


def test_extraction_flags_missing_required_fields():
    r = pipeline.extract_fields("Quotation with no fields at all.", "supplier_quote")
    assert set(pipeline.REQUIRED_FIELDS["supplier_quote"]) <= set(r["missing_fields"])


def test_extracted_fields_model_rejects_negative_amount():
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        pipeline.ExtractedFields(amount=-5)


def test_process_document_shape():
    out = pipeline.process_document(QUOTE)
    assert {"classification", "data", "missing_fields", "confidence"} <= set(out)
    assert out["classification"]["doc_type"] in pipeline.DOC_TYPES
