# NEXUS OPS â€” AI Workflow & Operations Hub

<p align="center">
  <em>Repetitive operations, processed by agents. Approved by humans.</em>
</p>

NEXUS OPS is a production-minded internal platform that turns repetitive business
documents â€” supplier quotes, purchase requests, intervention and maintenance
reports, meeting minutes â€” into classified, validated, automatically routed
workflows. A multi-agent pipeline does the reading; a human approves every
consequential action; automation executes what was approved.

**Everything in this repository uses synthetic data.** Nothing represents any real
company, and simulated business numbers are always labeled as simulated.

---

## What actually happens when you upload a document

```mermaid
flowchart LR
    A[Upload<br/>PDF DOCX TXT CSV] --> S{Supervisor<br/>plans the run}
    S -->|normal document| C[Classification Agent<br/>Mistral Large 4 / Gemini]
    S -->|tiny document| Q
    C --> I[Document Intelligence Agent<br/>structured fields + confidence]
    I --> Q[QA Agent<br/>deterministic consistency checks]
    Q --> H[[CHECKPOINT<br/>Postgres]]
    H -->|human reviews:<br/>edit / approve / reject| AU[Automation Agent]
    AU --> N8N[n8n webhook<br/>HMAC-signed]
    AU --> T[Task routed to<br/>department]
    AU --> K[RAG ingestion<br/>384-dim vectors]
```

The pipeline is a **LangGraph state machine**. State is checkpointed to Postgres
after every agent step. The graph **interrupts before the Automation Agent** â€”
the human approval gate. When a manager approves, the graph *resumes from the
exact saved state*: the Automation Agent creates the routed task and fires a
signed n8n webhook. This is a real interrupt/resume human-in-the-loop pattern,
not a metaphor.

### What each agent does

| Agent | Type | Responsibility |
|---|---|---|
| **Supervisor** | deterministic rules | Plans the run: which agents run, which checks matter, whether the document is too small to extract |
| **Classification Agent** | LLM (Mistral Large 4 / Gemini / mock) | Document type, owning department, priority, confidence |
| **Document Intelligence Agent** | LLM | Extracts supplier, reference, amount, currency, requester, site, due date, summary â€” validated through Pydantic before storage |
| **QA Agent** | deterministic + confidence gate | Amount ranges, currency codes, ISO dates, past-due detection, missing required fields per type; flags documents below the review threshold |
| **Automation Agent** | n8n + business rules | Creates the routed task, fires the HMAC-signed webhook, closes the human gate |
| **Knowledge Agent** | RAG | Answers questions strictly from approved documents, with citations, role-filtered retrieval |

Every agent invocation is recorded in the **Agent Observatory**: provider, model,
input summary, structured output, latency, tokens in/out, confidence, and status
(`ok` / `fallback` / `error`). The observatory also runs a live **provider
evaluation** â€” every configured provider classifies the same sample documents so
agreement, confidence and latency can be compared side by side.

---

## System architecture

```mermaid
flowchart TB
    subgraph Frontend["Next.js 16 - TypeScript - Tailwind 4 - shadcn/ui"]
        UI[Landing page<br/>+ 9-page dashboard]
    end
    subgraph Backend["FastAPI - Python - SQLAlchemy"]
        API[REST API<br/>auth, documents, tasks,<br/>analytics, audit, copilot,<br/>workflows, observatory]
        LG[LangGraph pipeline<br/>Postgres checkpointer]
        LLMW[LLM provider layer<br/>NVIDIA Mistral L4 -> Gemini -> mock]
        EMB[Embedding layer<br/>fastembed bge-small -> Gemini -> hashing]
        RAG[RAG retrieval<br/>role-filtered, cited]
        N8NC[n8n client<br/>HMAC-signed emissions]
        AUTH[Auth<br/>PBKDF2 passwords, sessions, RBAC]
        RL[Rate limiting<br/>per-IP sliding window]
    end
    subgraph Data["PostgreSQL 17"]
        PG[(pgvector<br/>+ Alembic schema)]
    end
    subgraph Automation["n8n in Docker"]
        WF[Webhook -> verify signature<br/>-> format notification]
    end

    UI -->|session cookie| API
    API --> LG --> PG
    LG --> LLMW
    LG --> EMB --> PG
    API --> RAG --> PG
    API --> N8NC -->|text/plain + X-Nexus-Signature| WF
    WF -->|structured response| N8NC
    API --> PG
    AUTH --> PG
```

