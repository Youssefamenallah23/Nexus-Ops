"""LLM provider abstraction. Gemini first (REST, structured JSON output), deterministic mock fallback.

The mock provider keeps the whole product demoable with zero API keys — same
interface, heuristic outputs. Swap providers via settings; callers never know.
"""
import json
import re

import httpx

from ..config import get_settings

DOC_TYPES = [
    "supplier_quote",
    "purchase_request",
    "intervention_report",
    "maintenance_report",
    "meeting_minutes",
    "other",
]


def classify_prompt(text: str) -> str:
    return (
        "Classify this business document for an electrical infrastructure company. "
        f"Choose exactly one type from: {', '.join(DOC_TYPES)}. "
        "Return JSON: {\"doc_type\": str, \"department\": one of [Administration, Engineering, "
        "Project Management, Field Operations, Warehouse], \"priority\": low|medium|high, \"confidence\": 0.0-1.0}.\n\n"
        f"DOCUMENT (truncated):\n{text[:4000]}"
    )


def extract_prompt(text: str) -> str:
    return (
        "Extract structured fields from this business document. Use null for values not present. "
        "Return JSON with keys: supplier (str|null), reference (str|null), amount (float|null), "
        "currency (str|null, 3 letters), requester (str|null), site (str|null), due_date (YYYY-MM-DD|null), "
        "summary (str, max 2 sentences), confidence (0.0-1.0).\n\n"
        f"DOCUMENT (truncated):\n{text[:6000]}"
    )


def _parse_json_loose(content: str) -> dict:
    """Parse JSON out of an LLM reply, tolerating markdown fences and prose."""
    content = content.strip()
    if content.startswith("```"):
        content = content.split("```", 2)[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()
    start, end = content.find("{"), content.rfind("}")
    if start != -1 and end != -1:
        content = content[start : end + 1]
    return json.loads(content)


class NvidiaMistralProvider:
    """Mistral via NVIDIA's OpenAI-compatible API (integrate.api.nvidia.com).

    Same JSON contracts as Gemini; the model replies in prose+JSON, parsed loosely.
    """

    name = "mistral-nvidia"

    def __init__(self, api_key: str, base_url: str, model: str):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model

    def _chat(self, prompt: str) -> str:
        resp = httpx.post(
            f"{self.base_url}/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 4096,
                "temperature": 0.1,
                # Mistral Large 4 on NVIDIA is a reasoning model: without a low effort
                # it burns ~100s and thousands of tokens thinking before answering.
                "reasoning_effort": "low",
                "stream": False,
            },
            timeout=180,
        )
        resp.raise_for_status()
        data = resp.json()
        usage = data.get("usage", {})
        self.last_usage = {"in": usage.get("prompt_tokens"), "out": usage.get("completion_tokens")}
        return data["choices"][0]["message"]["content"]

    def classify(self, text: str) -> dict:
        return _parse_json_loose(self._chat(classify_prompt(text)))

    def extract(self, text: str) -> dict:
        return _parse_json_loose(self._chat(extract_prompt(text)))

    def complete(self, prompt: str) -> str:
        return self._chat(prompt).strip()


class GeminiProvider:
    name = "gemini"

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    def _generate(self, prompt: str) -> dict:
        resp = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            params={"key": self.api_key},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1},
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        usage = data.get("usageMetadata", {})
        self.last_usage = {"in": usage.get("promptTokenCount"), "out": usage.get("candidatesTokenCount")}
        return json.loads(data["candidates"][0]["content"]["parts"][0]["text"])

def _parse_amount(raw: str) -> float | None:
    """Parse '49,600.00' (US) and '4.200,00' (EU) money strings."""
    s = raw.replace(" ", "").rstrip(".")
    if not s.replace(",", "").replace(".", "").isdigit():
        return None
    if "." in s:                                    # decimal dot present
        s = s.replace(",", "")
    elif "," in s:
        whole, _, frac = s.partition(",")
        # comma followed by exactly 3 digits is a thousands separator, not a decimal
        s = whole.replace(".", "") + ("." + frac if len(frac) != 3 else frac)
    else:
        s = s.replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


