"""Locks the bilingual (French) behavior of the deterministic MockProvider, so the
product stays demoable in French with zero API keys. Reads the example files so
examples and tests cannot drift apart."""
from pathlib import Path

import pytest

from app.services import pipeline
from app.services.llm import MockProvider, _parse_amount

EXAMPLES = Path(__file__).parents[2] / "examples"
DEVIS = (EXAMPLES / "devis-fournisseur.txt").read_text(encoding="utf-8")
RAPPORT = (EXAMPLES / "rapport-intervention.txt").read_text(encoding="utf-8")


def test_classifies_french_devis_as_supplier_quote():
    c = MockProvider().classify(DEVIS)
    assert c["doc_type"] == "supplier_quote"
    assert c["department"] == "Administration"


def test_classifies_french_intervention_report():
    c = MockProvider().classify(RAPPORT)
    assert c["doc_type"] == "intervention_report"
    assert c["department"] == "Field Operations"


def test_extracts_french_quote_fields():
    r = MockProvider().extract(DEVIS)
    assert r["supplier"] == "Électricité Bretonne Sarl"
    assert r["reference"] == "DEMO-DEVIS-001"
    assert r["amount"] == 8250.0
    assert r["currency"] == "EUR"
    assert r["due_date"] == "2027-03-15"  # converted from 15/03/2027
    assert r["requester"] is not None
    assert r["site"] is not None


def test_extracts_french_quote_with_nbsp_amount_and_date():
    nbsp = DEVIS.replace("8 250,00 €", "8 250,00 €").replace("15/03/2027", "15/03/2027")
    r = MockProvider().extract(nbsp)
    assert r["amount"] == 8250.0
    assert r["currency"] == "EUR"
    assert r["due_date"] == "2027-03-15"
def test_extracts_french_intervention_fields():
    r = MockProvider().extract(RAPPORT)
    assert r["site"] == "Poste De Distribution Saint-Malo Sud"
    assert r["requester"] == "Service Exploitation"
    assert r["reference"] == "INT-2027-0042"
    assert r["due_date"] == "2027-06-12"  # converted from 12/06/2027


@pytest.mark.parametrize("word", ["prioritaire", "critique", "immédiat", "urgence"])
def test_french_priority_words_set_high(word):
    c = MockProvider().classify(f"Devis de fournisseur — {word}.")
    assert c["priority"] == "high"


def test_french_devis_passes_pipeline_validation():
    r = pipeline.extract_fields(DEVIS, "supplier_quote")
    assert r["missing_fields"] == []
    assert r["data"]["amount"] == 8250.0
    assert r["data"]["due_date"] == "2027-03-15"


@pytest.mark.parametrize("raw, expected", [("1 500,00", 1500.0), ("8 250,00", 8250.0), ("1 500,00", 1500.0)])
def test_parse_amount_french_grouping(raw, expected):
    assert _parse_amount(raw) == expected