### LLM provider chain

Providers are interchangeable behind one interface. Selection is automatic by
which API keys exist:

1. **NVIDIA Mistral Large 4** (`mistralai/mistral-large-4-1t-a52b`) â€” reasoning
   model; configured with `reasoning_effort: low`, 4k token budget, and
   classification + extraction run **in parallel** to hide latency.
2. **Gemini** (`gemini-3.5-flash-lite`) â€” structured JSON output.
3. **Deterministic mock** â€” keyword/regex heuristics, zero network: keeps the
   demo alive offline and makes the test suite deterministic.

If a live provider times out, the pipeline **falls back to the mock, flags
degraded confidence, and records the fallback in the observatory** â€” the product
keeps working and the degradation is visible, never hidden.

### RAG knowledge copilot

```mermaid
flowchart LR
    D[Approved documents] -->|chunk 800c/120o| E[Embed<br/>bge-small 384-dim]
    E --> V[(pgvector)]
    Q[Employee question] --> QE[Embed query]
    QE --> S{Role filter<br/>BEFORE retrieval}
    V --> S
    S --> H[Top-k excerpts]
    H --> G[LLM answer<br/>strictly from excerpts]
    G --> A[Answer + citations<br/>filename, excerpt, score]
    G -->|insufficient evidence| N[Refuses:<br/>documents do not support]
```

Role-based access is applied **before** retrieval: administrators and managers
see everything; employees see only their department's documents. When retrieval
is weak, the copilot says the documents do not support an answer instead of
improvising.


---

