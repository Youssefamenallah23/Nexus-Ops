"""Document processing pipeline: classify -> extract -> validate against per-type schemas."""
from datetime import date
import re

from pydantic import BaseModel, Field, ValidationError, field_validator

from .llm import DOC_TYPES, MockProvider, get_provider

# Which fields are mandatory for a document to be considered complete, per type.
REQUIRED_FIELDS = {
    "supplier_quote": ["supplier", "reference", "amount", "currency", "due_date"],
    "purchase_request": ["requester", "site", "amount", "currency"],
    "intervention_report": ["site", "requester", "summary"],
    "maintenance_report": ["site", "due_date", "summary"],
    "meeting_minutes": ["requester", "summary"],
    "other": [],
}

FIELD_LABELS = {
    "supplier": "Supplier",
    "reference": "Reference",
    "amount": "Amount",
    "currency": "Currency",
    "requester": "Requester",
    "site": "Site",
    "due_date": "Due date",
    "summary": "Summary",
}

AMOUNT_MAX = 10_000_000


class ExtractedFields(BaseModel):
    supplier: str | None = None
    reference: str | None = None
    amount: float | None = Field(default=None, ge=0, le=AMOUNT_MAX)
    currency: str | None = None
    requester: str | None = None
    site: str | None = None
    due_date: str | None = None  # YYYY-MM-DD
    summary: str | None = None
    confidence: float = Field(default=0.0, ge=0, le=1)

    @field_validator("supplier", "reference", "currency", "requester", "site", "due_date", "summary", mode="before")
    @classmethod
    def trim_text(cls, value):
        return value.strip() or None if isinstance(value, str) else value

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value):
        if value is not None and value.upper() not in ("EUR", "USD", "GBP"):
            raise ValueError("Currency must be EUR, USD, or GBP.")
        return value.upper() if value else None

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, value):
        if value is not None:
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
                raise ValueError("Use a date in YYYY-MM-DD format.")
            date.fromisoformat(value)
        return value

    def public(self) -> dict:
        return {k: v for k, v in self.model_dump().items() if k not in ("confidence",)}


class Classification(BaseModel):
    doc_type: str
    department: str = "Administration"
    priority: str = "medium"
    confidence: float = Field(default=0.0, ge=0, le=1)

    def validate_type(self) -> str:
        if self.doc_type not in DOC_TYPES:
            self.doc_type = "other"
            self.confidence = min(self.confidence, 0.3)
        return self.doc_type


def classify_document(text: str) -> dict:
    """Classify; validate LLM output before it ever touches the database."""
    raw = get_provider().classify(text)
    c = Classification(**raw)
    return c.model_dump() | {"doc_type": c.validate_type()}


def extract_fields(text: str, doc_type: str = "other", *, provider=None) -> dict:
    """Extract fields; coerce/validate, never trust the model's structure blindly."""
    raw = (provider or get_provider()).extract(text)
    try:
        f = ExtractedFields(**raw)
    except ValidationError as error:
        # Keep valid fields when one provider value fails validation.
        invalid = {issue["loc"][0] for issue in error.errors() if issue["loc"]}
        f = ExtractedFields(**{key: value for key, value in raw.items() if key not in invalid})
    data = f.public()
    missing = [k for k in REQUIRED_FIELDS.get(doc_type, []) if data.get(k) in (None, "")]
    return {"data": data, "missing_fields": missing, "confidence": f.confidence}


def _classify_and_extract(text: str) -> tuple[dict, dict]:
    """Run classification and extraction in parallel — the NVIDIA reasoning model is
    slow (~1-2min/call), so the two independent calls must not be sequential."""
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(max_workers=2) as pool:
        cls_f = pool.submit(classify_document, text)
        # doc_type for required-field computation arrives with the classification;
        # extraction itself is type-independent.
        ext_f = pool.submit(extract_fields, text, "other")
        return cls_f.result(), ext_f.result()


def process_document(text: str) -> dict:
    """Full AI pass over raw text: classification + validated extraction.
    Falls back to the deterministic mock provider if the real one fails/times out."""
    try:
        cls, ext = _classify_and_extract(text)
    except Exception:  # provider down, timeout, rate limit — keep the product usable
        fallback = MockProvider()
        cls = Classification(**fallback.classify(text)).model_dump()
        ext = extract_fields(text, cls["doc_type"], provider=fallback)
        ext["fallback"] = True
        cls["confidence"] = min(cls["confidence"], 0.6)  # degraded confidence
    ext = dict(ext)
    # missing fields depend on the classified type — recompute now that we know it
    ext["missing_fields"] = [
        k for k in REQUIRED_FIELDS.get(cls["doc_type"], []) if ext["data"].get(k) in (None, "")
    ]
    ext["classification"] = cls
    return ext
