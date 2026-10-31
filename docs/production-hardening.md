# Production Hardening Checklist

Nexus Ops is a single-instance, on-premises application. This document records the
deployment decisions that are settled (the "design tree") and the concrete actions
required before the app is exposed to real users. It supplements the demo-boundary
notes in [README.md](../README.md) ("Demo boundaries") and [docs/design.md](design.md).

## 1. Deployment shape: single on-prem Docker host

**As built today:** the production target is a single on-prem Docker host running
the stack defined in [docker-compose.yml](../docker-compose.yml): PostgreSQL 17 with
pgvector (`pgvector/pgvector:pg17`), the backend, and n8n. Several components are
deliberately single-instance:

- The rate limiter in [backend/app/auth.py](../backend/app/auth.py) (`rate_limit`)
  is an in-process sliding window keyed on client IP. It works only when all
  requests hit one backend process — noted in the code as "good enough for
  single-instance demo; use Redis for a cluster."
- The LangGraph checkpointer in [backend/app/agents/graph.py](../backend/app/agents/graph.py)
  (`_postgres_saver`) holds one long-lived psycopg connection per process. The
  comment there flags this: "per-request saver if concurrent uploads ever contend
  on it."
- Model calls during upload are synchronous (see [README.md](../README.md)
  Troubleshooting: "Live model calls are synchronous"). A slow upload blocks the
  worker thread, which is acceptable at one instance.

**These are deliberate trade-offs, not defects.** Revisit them only when scaling
to multiple backend instances or a horizontally replicated deployment.

**Production actions:**

- [ ] Deploy on one Docker host as a single backend instance; do not run multiple
  replicas of the backend container behind a load balancer.
- [ ] Confirm the single-instance assumptions are still valid at deployment time
  (in-process limiter, one checkpoint connection, synchronous uploads). If moving
  past one instance, first replace the in-process limiter with Redis or a shared
  store, and make the checkpointer connection per-request or pooled.
- [ ] Add a health/readiness probe against the backend `/health` endpoint (see
  [README.md](../README.md)) so the orchestrator restarts a crashed backend.
- [ ] Keep the Docker host's resource limits (CPU, memory, disk) sized for the
  documented 10 MB upload limit and synchronous model-call latency.

## 2. Authentication hardening

**As built today:** [backend/app/auth.py](../backend/app/auth.py) implements
session-cookie auth (opaque token in the `nexus_session` cookie, stored in the
`sessions` table), PBKDF2-HMAC-SHA256 password hashing with 200,000 iterations and
per-user salt, and server-side RBAC through `require_role(*roles)`. The login
cookie is set in [backend/app/routers/auth.py](../backend/app/routers/auth.py) with
`httponly=True, samesite="lax"` — no `secure` flag, and no forced password rotation.

**Production actions:**

- [ ] Remove the pre-filled demo credentials from the login page.
  *(Frontend change, out of scope for this document — tracked as a follow-up
  item; see [frontend/components/landing/interactive-pipeline-demo.tsx](../frontend/components/landing/interactive-pipeline-demo.tsx)
  for the demo surface.)*
- [ ] Force first-login password rotation for seeded users: set `password_hash`
  to `None` (no login yet) for seeded accounts in [backend/app/seed.py](../backend/app/seed.py)
  and add a "must change password" gate on first login.
- [ ] Set the session cookie to `secure=True` and `samesite="strict"` in
  [backend/app/routers/auth.py](../backend/app/routers/auth.py) once TLS is
  terminated in front of the app (see §3). The `httponly` flag is already set.
- [ ] Remove the seeded demo users created by [backend/app/seed.py](../backend/app/seed.py)
  from production. The README already warns that the seed command "replaces
  existing application records" and must only run against a disposable demo
  database — enforce this so it is never run against production.
- [ ] Keep the PBKDF2 iteration count and the role model under periodic review,
  but do not change the mechanism (session-cookie + PBKDF2 + RBAC) — that is the
  settled design.

## 3. TLS termination

**As built today:** nothing in the stack terminates TLS. The backend and frontend
run plain HTTP internally, and the browser talks to the frontend over HTTP during
development.

**Production actions:**