## Data model

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : "has"
    USERS ||--o{ DOCUMENTS : uploads
    PROJECTS ||--o{ DOCUMENTS : groups
    DOCUMENTS ||--o{ EXTRACTIONS : "revisions, AI + human"
    DOCUMENTS ||--o{ TASKS : "generates on approval"
    DOCUMENTS ||--o{ CHUNKS : "embedded for RAG"
    USERS ||--o{ TASKS : assigned
    USERS ||--o{ AUDIT_EVENTS : acts
    DOCUMENTS ||--o{ AGENT_TRACES : traced
    DOCUMENTS ||--o{ WORKFLOW_EXECUTIONS : emits
```

Key tables: `documents` (status machine: uploaded -> needs_review ->
approved/rejected, original file path retained), `extractions` (append-only
revisions â€” AI suggestion and human corrections both preserved), `tasks`
(pending_review -> approved -> in_progress -> blocked -> completed),
`chunks` (pgvector 384-dim), `workflow_executions` (every automation emission:
payload, response, error, attempt count), `agent_traces` (observatory),
`audit_events` (append-only, every human and AI action).

Schema is owned by **Alembic**; `alembic upgrade head` runs automatically at
backend startup on Postgres.


---

## Governance, security & honest numbers

- **Passwords**: PBKDF2-HMAC-SHA256, 200k iterations, per-user salt, timing-safe
  comparison. Failed logins are audited.
- **RBAC**: three roles (administrator, manager, employee) enforced **server-side**
  on every consequential endpoint â€” approve/reject, retries, reminders, evaluation.
- **Rate limiting**: per-IP sliding window on login (8/min) and upload (15/min);
  floods get `429` and a test proves it.
- **Audit trail**: append-only `audit_events` for logins, uploads, views, edits,
  approvals, rejections, workflow outcomes, downloads.
- **File retention**: original upload bytes stored on disk per document, served
  only to authenticated users, downloads audited.
- **Webhook security**: every n8n emission is HMAC-SHA256-signed
  (`X-Nexus-Signature`); the n8n workflow verifies the signature over the raw
  bytes (timing-safe) and marks tampered payloads `signature_valid: false`.
- **Secrets**: API keys live only in `.env` (gitignored); nothing is hardcoded.
- **Honest numbers**: the time-saved simulator publishes its formula and
  assumptions, and labels itself simulated everywhere it appears. Fallbacks and
  mock executions are labeled, never disguised.

## The interface

The app is designed as a **control room** for an electrical-infrastructure
operations team:

- **Midnight black** (`#02070A`) with a faint circuit-grid texture.
- **Voltage blue** (`#0297DE`) = the machine working: AI data, primary actions.
- **Fault orange** (`#FC734D`) = the human checkpoint: missing fields, approvals, overdue.
- **Type**: Space Grotesk (display) / IBM Plex Sans (body) / IBM Plex Mono (data).
- A public **landing page** with a three.js hero (the living operations grid), an
  animated diagram of the real agent pipeline, and the time-saved business case
  plotted with recharts.
- Dashboard: Overview, Documents (side-by-side review), AI Copilot, Agent
  Observatory, Workflows, Tasks, Analytics, Audit Logs.


## Quick start

Prerequisites: Docker, Python 3.12+ with [uv](https://docs.astral.sh/uv/), Node 20+.

```bash
docker compose up -d                                   # Postgres 17 + pgvector, n8n
cp .env.example .env                                   # add keys, or run fully offline in mock mode
cd backend && uv sync
uv run python -m app.seed                              # 22 synthetic documents, users, projects, tasks
uv run uvicorn app.main:app --port 8000                # API + docs at :8000/docs
cd ../frontend && npm install && npm run dev           # landing + app at :3000
```

Demo accounts (password `demo1234` for all): `admin@nexus.test`,
`manager@nexus.test`, `employee@nexus.test`. Only administrators and managers can
approve, reject, retry workflows or send reminders.

## 2-minute demo walkthrough

1. Open the landing page, click **Open the hub**, sign in as `admin@nexus.test`.
2. **Documents -> Upload** a TXT or PDF. The agents run (Mistral ~80s; the toast
   shows the detected type and confidence).
3. Open the document: extracted fields beside the original text, QA issues
   highlighted. Correct a field and **Save corrections** â€” a new human revision is
   created, the AI revision preserved. Download the original file from the header.
4. **Approve & create task**: the checkpointed graph resumes, the Automation Agent
   routes a task to the right department, the signed webhook fires, n8n verifies
   the signature and responds.
5. **Workflows** shows the execution with n8n's response (`signature_valid: true`).
   **Audit Logs** shows every step. **Agent Observatory** shows the traces:
   provider, model, tokens, latency, confidence per agent â€” and can run a live
   provider evaluation.
6. **Analytics**: drag the time-saved simulator. Assumptions are labeled simulated.
7. **AI Copilot**: ask "What happened on panel R14?" â€” a cited answer from approved
   documents only.


## Testing

```bash
cd backend && uv run pytest        # 35 tests, deterministic, no network, no Docker
```

Coverage: classification + extraction validation, RAG chunking / retrieval /
role filtering / refusals, permissions (RBAC 403s), workflow emission and
retries, rate limiting, password auth, file retention, time-saved math, and the
full multi-agent graph (traces, interrupt, resume). Tests run on in-memory
SQLite with the deterministic providers â€” no model downloads, no API keys.

## Honest limitations

- **Mistral Large 4 on NVIDIA's free endpoint is slow** (45sâ€“3min per call);
  classification and extraction run in parallel and fall back to the mock on
  timeout, but the wait is real. Set `NVIDIA_API_KEY=` empty for instant mock
  demos, or use a Gemini key for the fast path.
- Rate limiting is in-process (single instance); a cluster would need Redis.
- Seeded demo documents have no original file on disk â€” the download endpoint
  says so rather than pretending.
- Passwords are seeded with a documented demo password; rotate before real use.

## Roadmap ideas

- Settings page surfacing provider config, routing rules and webhook status.
- Dockerfiles for backend + frontend for a one-command full-stack deployment.
- AI flow visualization on the document detail page (the trace chain per document).
- Streaming responses for the copilot; background task queue for uploads.


