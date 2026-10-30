"""Text extraction for supported file types. PDFs via pypdf, DOCX via python-docx."""
import csv
import io

from docx import Document as Docx
from pypdf import PdfReader

ALLOWED_MIME = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/csv": "csv",
}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_upload(filename: str, mime_type: str, size: int) -> str | None:
    """Return an error message, or None if the upload is acceptable."""
    if mime_type not in ALLOWED_MIME:
        return f"Unsupported file type: {mime_type}. Allowed: PDF, DOCX, TXT, CSV."
    if size > MAX_SIZE_BYTES:
        return f"File too large ({size // 1024 // 1024} MB). Maximum is 10 MB."
    if not filename:
        return "Missing filename."
    return None


def extract_text(raw: bytes, mime_type: str) -> str:
    kind = ALLOWED_MIME.get(mime_type)
    if kind == "pdf":
        reader = PdfReader(io.BytesIO(raw))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if kind == "docx":
        doc = Docx(io.BytesIO(raw))
        return "\n".join(p.text for p in doc.paragraphs)
    if kind == "csv":
        rows = list(csv.reader(io.StringIO(raw.decode("utf-8", errors="replace"))))
        return "\n".join(",".join(row) for row in rows)
    return raw.decode("utf-8", errors="replace")
