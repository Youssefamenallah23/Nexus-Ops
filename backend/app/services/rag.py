"""RAG: chunk approved documents, embed, store in pgvector, retrieve with role filtering.

Answer rule: the copilot only speaks from retrieved excerpts. If retrieval comes back
weak, it says so instead of improvising.
"""
import math

from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session as DBSession

from ..config import get_settings
from ..models import Chunk, Document, User
from .embeddings import get_embedding_provider

CHUNK_CHARS = 800
CHUNK_OVERLAP = 120


def chunk_text(content: str) -> list[str]:
    content = " ".join(content.split())
    if len(content) <= CHUNK_CHARS:
        return [content] if content else []
    chunks = []
    step = CHUNK_CHARS - CHUNK_OVERLAP
    for i in range(0, len(content), step):
        chunks.append(content[i : i + CHUNK_CHARS])
        if i + CHUNK_CHARS >= len(content):
            break
    return chunks


def ingest_document(db: DBSession, doc: Document) -> int:
    """(Re)ingest an approved document. Returns the number of chunks stored."""
    db.query(Chunk).filter(Chunk.document_id == doc.id).delete()
    texts = chunk_text(doc.text_content)
    if not texts:
        return 0
    vectors = get_embedding_provider().embed(texts)
    for i, (chunk, vec) in enumerate(zip(texts, vectors)):
        db.add(Chunk(document_id=doc.id, chunk_index=i, content=chunk, embedding=vec,
                     department=doc.department))
    db.commit()
    return len(texts)


def visible_departments(user: User) -> set[str] | None:
    """Role-based document access applied BEFORE retrieval.
    Admin/manager see everything (None); employees see their department + own uploads."""
    if user.role in ("administrator", "manager"):
        return None
    return {user.department}

def retrieve(db: DBSession, user: User, question: str, k: int = 5) -> list[dict]:
    query_vec = get_embedding_provider().embed([question])[0]
    query_vec_sql = "[" + ",".join(f"{v:.7f}" for v in query_vec) + "]"

    # ponytail: two code paths — pgvector KNN on Postgres, in-Python scan on SQLite
    # (test suite). Replace the Python path if tests grow to thousands of chunks.
    if db.get_bind().dialect.name == "postgresql":
        sql = """
            SELECT c.id, 1 - (c.embedding <=> :qv ::vector) AS score
            FROM chunks c
            JOIN documents d ON d.id = c.document_id
            WHERE d.status = 'approved'
        """
        params: dict = {"qv": query_vec_sql}
        depts = visible_departments(user)
        if depts is not None:
            placeholders = ", ".join(f":d{i}" for i in range(len(depts)))
            sql += f" AND c.department IN ({placeholders})"
            params.update({f"d{i}": v for i, v in enumerate(sorted(depts))})
        sql += " ORDER BY score DESC LIMIT :k"
        params["k"] = k
        rows = db.execute(sql_text(sql), params).fetchall()
        return [db.get(Chunk, row_id).to_result(score) for row_id, score in rows]

    # SQLite fallback: Python cosine over JSON vectors.
    rows = (
        db.query(Chunk)
        .join(Document, Document.id == Chunk.document_id)
        .filter(Document.status == "approved")
        .all()
    )
    depts = visible_departments(user)
    scored = [
        (cosine(query_vec, c.embedding), c)
        for c in rows
        if depts is None or c.department in depts
    ]
    scored.sort(key=lambda s: -s[0])
    return [c.to_result(score) for score, c in scored[:k]]

def _mock_answer(question: str, hits: list[dict]) -> str | None:
    """Extractive answer from sentences sharing question tokens. None = no meaningful overlap."""
    q_tokens = {t.strip(".,:;?!()") for t in question.lower().split()}
    # keep short codes (r14, g2) — they are exactly the identifiers that matter here
    q_tokens = {t for t in q_tokens if len(t) >= 2}

    def meaningful(overlap: set[str]) -> bool:
        # one short word ("next", "site") is noise; require 2+ or one long informative token
        return len(overlap) >= 2 or any(len(t) >= 6 for t in overlap)

    sentences: list[tuple[float, str]] = []
    for hit in hits:
        for sent in hit["excerpt"].split(". "):
            sent_tokens = {t.strip(".,:;?!()") for t in sent.lower().split()}
            overlap = q_tokens & sent_tokens
            if meaningful(overlap):
                sentences.append((len(overlap), sent.strip()))
    if not sentences:
        return None
    sentences.sort(key=lambda s: -s[0])
    return " ".join(f"{s} [source {i + 1}]" for i, (_, s) in enumerate(sentences[:3]))


def answer_question(db: DBSession, user: User, question: str) -> dict:
    hits = retrieve(db, user, question)
    provider = "gemini" if get_settings().google_api_key else "extractive"

    if provider == "gemini":
        context = "\n\n".join(
            f"[{i + 1}] {h['filename']} (excerpt): {h['excerpt']}" for i, h in enumerate(hits)
        )
        from .llm import GeminiProvider

        gem = GeminiProvider(get_settings().google_api_key, get_settings().gemini_model)
        raw = gem._generate(
            "Answer strictly from the excerpts below. Cite sources as [1], [2]. "
            "If the excerpts do not answer the question, start your reply with "
            "NOT_SUPPORTED and explain what is missing.\n\n"
            f"QUESTION: {question}\n\nEXCERPTS:\n{context}"
        )
        answer = raw.get("answer") or raw.get("text") or str(raw)
        supported = not answer.upper().startswith("NOT_SUPPORTED")
    else:
        answer = _mock_answer(question, hits)
        supported = answer is not None

    if not supported:
        return {
            "answer": (
                "The approved documents in your scope do not support an answer to this "
                "question. Try rephrasing, or ask an administrator to ingest more sources."
            ),
            "citations": hits[:3],
            "provider": provider,
            "supported": False,
        }

    return {"answer": answer, "citations": hits, "provider": provider, "supported": True}




def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(x * x for x in b)) or 1.0
    return dot / (na * nb)