- [ ] Add a reverse proxy (Caddy or nginx) as a docker-compose service on the
  production host. It terminates TLS for external traffic and proxies to the
  frontend and backend over plain HTTP on the internal Docker network.
- [ ] Do not add TLS to the backend or frontend containers themselves — the
  internal network is plain HTTP by design; termination happens only at the proxy.
- [ ] Redirect all HTTP-to-HTTPS traffic at the proxy, and enable HSTS.
- [ ] Update the frontend's allowed API origins (see [README.md](../README.md)
  Troubleshooting: "Both local frontend origins are allowed") to the production
  HTTPS origins.
- [ ] After TLS is live, flip the cookie flags per §2.

## 4. Secrets

**As built today:** [backend/app/config.py](../backend/app/config.py) loads all
configuration from environment/`.env` (`pydantic_settings`), including model API
keys, the n8n webhook URL, and `n8n_webhook_secret` (currently defaulting to
`nexus-dev-secret`). The n8n admin API key is used by [n8n_setup.ps1](../n8n_setup.ps1).

**Target state (applied):** the n8n API JWT is now read from the
`N8N_API_KEY` environment variable in [n8n_setup.ps1](../n8n_setup.ps1) —
no hardcoded API key remains in the repository.

**Production actions:**

- [ ] Provision `N8N_API_KEY` as an environment variable on the production host
  (in the deployment `.env`, never committed). Scripts that talk to the n8n admin
  API read it from the environment instead of embedding the token.
- [ ] Rotate `N8N_WEBHOOK_SECRET` away from the dev default `nexus-dev-secret`
  (see [backend/app/config.py](../backend/app/config.py)). Generate a strong random
  value per deployment; the HMAC signature in [backend/app/services/n8n.py](../backend/app/services/n8n.py)
  (`_sign`) and the n8n workflow's verification must both use the same value.
- [ ] Rotate `POSTGRES_PASSWORD` and `N8N_ENCRYPTION_KEY` away from the demo
  defaults in [docker-compose.yml](../docker-compose.yml) (`nexus`,
  `nexus-demo-encryption-key`) — supply them via environment variables.
- [ ] Ensure all secrets are supplied via environment variables or a `.env` file
  that is excluded from version control. Never commit a `.env`, a JWT, or an API
  key to the repository.
- [x] Remove hardcoded secret remnants from the repository — the JWT in
  [n8n_setup.ps1](../n8n_setup.ps1) was replaced by the `N8N_API_KEY`
  environment variable.
- [ ] Rotate model provider keys (NVIDIA, Google) on a schedule and store them
  only in the production host's `.env`.

## 5. Database and durability

**As built today:** PostgreSQL 17 with pgvector runs on the `pgdata` named Docker
volume ([docker-compose.yml](../docker-compose.yml)); n8n state is on `n8n_data`.
Uploaded files are retained on disk (`upload_dir: str = "uploads"` in
[backend/app/config.py](../backend/app/config.py); `file_path` on the `Document`
model in [backend/app/models.py](../backend/app/models.py)). There is no object
storage — that is out of scope at this scale. The LangGraph checkpointer creates
its tables via `setup_checkpointer()` at app startup
([backend/app/agents/graph.py](../backend/app/agents/graph.py)); those tables live
in the same Postgres database and are therefore included in a `pg_dump`.

**Production actions:**

- [ ] Schedule regular `pg_dump` backups of the production database. A single
  dump captures application tables, pgvector indexes' source data, and the LangGraph
  checkpoint tables created by `setup_checkpointer()`.
- [ ] Schedule backups of the upload file storage directory (`upload_dir`) on a
  backed-up volume so retained originals survive host failure. Restore from both
  backups together — a document row without its original file is not a complete
  restore.
- [ ] Also back up the `n8n_data` volume so n8n workflows and credentials survive.
- [ ] Test a restore from backup at least once before go-live; verify the
  checkpointer tables and the retained-file downloads work after restore.
- [ ] Do not add object storage (S3, MinIO) — out of scope at this scale. Revisit
  only if the deployment grows beyond one host.

## 6. Audit trail

