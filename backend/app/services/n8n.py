"""n8n webhook client. Emits signed events and records every outcome.

No webhook configured, n8n unreachable, or non-2xx -> the execution is still
recorded (mock/failed), so the demo keeps working and failures stay visible.
Never raises.
"""
import hashlib
import hmac
import json
from datetime import datetime, timezone

import httpx

from ..config import get_settings
from ..models import WorkflowExecution, audit


def _sign(body: bytes) -> str:
    secret = get_settings().n8n_webhook_secret.encode()
    return hmac.new(secret, body, hashlib.sha256).hexdigest()


def emit(db, *, workflow_type: str, entity_type: str, entity_id: str | None,
         payload: dict, actor=None) -> WorkflowExecution:
    """Fire one webhook event and persist the outcome."""
    exec_row = WorkflowExecution(
        workflow_type=workflow_type, entity_type=entity_type, entity_id=entity_id, payload=payload
    )
    db.add(exec_row)
    db.flush()

    url = get_settings().n8n_webhook_url
    if not url:
        exec_row.status = "mock"
        exec_row.error = "No webhook configured — mock mode (n8n not connected)."
        exec_row.finished_at = datetime.now(timezone.utc)
    else:
        body = json.dumps({"workflow": workflow_type, "entity_type": entity_type,
                           "entity_id": entity_id, **payload}).encode()
        try:
            resp = httpx.post(url, content=body,
                              headers={
                                  "Content-Type": "application/json",
                                  "X-Nexus-Signature": _sign(body),
                              }, timeout=15)
            if 200 <= resp.status_code < 300:
                exec_row.status = "success"
                try:
                    exec_row.response = resp.json()
                except Exception:
                    exec_row.response = {"raw": resp.text[:2000]}
            else:
                exec_row.status = "failed"
                exec_row.error = f"HTTP {resp.status_code}: {resp.text[:500]}"
            exec_row.finished_at = datetime.now(timezone.utc)
        except Exception as e:
            exec_row.status = "failed"
            exec_row.error = f"{type(e).__name__}: {e}"
            exec_row.finished_at = datetime.now(timezone.utc)

    audit(db, actor=actor, actor_label=f"workflow:{workflow_type}", action=f"workflow.{exec_row.status}",
          entity_type="workflow_execution", entity_id=exec_row.id,
          detail={"workflow_type": workflow_type, "status": exec_row.status})
    db.commit()
    return exec_row
