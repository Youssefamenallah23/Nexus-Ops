import pytest

from app.db import Base
from app.models import Chunk, Document, Extraction
from app.services import rag
from tests.conftest import TestSession


@pytest.fixture(autouse=True)
def clean_db():
    """Each RAG test starts from an empty database."""
    yield
    db = TestSession()
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()
    db.close()


def _make_doc(db, *, filename="t.txt", text="Transformer T1 oil level ok. Next inspection due 2026-09-10.",
              status="approved", department="Field Operations", uploader=None):
    doc = Document(filename=filename, mime_type="text/plain", size_bytes=10, text_content=text,
                   status=status, doc_type="maintenance_report", department=department,
                   uploaded_by=uploader.id if uploader else None)
    db.add(doc)
    db.flush()
    db.add(Extraction(document_id=doc.id, revision=1, data={}, missing_fields=[], confidence=0.5))
    db.commit()
    if status == "approved":
        rag.ingest_document(db, doc)
    return doc


def _user(db, role="employee", department="Field Operations"):
    import uuid

    from app.models import User

    u = User(email=f"{role}-{department}-{uuid.uuid4().hex[:8]}@t.st", name="T", role=role,
             department=department)
    db.add(u)
    db.commit()
    return u


def test_chunking_overlap():
    text = "word " * 400  # 2000 chars
    chunks = rag.chunk_text(text)
    assert len(chunks) >= 2
    assert all(len(c) <= rag.CHUNK_CHARS for c in chunks)
    # overlap: end of chunk 1 appears in chunk 2
    assert chunks[0][-40:] in chunks[1] or chunks[1][:40] in chunks[0]


def test_ingest_and_retrieve_sqlite_path():
    db = TestSession()
    u = _user(db, role="manager")
    doc = _make_doc(db, uploader=u)
    n = rag.ingest_document(db, doc)
    assert n == 1
    hits = rag.retrieve(db, u, "transformer oil inspection")
    assert hits
    assert hits[0]["filename"] == "t.txt"
    assert 0 <= hits[0]["score"] <= 1


def test_retrieval_excludes_unapproved():
    db = TestSession()
    u = _user(db, role="manager")
    _make_doc(db, text="breaker recall notice", status="needs_review", uploader=u)
    hits = rag.retrieve(db, u, "breaker recall")
    assert hits == []


def test_employee_department_filter():
    db = TestSession()
    other = _user(db, role="manager", department="Engineering")
    mine = _user(db, role="employee", department="Field Operations")
    _make_doc(db, filename="engineering.txt", text="substation design schematic layout",
              department="Engineering", uploader=other)
    _make_doc(db, filename="fieldops.txt", text="panel r14 earth fault repair",
              department="Field Operations", uploader=mine)
    eng_hits = rag.retrieve(db, other, "schematic")
    assert "engineering.txt" in [h["filename"] for h in eng_hits]
    emp_hits = rag.retrieve(db, mine, "schematic")
    assert "engineering.txt" not in [h["filename"] for h in emp_hits]
    assert "fieldops.txt" in [h["filename"] for h in rag.retrieve(db, mine, "fault")]


def test_unsupported_answer_when_no_hits():
    db = TestSession()
    u = _user(db, role="manager")
    _make_doc(db, text="cable drum delivery schedule", uploader=u)
    res = rag.answer_question(db, u, "what is the quarterly revenue forecast?")
    assert res["supported"] is False


def test_answer_cites_sources():
    db = TestSession()
    u = _user(db, role="manager")
    _make_doc(db, text="Intervention on panel R14: earth fault alarm on feeder 3. "
                        "Replaced cable insulation terminals.", uploader=u)
    res = rag.answer_question(db, u, "panel r14 intervention")
    assert res["supported"] is True
    assert res["citations"]
    c = res["citations"][0]
    assert {"document_id", "filename", "excerpt", "score"} <= set(c)
    assert "r14" in res["answer"].lower() or res["citations"][0]["excerpt"]
