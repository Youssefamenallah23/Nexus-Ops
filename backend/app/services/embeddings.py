"""Embedding providers. Default: fastembed (BAAI/bge-small-en-v1.5, 384-dim, ONNX on CPU).
Gemini text-embedding-004 also emits 384 dims (Matryoshka), so pgvector stays one size.
A deterministic hashing embedder remains for tests (EMBEDDING_PROVIDER=test)."""
import hashlib
import math

import httpx

from ..config import get_settings

EMBEDDING_DIMS = 384
EMBEDDING_MODEL = "text-embedding-004"


class GeminiEmbedding:
    name = "gemini"
    model = EMBEDDING_MODEL

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


class FastEmbedProvider:
    """Local semantic embeddings via ONNX (bge-small-en-v1.5). Free, private, no torch."""

    name = "fastembed"
    model = "BAAI/bge-small-en-v1.5"

    def __init__(self):
        from fastembed import TextEmbedding

        # ponytail: one process-wide model instance; load once, reuse
        self._model = TextEmbedding(model_name=self.model)

    def embed(self, texts: list[str]) -> list[list[float]]:
        vectors = [v.tolist() for v in self._model.embed(texts, batch_size=16)]
        return vectors


class HashingEmbedding:
    """Deterministic feature-hashing embedder for the test suite — NOT semantic.
    Selected only when EMBEDDING_PROVIDER=test so CI never downloads a model."""

    name = "hashing"
    model = "hashing-v1"

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
    if get_settings().embedding_provider == "test":
        return HashingEmbedding()
    if get_settings().google_api_key:
        return GeminiEmbedding()
    return FastEmbedProvider()

