// Single typed client. Mock mode hits Next route handlers at /api/*;
// live mode hits the FastAPI base URL. Paths are identical in both.

import type {
  Conversation,
  Customer,
  Lead,
  OverviewMetrics,
  PipelineTrace,
  SalesAnalytics,
  SupportAnalytics,
  Template,
  Ticket,
  Workflow,
  WorkflowRun,
} from "@/lib/types";

const MODE = process.env.NEXT_PUBLIC_API_MODE ?? "mock";
const LIVE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const BASE = MODE === "live" ? LIVE_URL : "/api";
export const API_MODE = MODE;

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, message: string, detail = "") {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch (e) {
    throw new ApiError(0, "Network unreachable", String(e));
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? body.error ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, `Request failed (${res.status})`, detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  overview: () => req<OverviewMetrics>("/overview"),
  customers: () => req<Customer[]>("/customers"),

  support: {
    conversations: () => req<Conversation[]>("/support/conversations"),
    analytics: () => req<SupportAnalytics>("/support/analytics"),
    send: (body: { conversationId?: string; customerId?: string; text: string; channel?: string }) =>
      req<{ trace: PipelineTrace; reply: string; conversationId: string }>("/support/messages", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  whatsapp: {
    conversations: () => req<Conversation[]>("/whatsapp/conversations"),
    templates: () => req<Template[]>("/whatsapp/templates"),
    send: (body: { conversationId?: string; customerId?: string; text: string }) =>
      req<{ trace: PipelineTrace; reply: string; conversationId: string }>("/whatsapp/messages", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  tickets: () => req<Ticket[]>("/tickets"),

  sales: {
    leads: () => req<Lead[]>("/sales/leads"),
    analytics: () => req<SalesAnalytics>("/sales/analytics"),
    rescore: (id: string) => req<Lead>(`/sales/leads/${id}/rescore`, { method: "POST" }),
  },

  automation: {
    workflows: () => req<Workflow[]>("/automation/workflows"),
    runs: () => req<WorkflowRun[]>("/automation/runs"),
    toggle: (id: string) => req<Workflow>(`/automation/workflows/${id}/toggle`, { method: "POST" }),
    approve: (id: string, decision: "approve" | "reject") =>
      req<WorkflowRun>(`/automation/runs/${id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      }),
  },

  pipeline: {
    trace: (text: string) =>
      req<PipelineTrace>("/pipeline/trace", { method: "POST", body: JSON.stringify({ text }) }),
  },
};

// Streaming AI reply via SSE. Returns a cancel function.
export function streamReply(
  params: { text: string; name?: string },
  handlers: { onToken: (t: string) => void; onTrace?: (t: PipelineTrace) => void; onDone: () => void; onError?: (e: string) => void }
): () => void {
  const qs = new URLSearchParams({ text: params.text, name: params.name ?? "there" });
  const url = `${BASE}/support/stream?${qs.toString()}`;
  const es = new EventSource(url);
  es.addEventListener("trace", (ev) => {
    try {
      handlers.onTrace?.(JSON.parse((ev as MessageEvent).data));
    } catch {
      /* ignore */
    }
  });
  es.addEventListener("token", (ev) => {
    try {
      handlers.onToken(JSON.parse((ev as MessageEvent).data));
    } catch {
      handlers.onToken((ev as MessageEvent).data);
    }
  });
  es.addEventListener("done", () => {
    handlers.onDone();
    es.close();
  });
  es.onerror = () => {
    handlers.onError?.("stream interrupted");
    es.close();
  };
  return () => es.close();
}
