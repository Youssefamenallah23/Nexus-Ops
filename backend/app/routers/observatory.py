"""Agent Observatory: trace listing, aggregate stats, provider evaluation."""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

from ..auth import get_current_user, require_role
from ..config import get_settings
from ..db import get_db
from ..models import AgentTrace, User, audit

router = APIRouter(prefix="/observatory", tags=["observatory"])


@router.get("/traces")
def traces(limit: int = 60, agent: str | None = None, db: DBSession = Depends(get_db),
           user: User = Depends(get_current_user)):
    q = db.query(AgentTrace).order_by(AgentTrace.created_at.desc())
    if agent:
        q = q.filter(AgentTrace.agent == agent)
    return [
        {
            "id": str(t.id), "agent": t.agent, "provider": t.provider, "model": t.model,
            "document_id": str(t.document_id) if t.document_id else None,
            "input_summary": t.input_summary, "output": t.output,
            "latency_ms": t.latency_ms, "tokens_in": t.tokens_in, "tokens_out": t.tokens_out,
            "confidence": t.confidence, "status": t.status, "created_at": t.created_at,
        }
        for t in q.limit(min(limit, 200))
    ]


@router.get("/summary")
def summary(db: DBSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (db.query(
        AgentTrace.agent,
        AgentTrace.provider,
        func.count().label("calls"),
        func.avg(AgentTrace.latency_ms).label("avg_latency"),
    ).group_by(AgentTrace.agent, AgentTrace.provider).all())
    fallbacks = (db.query(func.count()).filter(AgentTrace.status == "fallback").scalar())
    errors = (db.query(func.count()).filter(AgentTrace.status == "error").scalar())
    total = db.query(func.count(AgentTrace.id)).scalar() or 1
    return {
        "by_agent": [
            {"agent": r.agent, "provider": r.provider, "calls": r.calls,
             "avg_latency_ms": round(float(r.avg_latency or 0))}
            for r in rows
        ],
        "fallback_rate": round((fallbacks or 0) / total, 3),
        "error_rate": round((errors or 0) / total, 3),
        "total_calls": total,
    }


@router.post("/evaluate")
def evaluate(db: DBSession = Depends(get_db), user: User = Depends(require_role("administrator"))):
    """Run every configured provider over identical sample documents and compare.
    This is the AI-engineering experiment: agreement, confidence, latency per provider."""
    from ..services.llm import GeminiProvider, MockProvider, NvidiaMistralProvider

    samples = [
        ("quote", "SUPPLIER QUOTE - VoltAmperes SARL. Reference: QT-EVAL-1. Supplier: VoltAmperes SARL. "
                  "Total: 12,400 EUR. Delivery: 2026-12-01."),
        ("intervention", "INTERVENTION REPORT. Site: Rennes Nord Substation, panel R21. "
                         "Technician: A. Diallo. Earth fault alarm, repaired feeder insulation."),
        ("gibberish", "zzz qqq xkcd flurb blorp snorp wumpus tickle"),
    ]
    settings = get_settings()
    providers = [("mock", MockProvider())]
    if settings.nvidia_api_key:
        providers.append(("mistral-nvidia", NvidiaMistralProvider(
            settings.nvidia_api_key, settings.nvidia_base_url, settings.nvidia_model)))
    if settings.google_api_key:
        providers.append(("gemini", GeminiProvider(settings.google_api_key, settings.gemini_model)))

    results = []
    import time as _time

    for name, prov in providers:
        for kind, text in samples:
            t0 = _time.time()
            try:
                cls = prov.classify(text)
                usage = getattr(prov, "last_usage", None) or {}
                results.append({
                    "provider": name, "sample": kind, "doc_type": cls.get("doc_type"),
                    "confidence": cls.get("confidence"), "ok": True,
                    "latency_ms": int((_time.time() - t0) * 1000),
                    "tokens": usage,
                })
            except Exception as e:
                results.append({"provider": name, "sample": kind, "ok": False,
                                "error": str(e)[:150],
                                "latency_ms": int((_time.time() - t0) * 1000)})

    audit(db, actor=user, action="observatory.evaluation_run", entity_type="observatory",
          detail={"providers": [p[0] for p in providers], "samples": len(samples)})
    db.commit()
    return {"results": results}
