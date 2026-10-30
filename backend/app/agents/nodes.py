"""Agent node implementations. Each node is a specialized responsibility backed by
our validated service functions, wrapped with observatory tracing."""
import time

from sqlalchemy.orm import Session as DBSession

from ..config import get_settings
from ..models import AgentTrace
from ..services.llm import get_provider
from ..services.pipeline import classify_document, extract_fields
from .state import PipelineState


def _trace(db: DBSession, *, agent: str, provider_name: str, model: str, document_id, input_summary: str,
           output: dict, t0: float, confidence=None, status="ok") -> None:
    import uuid

    usage = getattr(get_provider(), "last_usage", None) or {}
    if isinstance(document_id, str):
        document_id = uuid.UUID(document_id)
    db.add(AgentTrace(
        agent=agent, provider=provider_name, model=model, document_id=document_id,
        input_summary=input_summary[:500], output=output,
        latency_ms=int((time.time() - t0) * 1000),
        tokens_in=usage.get("in"), tokens_out=usage.get("out"),
        confidence=confidence, status=status,
    ))


def _provider_info():
    p = get_provider()
    model = getattr(p, "model", "") or ("heuristic-v1" if p.name == "mock" else "")
    return p.name, model


def supervisor_node(state: PipelineState, db: DBSession) -> dict:
    """Plans the pipeline: which validators matter for this document type."""
    t0 = time.time()
    text = state.get("text", "")
    preview = " ".join(text.split())[:120]
    note = "full pipeline: classify -> extract -> QA -> automation gate"
    if len(text) < 40:
        note = "tiny document: classify + QA only, extraction unlikely to find fields"
    _trace(db, agent="supervisor", provider_name="rules", model="v1", document_id=state.get("document_id"),
           input_summary=preview, output={"plan": note}, t0=t0)
    return {"supervisor_note": note}


def classification_node(state: PipelineState, db: DBSession) -> dict:
    t0 = time.time()
    provider_name, model = _provider_info()
    text = state.get("text", "")
    try:
        cls = classify_document(text)
        status = "ok"
    except Exception as e:  # provider down -> degraded classification
        from ..services.llm import MockProvider

        cls = MockProvider().classify(text)
        cls["confidence"] = min(cls["confidence"], 0.6)
        status = "fallback"
        cls["fallback_error"] = str(e)[:200]
    _trace(db, agent="classification-agent", provider_name=provider_name, model=model,
           document_id=state.get("document_id"), input_summary=text[:200], output=cls,
           t0=t0, confidence=cls.get("confidence"), status=status)
    return {"classification": cls}


def document_intelligence_node(state: PipelineState, db: DBSession) -> dict:
    t0 = time.time()
    provider_name, model = _provider_info()
    text = state.get("text", "")
    doc_type = (state.get("classification") or {}).get("doc_type", "other")
    try:
        ext = extract_fields(text, doc_type)
        status = "ok"
    except Exception as e:
        from ..services.llm import MockProvider

        ext = {"data": MockProvider().extract(text), "missing_fields": [], "confidence": 0.5}
        ext["fallback_error"] = str(e)[:200]
        status = "fallback"
    _trace(db, agent="document-intelligence-agent", provider_name=provider_name, model=model,
           document_id=state.get("document_id"), input_summary=text[:200], output=ext,
           t0=t0, confidence=ext.get("confidence"), status=status)
    return {"extraction": ext}


def qa_agent_node(state: PipelineState, db: DBSession) -> dict:
    """Quality Assurance agent: deterministic consistency checks + confidence gate."""
    t0 = time.time()
    provider_name, model = _provider_info()
    cls = state.get("classification") or {}
    ext = state.get("extraction") or {}
    data = ext.get("data", {})
    doc_type = cls.get("doc_type", "other")
    issues = [f"missing required field: {f}" for f in (ext.get("missing_fields") or [])]

    if data.get("amount") is not None and not (0 < data["amount"] < 10_000_000):
        issues.append(f"amount out of plausible range: {data['amount']}")
    if data.get("currency") and data["currency"] not in ("EUR", "USD", "GBP"):
        issues.append(f"unknown currency: {data['currency']}")
    if data.get("due_date"):
        from datetime import date, datetime

        try:
            d = datetime.strptime(data["due_date"], "%Y-%m-%d").date()
            if d < date.today():
                issues.append(f"due date in the past: {data['due_date']}")
        except ValueError:
            issues.append(f"due_date not a valid ISO date: {data['due_date']}")
    if doc_type == "supplier_quote" and data.get("amount") and not data.get("currency"):
        issues.append("amount without currency on a supplier quote")

    threshold = get_settings().agent_review_threshold
    low_confidence = cls.get("confidence", 0) < threshold or ext.get("confidence", 0) < threshold
    qa_ok = not issues and not low_confidence
    if low_confidence and not issues:
        issues.append("confidence below review threshold")
    output = {"issues": issues, "qa_ok": qa_ok, "threshold": threshold}
    _trace(db, agent="qa-agent", provider_name=provider_name, model=model,
           document_id=state.get("document_id"), input_summary=f"{doc_type} + {len(data)} fields",
           output=output, t0=t0, confidence=cls.get("confidence"), status="ok")
    return {"qa_issues": issues, "qa_ok": qa_ok}