class MockProvider:
    """Deterministic keyword/regex heuristics. No network, no key, stable for tests."""

    name = "mock"

    _TYPE_KEYWORDS = [
        ("supplier_quote", ["quote", "quotation", "devis", "supplier", "vendor", "unit price", "offer"]),
        ("purchase_request", ["purchase request", "purchase order", "buy", "order request", "procurement"]),
        ("intervention_report", ["intervention", "breakdown", "outage", "on-site", "repair", "incident"]),
        ("maintenance_report", ["maintenance", "preventive", "inspection", "servicing", "checklist"]),
        ("meeting_minutes", ["minutes", "attendees", "meeting", "agenda", "action items"]),
    ]
    _DEPT_BY_TYPE = {
        "supplier_quote": "Administration",
        "purchase_request": "Warehouse",
        "intervention_report": "Field Operations",
        "maintenance_report": "Field Operations",
        "meeting_minutes": "Project Management",
        "other": "Administration",
    }

    def classify(self, text: str) -> dict:
        text = text.lower()
        scores = {t: sum(1 for kw in kws if kw in text) for t, kws in self._TYPE_KEYWORDS}
        best = max(scores, key=scores.get)
        doc_type = best if scores[best] > 0 else "other"
        confidence = min(0.55 + 0.12 * scores[best], 0.95) if doc_type != "other" else 0.4
        priority = "high" if any(w in text for w in ["urgent", "asap", "immediately", "critical"]) else "medium"
        return {
            "doc_type": doc_type,
            "department": self._DEPT_BY_TYPE[doc_type],
            "priority": priority,
            "confidence": round(confidence, 2),
        }

    def extract(self, text: str) -> dict:
        text = text.lower()
        fields = {k: None for k in ["supplier", "reference", "amount", "currency", "requester", "site", "due_date"]}
        m = re.search(r"(?:supplier|vendor)\s*[:\-]\s*([^\n,;.]{2,60})", text)
        if not m:
            m = re.search(r"(?:from|by)\s+([a-zà-ÿ0-9 .&'\-]{2,60}?)(?:\.|,|\n)", text)
        fields["supplier"] = m.group(1).strip().title() if m else None
        m = re.search(r"(?:ref(?:erence)?|quote|devis|n°)[\s:.#]*([A-Z0-9][A-Z0-9\-/]{3,20})",
                      text.upper(), re.I)
        fields["reference"] = m.group(1) if m else None
        m = re.search(r"(?:total|amount|montant|sum)[\s:]*€?\s*([\d\s.,]+)\s*(eur|€|usd|\$)?", text)
        if m:
            fields["amount"] = _parse_amount(m.group(1))
            fields["currency"] = {"€": "EUR", "eur": "EUR", "$": "USD", "usd": "USD"}.get(m.group(2))
        m = re.search(r"(?:requester|requested by|contact)[:\s]+([a-zà-ÿ.\- ]{3,40})", text)
        fields["requester"] = m.group(1).strip().title() if m else None
        m = re.search(r"(?:site|location|client)[:\s]+([a-zà-ÿ0-9 .\-']{3,50})", text)
        fields["site"] = m.group(1).strip().title() if m else None
        m = re.search(r"(\d{4}-\d{2}-\d{2})", text)
        fields["due_date"] = m.group(1) if m else None
        found = sum(1 for v in fields.values() if v is not None)
        fields["summary"] = f"Extracted {found}/7 core fields with deterministic mock extraction."
        fields["confidence"] = round(0.35 + 0.09 * found, 2)
        return fields


def get_provider():
    s = get_settings()
    if s.nvidia_api_key:
        return NvidiaMistralProvider(s.nvidia_api_key, s.nvidia_base_url, s.nvidia_model)
    if s.google_api_key:
        return GeminiProvider(s.google_api_key, s.gemini_model)
    return MockProvider()


    def classify(self, text: str) -> dict:
        return self._generate(classify_prompt(text))

    def extract(self, text: str) -> dict:
        return self._generate(extract_prompt(text))

    def complete(self, prompt: str) -> str:
        # Gemini structured-JSON mode; ask for plain prose and read the string out.
        raw = self._generate(
            "Reply with JSON: {\"text\": \"<your answer>\"}.\n\n" + prompt
        )
        return str(raw.get("text") or raw).strip()
