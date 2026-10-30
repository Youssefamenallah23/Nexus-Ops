"""Shared pipeline state flowing through the agent graph."""
from typing import TypedDict


class PipelineState(TypedDict, total=False):
    document_id: str
    filename: str
    text: str
    classification: dict          # {doc_type, department, priority, confidence}
    extraction: dict              # {data, missing_fields, confidence}
    qa_issues: list[str]          # problems found by the QA agent
    qa_ok: bool
    supervisor_note: str
    fallback_used: bool
