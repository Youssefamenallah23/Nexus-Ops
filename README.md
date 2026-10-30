# NEXUS OPS — AI Workflow & Operations Hub

A production-minded internal platform that turns repetitive business documents into
automated, traceable workflows — with a human approving every consequential action.

**All data is synthetic.** Nothing comes from, or represents, any real company.

## What it does today (Milestone 1 — vertical slice)

Upload a document → text extraction → AI classification (type, department, priority,
confidence) → structured field extraction with validation → missing-field detection →
**human review** (edit / approve / reject) → automatic task creation via routing rules →
audit event for every step → live analytics including a time-saved simulator.

Planned next: RAG copilot with citations (Milestone 3), n8n workflow execution (Milestone 4),
multi-agent LangGraph orchestration (Milestone 5).

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js App Router, TypeScript, Tailwind, shadcn/ui |
| Backend | Python FastAPI, Pydantic, SQLAlchemy |
| Database | PostgreSQL + pgvector (Docker) |
| AI | Gemini `gemini-3.5-flash-lite` via a swappable provider interface, deterministic mock fallback |
| Automation | n8n (running in Docker, wired in Milestone 4) |

## Quick start

Prerequisites: Docker, Python 3.12+ with [uv](https://docs.astral.sh/uv/), Node 20+.

```bash
# 1. Infrastructure (Postgres + pgvector, n8n)
docker compose up -d

# 2. Environment
cp .env.example .env        # add GOOGLE_API_KEY to enable real Gemini; empty = mock provider

# 3. Backend
cd backend
uv sync
uv run python -m app.seed   # 22 synthetic documents, users, projects, tasks
uv run uvicorn app.main:app --port 8000   # API at http://localhost:8000/docs

# 4. Frontend (new terminal)
cd frontend
npm install
npm run dev                 # UI at http://localhost:3000
```

## Demo accounts (seeded, no password)

| Email | Role |
|---|---|
| admin@nexus.test | administrator |
| manager@nexus.test | manager |
| employee@nexus.test | employee |

Only administrators and managers can approve or reject documents (server-side enforced).

## 2-minute demo walkthrough

1. Sign in as `admin@nexus.test`.
2. **Documents → Upload document** → pick a TXT/PDF. The API classifies it and extracts
   fields; the toast shows the detected type and confidence.
3. Open the document: extracted fields sit beside the original text. Missing required
   fields are highlighted in red. Correct a field and **Save corrections** — the AI
   revision is preserved and a new human revision is created.
4. **Approve & create task** → a task is routed to the owning department, and the audit
   trail records your decision.
5. **Tasks** shows the new task; **Audit Logs** shows every AI and human action.
6. **Analytics** → the Time Saved Simulator: drag the volume slider and read the
   assumptions. *These are simulated assumptions, not measured results.*

## Engineering notes

- **Provider abstraction**: `backend/app/services/llm.py` defines the provider interface;
  `GeminiProvider` (structured JSON output) and `MockProvider` (deterministic heuristics,
  no network) are interchangeable. The mock keeps the demo fully functional offline and
  makes the test suite deterministic.
- **Validation**: every LLM output passes a Pydantic schema before storage; invalid or
  partial outputs are salvaged field-by-field rather than dropped.
- **Human in the loop**: consequential actions (approve → task creation) require a
  manager/administrator session; the API rejects employees with 403.
- **Auditability**: `audit_events` records uploads, AI classifications, edits, approvals,
  rejections and task transitions with actor and detail.
- **Tests**: `cd backend && uv run pytest` — classification, extraction validation,
  permissions, workflow execution and time-saving math (SQLite in-memory, no Docker needed).

## API

Interactive docs at http://localhost:8000/docs. Main routes: `/auth`, `/documents`,
`/tasks`, `/analytics/overview`, `/audit-events`.
