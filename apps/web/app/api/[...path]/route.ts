// Mock-mode API. A single dispatcher mirrors the FastAPI contract so the
// web app runs with zero backend (NEXT_PUBLIC_API_MODE=mock, the default).
import { NextRequest, NextResponse } from "next/server";
import {
  getStore,
  buildTrace,
  generateReply,
  scoreLead,
  suggestFollowUp,
} from "@/lib/mock/engine";
import { overviewMetrics, supportAnalytics, salesAnalytics } from "@/lib/mock/analytics";
import type { Message } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
const err = (status: number, error: string, detail = "") =>
  NextResponse.json({ error, detail }, { status });

function nowIso() {
  return new Date().toISOString();
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  const p = ctx.params.path.join("/");
  const s = getStore();

  switch (p) {
    case "overview":
      return json(overviewMetrics());
    case "customers":
      return json(s.customers);
    case "support/conversations":
      return json(s.support);
    case "support/analytics":
      return json(supportAnalytics());
    case "whatsapp/conversations":
      return json(s.whatsapp);
    case "whatsapp/templates":
      return json(s.templates);
    case "tickets":
      return json(s.tickets);
    case "sales/leads":
      return json(s.leads);
    case "sales/analytics":
      return json(salesAnalytics());
    case "automation/workflows":
      return json(s.workflows);
    case "automation/runs":
      return json(s.runs);
    case "support/stream":
      return streamReply(req);
    default:
      return err(404, "Not found", `No GET route for /${p}`);
  }
}

export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  const p = ctx.params.path.join("/");
  const s = getStore();
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* some POSTs have no body */
  }

  // ---- pipeline trace ----
  if (p === "pipeline/trace") {
    const text = String(body.text ?? "").trim();
    if (!text) return err(422, "Validation error", "text is required");
    return json(buildTrace(text));
  }

  // ---- send message (support / whatsapp) ----
  if (p === "support/messages" || p === "whatsapp/messages") {
    const text = String(body.text ?? "").trim();
    if (!text) return err(422, "Validation error", "Message text cannot be empty");
    if (text.length > 2000) return err(422, "Validation error", "Message exceeds 2000 characters");
    const list = p.startsWith("support") ? s.support : s.whatsapp;
    const convId = String(body.conversationId ?? list[0]?.id ?? "");
    const conv = list.find((c) => c.id === convId);
    const customer = conv ? s.customers.find((x) => x.id === conv.customerId) : s.customers[0];
    const trace = buildTrace(text);
    const reply = generateReply(trace.intent, customer?.name ?? "there", text);
    if (conv) {
      const customerMsg: Message = {
        id: `${conv.id}_u${conv.messages.length + 1}`,
        conversationId: conv.id,
        role: "customer",
        text,
        createdAt: nowIso(),
        intent: trace.intent,
        confidence: trace.confidence,
      };
      const aiMsg: Message = {
        id: `${conv.id}_a${conv.messages.length + 2}`,
        conversationId: conv.id,
        role: "ai",
        text: reply,
        createdAt: nowIso(),
      };
      conv.messages.push(customerMsg, aiMsg);
      conv.lastMessageAt = nowIso();
      conv.intent = trace.intent;
      conv.sentiment = trace.sentiment;
      if (trace.route === "human_handoff") conv.status = "handoff";
    }
    return json({ trace, reply, conversationId: convId });
  }

  // ---- rescore a lead ----
  if (p.startsWith("sales/leads/") && p.endsWith("/rescore")) {
    const id = p.split("/")[2];
    const lead = s.leads.find((l) => l.id === id);
    if (!lead) return err(404, "Not found", `Lead ${id} not found`);
    const tierValue = lead.categories.includes("Enterprise-fit") ? 3 : 1;
    const engagement = Math.random(); // simulate fresh engagement signals
    const { score, band, rationale } = scoreLead({
      tierValue,
      engagement,
      recencyDays: 0,
      source: lead.source,
      value: lead.value,
    });
    lead.score = score;
    lead.band = band;
    lead.rationale = rationale;
    lead.followUp = suggestFollowUp(lead.stage, band, lead.company);
    lead.lastTouch = nowIso();
    return json(lead);
  }

  // ---- toggle a workflow ----
  if (p.startsWith("automation/workflows/") && p.endsWith("/toggle")) {
    const id = p.split("/")[2];
    const wf = s.workflows.find((w) => w.id === id);
    if (!wf) return err(404, "Not found", `Workflow ${id} not found`);
    wf.enabled = !wf.enabled;
    return json(wf);
  }

  // ---- approve / reject a run ----
  if (p.startsWith("automation/runs/") && p.endsWith("/decision")) {
    const id = p.split("/")[2];
    const run = s.runs.find((r) => r.id === id);
    if (!run) return err(404, "Not found", `Run ${id} not found`);
    const decision = String(body.decision ?? "");
    if (decision !== "approve" && decision !== "reject")
      return err(422, "Validation error", "decision must be 'approve' or 'reject'");
    if (decision === "approve") {
      run.status = "success";
      run.steps = run.steps.map((st) => ({ ...st, status: st.status === "pending" ? "done" : st.status }));
    } else {
      run.status = "failed";
      run.steps = run.steps.map((st) => ({ ...st, status: st.status === "pending" ? "skipped" : st.status }));
    }
    return json(run);
  }

  return err(404, "Not found", `No POST route for /${p}`);
}

// ---- SSE token stream for AI replies ----
function streamReply(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text") ?? "";
  const name = req.nextUrl.searchParams.get("name") ?? "there";
  if (!text.trim()) return err(422, "Validation error", "text is required");
  const trace = buildTrace(text);
  const reply = generateReply(trace.intent, name, text);
  const tokens = reply.split(/(\s+)/); // keep whitespace tokens

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: trace\ndata: ${JSON.stringify(trace)}\n\n`));
      for (const tok of tokens) {
        controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify(tok)}\n\n`));
        await new Promise((r) => setTimeout(r, 22));
      }
      controller.enqueue(encoder.encode(`event: done\ndata: end\n\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
