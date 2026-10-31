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

    def _chat(self, prompt: str, *, timeout: float = 180, max_tokens: int = 4096) -> str:
        resp = httpx.post(
            f"{self.base_url}/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": 0.1,
                # Mistral Large 4 on NVIDIA is a reasoning model: without a low effort
                # it burns ~100s and thousands of tokens thinking before answering.
                "reasoning_effort": "low",
                "stream": False,
            },
            timeout=timeout,
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
        # Interactive answers have a shorter budget than document intake.
        return self._chat(prompt, timeout=30, max_tokens=768).strip()


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

    def classify(self, text: str) -> dict:
        return self._generate(classify_prompt(text))

    def extract(self, text: str) -> dict:
        return self._generate(extract_prompt(text))

    def complete(self, prompt: str) -> str:
        raw = self._generate("Reply with JSON: {\"text\": \"<your answer>\"}.\n\n" + prompt)
        return str(raw.get("text") or raw).strip()

def _parse_amount(raw: str) -> float | None:
    """Parse '49,600.00' (US) and '4.200,00' (EU) money strings."""
    s = "".join(raw.split()).rstrip(".")
    if not s.replace(",", "").replace(".", "").isdigit():
        return None
    if "." in s and "," in s:
        s = s.replace(".", "").replace(",", ".") if s.rfind(",") > s.rfind(".") else s.replace(",", "")
    elif "," in s:
        groups = s.split(",")
        s = "".join(groups) if all(len(group) == 3 for group in groups[1:]) else s.replace(",", ".")
    elif s.count(".") > 1:
        groups = s.split(".")
        if not all(len(group) == 3 for group in groups[1:]):
            return None
        s = "".join(groups)
    try:
        return float(s)
    except ValueError:
        return None


class MockProvider:
    """Deterministic keyword/regex heuristics. No network, no key, stable for tests."""

    name = "mock"

    # Bilingual (EN/FR) keyword scoring — keeps the mock usable for French demos.
    _TYPE_KEYWORDS = [
        ("supplier_quote", ["quote", "quotation", "devis", "supplier", "vendor", "unit price", "offer",
                            "fournisseur", "offre de prix"]),
        ("purchase_request", ["purchase request", "purchase order", "buy", "order request", "procurement",
                              "demande d'achat", "bon de commande", "approvisionnement"]),
        ("intervention_report", ["intervention", "breakdown", "outage", "on-site", "repair", "incident",
                                 "panne", "dépannage", "sur site", "rapport d'intervention"]),
        ("maintenance_report", ["maintenance", "preventive", "inspection", "servicing", "checklist",
                                "entretien", "maintenance préventive", "visite"]),
        ("meeting_minutes", ["minutes", "attendees", "meeting", "agenda", "action items",
                             "réunion", "compte rendu", "participants", "ordre du jour", "points d'action"]),
    ]
    _PRIORITY_WORDS = ["urgent", "asap", "immediately", "critical",
                       "prioritaire", "critique", "immédiat", "urgence"]
    _DEPT_BY_TYPE = {
        "supplier_quote": "Administration",
        "purchase_request": "Warehouse",
        "intervention_report": "Field Operations",
        "maintenance_report": "Field Operations",
        "meeting_minutes": "Project Management",
        "other": "Administration",
    }

    def classify(self, text: str) -> dict:
        text = text.lower().replace("\u2019", "'")  # French typographic apostrophe
        scores = {t: sum(1 for kw in kws if kw in text) for t, kws in self._TYPE_KEYWORDS}
        best = max(scores, key=scores.get)
        doc_type = best if scores[best] > 0 else "other"
        confidence = min(0.55 + 0.12 * scores[best], 0.95) if doc_type != "other" else 0.4
        priority = "high" if any(w in text for w in self._PRIORITY_WORDS) else "medium"
        return {
            "doc_type": doc_type,
            "department": self._DEPT_BY_TYPE[doc_type],
            "priority": priority,
            "confidence": round(confidence, 2),
        }

    def extract(self, text: str) -> dict:
        text = text.lower().replace("\u2019", "'")
        fields = {k: None for k in ["supplier", "reference", "amount", "currency", "requester", "site", "due_date"]}
        m = re.search(r"(?:supplier|vendor|fournisseur)\s*[:\-]\s*([^\n,;.]{2,60})", text)
        if not m:
            m = re.search(r"(?:from|by)\s+([a-zà-ÿ0-9 .&'\-]{2,60}?)(?:\.|,|\n)", text)
        fields["supplier"] = m.group(1).strip().title() if m else None
        refs = re.findall(r"(?:ref(?:erence)?|quote|référence|devis|n°|réf)[\s:.#]*([A-Z0-9][A-Z0-9\-/]{3,20})",
                          text.upper(), re.I)
        # a real reference id always contains a digit — prefer those, but fall back
        # to the first match (original behavior) when the greedy label bridge eats it
        fields["reference"] = next((r for r in refs if any(ch.isdigit() for ch in r)),
                                   refs[0] if refs else None)
        m = re.search(r"(?:total|amount|montant|sum)[\s:]*€?\s*(\d[\d\s.,]*\d|\d)\s*(euros|eur|€|usd|\$)?", text)
        if m:
            fields["amount"] = _parse_amount(m.group(1))
            fields["currency"] = {"€": "EUR", "eur": "EUR", "euros": "EUR", "$": "USD", "usd": "USD"}.get(m.group(2))
        m = re.search(r"(?:requester|requested by|contact|demandeur)[:\s]+([a-zà-ÿ.\- ]{3,40})", text)
        fields["requester"] = m.group(1).strip().title() if m else None
        m = re.search(r"(?:site|location|client|chantier|lieu)[:\s]+([a-zà-ÿ0-9 .\-']{3,50})", text)
        fields["site"] = m.group(1).strip().title() if m else None
        m = re.search(r"(?:livraison|delivery|échéance|due)[^\n]{0,30}?(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})", text)
        if not m:
            m = re.search(r"(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})", text)
        if m:
            raw_date = m.group(1)
            if "/" in raw_date:  # French DD/MM/YYYY → ISO YYYY-MM-DD
                day, month, year = raw_date.split("/")
                raw_date = f"{year}-{month}-{day}"
            fields["due_date"] = raw_date
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
