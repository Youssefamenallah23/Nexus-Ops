"""LangGraph state machine for the document pipeline.

supervisor ──► classification ──► document-intelligence ──► qa ──[INTERRUPT]──► automation ──► END
     │                                                                  (human approval gate)
     └── tiny documents skip extraction (conditional edge)

The checkpointer persists state before the automation agent, so approval resumes
the exact saved state — the human-in-the-loop demonstration.
"""
from functools import lru_cache

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from ..db import engine
from . import nodes
from .automation import automation_node
from .state import PipelineState


def _route_after_supervisor(state: PipelineState) -> str:
    return "qa" if len(state.get("text", "")) < 40 else "classify"


def _wrap(fn, needs_user=False):
    def node(state, config):
        db = config["configurable"]["db"]
        if needs_user:
            return fn(state, db, config["configurable"].get("user"))
        return fn(state, db)
    return node


def _build(saver):
    g = StateGraph(PipelineState)
    g.add_node("supervisor", _wrap(nodes.supervisor_node))
    g.add_node("classify", _wrap(nodes.classification_node))
    g.add_node("extract", _wrap(nodes.document_intelligence_node))
    g.add_node("qa", _wrap(nodes.qa_agent_node))
    g.add_node("automation", _wrap(automation_node, needs_user=True))
    g.add_edge(START, "supervisor")
    g.add_conditional_edges("supervisor", _route_after_supervisor,
                            {"classify": "classify", "qa": "qa"})
    g.add_edge("classify", "extract")
    g.add_edge("extract", "qa")
    g.add_edge("qa", "automation")
    g.add_edge("automation", END)
    return g.compile(checkpointer=saver, interrupt_before=["automation"])


@lru_cache
def get_graph():
    if engine.dialect.name == "postgresql":
        saver = _postgres_saver()
        return _build(saver)
    return _build(MemorySaver())


_saver = None


def _postgres_saver():
    global _saver
    if _saver is None:
        import psycopg
        from langgraph.checkpoint.postgres import PostgresSaver

        uri = engine.url.render_as_string(hide_password=False).replace("+psycopg", "")
        # ponytail: one long-lived connection for checkpointing; per-request saver
        # if concurrent uploads ever contend on it
        conn = psycopg.connect(uri, autocommit=True)
        _saver = PostgresSaver(conn)
    return _saver


def setup_checkpointer():
    """Create checkpoint tables (idempotent). Called once at app startup."""
    if engine.dialect.name == "postgresql":
        _postgres_saver().setup()


def run_intake(db, document_id: str, text: str, filename: str) -> PipelineState:
    """Run supervisor -> classify -> extract -> QA. Stops at the human approval gate."""
    config = {"configurable": {"thread_id": document_id, "db": db}}
    state = {"document_id": document_id, "filename": filename, "text": text}
    result = get_graph().invoke(state, config)
    return result


def resume_after_approval(db, user, document_id: str) -> PipelineState:
    """Resume the checkpointed graph: the automation agent runs now."""
    config = {"configurable": {"thread_id": document_id, "db": db, "user": user}}
    graph = get_graph()
    if not graph.get_state(config).values:
        # Seeded/legacy records predate graph checkpoints. Rebuild the review
        # checkpoint from persisted values, after the API's role/status gate.
        import uuid
        from ..models import Document, audit

        doc = db.get(Document, uuid.UUID(document_id))
        latest = doc.extractions[-1] if doc.extractions else None
        graph.update_state(config, {
            "document_id": document_id, "filename": doc.filename, "text": doc.text_content,
            "classification": {"doc_type": doc.doc_type, "department": doc.department,
                               "confidence": doc.classification_confidence or 0, "priority": "medium"},
            "extraction": {"data": latest.data if latest else {},
                           "missing_fields": latest.missing_fields if latest else [],
                           "confidence": latest.confidence if latest else 0},
        }, as_node="qa")
        audit(db, actor=user, action="document.checkpoint_restored", entity_type="document", entity_id=doc.id)
    return graph.invoke(None, config)