**As built today:** audit events are written through the `audit()` helper in
[backend/app/models.py](../backend/app/models.py) into the `AuditEvent`
(`audit_events`) table, with entries for login, login failure, document lifecycle,
and workflow status (e.g., [backend/app/routers/auth.py](../backend/app/routers/auth.py),
[backend/app/agents/automation.py](../backend/app/agents/automation.py)). The
README notes the app "records audit events but does not enforce a write-once audit
database."

**Production actions:**

- [ ] Make the audit table append-only at the database level: revoke `UPDATE` and
  `DELETE` on `audit_events` for the application role in Postgres, so only
  `INSERT` (and `SELECT`) is permitted.
- [ ] Do not add a write-once external audit log (immutable log, WORM storage) —
  explicitly out of scope for this deployment.
- [ ] Verify that the audit trail still works end-to-end after the permission
  change (login, approval, webhook delivery, checkpoint restore events).


## 7. Test discipline

**As built today:** the backend suite (56 tests) is documented in
[README.md](../README.md) ("Verify changes") as:

```powershell
cd backend
uv run pytest -q
```

It runs against an isolated SQLite database with deterministic providers and does
not touch the running PostgreSQL instance.

**Known pitfall:** running the suite from the repository root fails with a
relative-import error, because the tests rely on `backend/` being the working
directory. A stale `pytest.log` at the repo root records exactly that failure —
it is not a real test result.

**Production actions:**

- [ ] Always run the backend suite with the documented command from `backend/`
  (`cd backend; uv run pytest -q`). Do not run pytest from the repo root.
- [ ] Delete the stale `pytest.log` at the repository root.
- [ ] Add pytest to CI, running the backend suite from `backend/` with the
  documented command, so regressions are caught before deployment.
- [ ] Run the frontend checks separately (`npm run lint -- --quiet`,
  `npm run build` in `frontend/`) per the README, but keep them out of this
  document's scope — they are frontend concerns.



## 8. Webhook contract

**As built today:** [backend/app/services/n8n.py](../backend/app/services/n8n.py)
fires one webhook event per workflow trigger and records every outcome in the
`WorkflowExecution` table ([backend/app/models.py](../backend/app/models.py)),
including mock mode (no webhook configured), HTTP errors, and transport failures.
The event body is HMAC-signed with `X-Nexus-Signature` using `n8n_webhook_secret`.
Authorized users can retry a failed delivery from the UI. **A retry may deliver
the same event again.** The README states this explicitly: "Webhook retries may
deliver an event again, so downstream workflows must handle duplicates."

**Production actions:**

- [ ] Treat the `WorkflowExecution` table as the delivery record of truth. Its
  `status` (`success` / `failed` / `mock`), `error`, `response`, and `finished_at`
  fields are the authoritative history of what was delivered and when.
- [ ] Enforce the idempotency contract on the downstream n8n workflows: they must
  be idempotent with respect to duplicate delivery of the same event (same
  `entity_type` / `entity_id` / workflow). Do not attempt to make retries
  exactly-once on the backend — that is not the design.
- [ ] Verify the HMAC signature check in the n8n workflow uses the rotated
  production secret (see §4) and the `text/plain` content type the backend sends
  ([backend/app/services/n8n.py](../backend/app/services/n8n.py), "text/plain so
  n8n's webhook passes the raw bytes through").
- [ ] When a workflow is marked `mock` in production, treat it as a
  configuration problem (missing `N8N_WEBHOOK_URL`), not a successful delivery.

## 9. Frontend demo boundary

**As built today:** the landing-page pipeline demo
([frontend/components/landing/interactive-pipeline-demo.tsx](../frontend/components/landing/interactive-pipeline-demo.tsx))
is a hardcoded, browser-only simulation. It uses predefined samples, runs without
a backend, and sends no uploads or webhooks — as stated in [README.md](../README.md)
("The landing page also has a **local simulation** … it uses predefined samples,
runs without a backend, and sends no uploads or webhooks").

**Production actions:**

- [ ] Keep the demo clearly distinguishable from the real workflow, per the
  [docs/design.md](design.md) mandate: it is a marketing/education artifact, not
  the application pipeline.
- [ ] No changes planned to the demo for production hardening. It must remain
  browser-only, stateless, and incapable of touching the real API or database.
- [ ] If any copy is added near the demo, reinforce that it is a simulation and
  that real workflows require signing in.
