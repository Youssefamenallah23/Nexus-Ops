"""Embedding provider abstraction. Gemini text-embedding when a key exists,
deterministic hashing embedder offline — no torch, no surprises, stable tests.

Both produce 768-dim vectors so the pgvector column never changes shape.
"""
import hashlib
import math

import httpx

from ..config import get_settings

EMBEDDING_DIMS = 768
EMBEDDING_MODEL = "text-embedding-004"


class GeminiEmbedding:
    name = "gemini"

    def embed(self, texts: list[str]) -> list[list[float]]:
        s = get_settings()
        resp = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{EMBEDDING_MODEL}:batchEmbedContents",
            params={"key": s.google_api_key},
            json={
                "requests": [
                    {
                        "model": f"models/{EMBEDDING_MODEL}",
                        "content": {"parts": [{"text": t[:8000]}]},
                        "outputDimensionality": EMBEDDING_DIMS,
                    }
                    for t in texts
                ]
            },
            timeout=60,
        )
        resp.raise_for_status()
        return [e["values"] for e in resp.json()["embeddings"]]


class HashingEmbedding:
    """Deterministic feature-hashing embedder. Not semantic — good enough to demo
    retrieval and tests offline; swap for a real model by setting GOOGLE_API_KEY."""

    name = "hashing"

    def _one(self, text: str) -> list[float]:
        vec = [0.0] * EMBEDDING_DIMS
        tokens = "".join(c.lower() if c.isalnum() else " " for c in text).split()
        for tok in tokens:
            h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
            idx = h % EMBEDDING_DIMS
            sign = 1.0 if (h >> 64) & 1 else -1.0
            vec[idx] += sign * (1.0 if len(tok) > 3 else 0.5)
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._one(t) for t in texts]


def get_embedding_provider():
    if get_settings().google_api_key:
        return GeminiEmbedding()
    return HashingEmbedding()
