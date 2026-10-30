export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: init.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch { /* non-JSON error body */ }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type User = { id: string; email: string; name: string; role: string; department: string };
export type DocumentRow = {
  id: string; filename: string; mime_type: string; size_bytes: number; status: string;
  doc_type: string; classification_confidence: number | null; department: string | null;
  uploaded_by: string; uploaded_at: string; uploader_name: string | null; project_name: string | null;
  missing_fields: string[]; latest_confidence: number | null;
};
export type DocumentDetailDto = DocumentRow & {
  text_content: string;
  extractions: { revision: number; data: Record<string, string | number | null>; missing_fields: string[]; confidence: number; created_by: string; created_at: string }[];
  reviewer_name: string | null;
};
export type TaskRow = {
  id: string; title: string; description: string; status: string; priority: string;
  department: string; document_id: string | null; project_id: string | null;
  due_date: string | null; assignee_name: string | null; created_at: string;
};
export type AuditRow = {
  id: string; actor_label: string; action: string; entity_type: string;
  entity_id: string | null; detail: Record<string, unknown>; created_at: string;
};
export type Analytics = {
  documents: { total: number; by_status: Record<string, number>; by_type: Record<string, number>; pending_review: number; straight_through_rate: number };
  tasks: { by_status: Record<string, number>; overdue: number };
  automation: { ai_processed: number; manual_corrections: number };
  time_saved_simulator: {
    disclaimer: string; manual_minutes: number; assisted_minutes: number;
    annual_volume: number; estimated_hours_saved: number; formula: string;
  };
};
