// Deterministic synthetic data + mock AI heuristics for Nexus AI.
// Everything is hash-seeded so demos and screenshots are reproducible.

import type {
  Channel,
  Conversation,
  ConversationStatus,
  Customer,
  Intent,
  Lead,
  LeadStage,
  Message,
  PipelineTrace,
  RunStatus,
  ScoreBand,
  Sentiment,
  Template,
  Ticket,
  Workflow,
  WorkflowRun,
} from "@/lib/types";

// ---------- seeded RNG (mulberry32) ----------
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const pick = <T>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];

// Fixed "now" so timestamps are stable across runs. 2026-11-01T14:20:00Z.
const NOW = Date.parse("2026-11-01T14:20:00Z");
const minsAgo = (m: number) => new Date(NOW - m * 60000).toISOString();
const daysAgo = (d: number) => new Date(NOW - d * 86400000).toISOString();
const inDays = (d: number) => new Date(NOW + d * 86400000).toISOString();

// ---------- pools ----------
const FIRST = ["Amara", "Diego", "Priya", "Noah", "Lina", "Mateo", "Sofia", "Kenji", "Hana", "Omar", "Elena", "Theo", "Yara", "Ivan", "Chloe", "Raj", "Nina", "Felix", "Zara", "Luca"];
const LAST = ["Okafor", "Reyes", "Sharma", "Bennett", "Haas", "Rossi", "Cruz", "Tanaka", "Kim", "Nasser", "Petrova", "Lindqvist", "Haddad", "Novak", "Dubois", "Mehta", "Andersen", "Moreau", "Costa", "Ferraro"];
const COMPANIES = ["Northwind Logistics", "Lumen Retail", "Vertex Health", "Orbit Fintech", "Cedar Foods", "Helio Energy", "Atlas Freight", "Brightwave Media", "Ironclad Security", "Pinecone Labs", "Solstice Travel", "Bluefin Analytics", "Maple & Co", "Quanta Devices", "Riverstone Bank"];
const REGIONS = ["NA-East", "NA-West", "EMEA", "APAC", "LATAM"];
const TIERS = ["SMB", "Mid-Market", "Enterprise"] as const;
const AGENTS = ["Dana Whitfield", "Marcus Lee", "Priyanka Rao", "Tomás Herrera"];
const SOURCES = ["Website", "Webinar", "Outbound", "Referral", "Trade Show", "Content", "Partner"];

const INTENTS: Intent[] = ["billing", "technical_issue", "refund_request", "product_question", "complaint", "feature_request", "sales_inquiry", "account_access", "shipping"];

export const INTENT_LABEL: Record<Intent, string> = {
  billing: "Billing",
  technical_issue: "Technical Issue",
  refund_request: "Refund Request",
  product_question: "Product Question",
  complaint: "Complaint",
  feature_request: "Feature Request",
  sales_inquiry: "Sales Inquiry",
  account_access: "Account Access",
  shipping: "Shipping",
};

// ---------- mock AI: intent classification ----------
const INTENT_KEYWORDS: Record<Intent, string[]> = {
  billing: ["invoice", "charge", "billing", "payment", "card", "subscription", "overcharged", "receipt"],
  technical_issue: ["error", "bug", "broken", "crash", "not working", "fails", "500", "timeout", "login loop"],
  refund_request: ["refund", "money back", "cancel order", "return my", "reimburse"],
  product_question: ["how do i", "can i", "does it", "feature", "support for", "integrate", "setup"],
  complaint: ["terrible", "awful", "unacceptable", "angry", "worst", "disappointed", "frustrated", "ridiculous"],
  feature_request: ["would be great", "please add", "wish", "feature request", "roadmap", "could you add"],
  sales_inquiry: ["pricing", "quote", "upgrade", "enterprise plan", "demo", "talk to sales", "seats"],
  account_access: ["locked out", "reset password", "can't log in", "cant login", "2fa", "access", "sso"],
  shipping: ["shipping", "delivery", "tracking", "where is my order", "arrived", "delayed package"],
};

export function classifyIntent(text: string): { intent: Intent; confidence: number } {
  const t = text.toLowerCase();
  let best: Intent = "product_question";
  let bestHits = 0;
  for (const intent of INTENTS) {
    const hits = INTENT_KEYWORDS[intent].reduce((n, kw) => (t.includes(kw) ? n + 1 : n), 0);
    if (hits > bestHits) {
      bestHits = hits;
      best = intent;
    }
  }
  const confidence = bestHits === 0 ? 0.42 : Math.min(0.98, 0.6 + bestHits * 0.14);
  return { intent: best, confidence: Number(confidence.toFixed(2)) };
}

export function detectSentiment(text: string): Sentiment {
  const t = text.toLowerCase();
  const neg = ["terrible", "awful", "angry", "worst", "disappointed", "frustrated", "unacceptable", "broken", "ridiculous", "refund", "cancel"];
  const pos = ["thanks", "great", "love", "awesome", "perfect", "appreciate", "excellent", "happy"];
  const n = neg.filter((w) => t.includes(w)).length;
  const p = pos.filter((w) => t.includes(w)).length;
  if (n > p) return "negative";
  if (p > n) return "positive";
  return "neutral";
}

// ---------- mock AI: business-context retrieval (RAG-lite) ----------
const KB: Record<Intent, { title: string; snippet: string }[]> = {
  billing: [
    { title: "Billing cycle policy", snippet: "Invoices generate on the 1st; proration applies on mid-cycle plan changes." },
    { title: "Refund SLA", snippet: "Billing adjustments are processed within 3–5 business days to the original method." },
  ],
  technical_issue: [
    { title: "Incident runbook", snippet: "Check status.nexus.example for active incidents before escalating a P2." },
    { title: "Login loop fix", snippet: "Clearing the session cookie resolves 90% of auth-loop reports." },
  ],
  refund_request: [
    { title: "Refund eligibility", snippet: "Orders within 30 days qualify for a full refund; digital goods are case-by-case." },
    { title: "Escalation rule", snippet: "Refunds over $500 require supervisor approval before issuance." },
  ],
  product_question: [
    { title: "Integrations guide", snippet: "Nexus connects to Salesforce, HubSpot and Slack via native connectors." },
    { title: "Onboarding checklist", snippet: "New workspaces complete setup in ~15 minutes with the guided flow." },
  ],
  complaint: [
    { title: "De-escalation guide", snippet: "Acknowledge, apologize, and offer a concrete next step within the first reply." },
    { title: "Churn-risk playbook", snippet: "Negative sentiment from Enterprise accounts triggers a CSM alert." },
  ],
  feature_request: [
    { title: "Roadmap intake", snippet: "Feature requests are logged to the product board and tagged by account tier." },
  ],
  sales_inquiry: [
    { title: "Plan comparison", snippet: "Enterprise adds SSO, audit logs, and a 99.9% uptime SLA." },
    { title: "Routing rule", snippet: "Inbound sales from Mid-Market+ route to an AE within 5 minutes." },
  ],
  account_access: [
    { title: "Password reset", snippet: "Send a secure reset link; links expire after 30 minutes." },
    { title: "SSO troubleshooting", snippet: "Verify the IdP metadata URL and clock skew under 60s." },
  ],
  shipping: [
    { title: "Tracking lookup", snippet: "Tracking IDs sync from the carrier within 2 hours of dispatch." },
  ],
};

export function retrieveContext(intent: Intent, seed: number) {
  const r = rng(seed);
  return KB[intent].map((e) => ({ ...e, score: Number((0.72 + r() * 0.26).toFixed(2)) })).sort((a, b) => b.score - a.score);
}

// ---------- mock AI: reply generation ----------
export function generateReply(intent: Intent, customerName: string, text: string): string {
  const first = customerName.split(" ")[0];
  const map: Record<Intent, string> = {
    billing: `Hi ${first}, I can help with that billing question. I'm pulling up your most recent invoice now — charges post on the 1st and any mid-cycle plan change is prorated. If something looks off, I can open a billing adjustment that resolves in 3–5 business days.`,
    technical_issue: `Thanks for flagging this, ${first}. I checked our status page and there's no active incident. For login or session errors, clearing the session cookie resolves most cases — want me to walk you through it, or should I open a priority ticket for engineering?`,
    refund_request: `I understand, ${first}, and I'm sorry for the hassle. Orders within 30 days qualify for a full refund to your original payment method. I've started the request; because of the amount, a supervisor will confirm it shortly.`,
    product_question: `Great question, ${first}. Nexus supports that — we offer native connectors for Salesforce, HubSpot and Slack, and most workspaces finish setup in about 15 minutes with the guided flow. Would you like the step-by-step guide?`,
    complaint: `I hear you, ${first}, and I'm genuinely sorry about this experience. Let me make it right: I've escalated your account to a specialist and flagged it as a priority. You'll hear back within the hour with a concrete resolution.`,
    feature_request: `Love this idea, ${first} — thank you. I've logged it to our product roadmap and tagged it to your account so our team can follow up. I'll note it as a request from an ${"Enterprise"} workspace to help prioritization.`,
    sales_inquiry: `Happy to help, ${first}. Our Enterprise plan adds SSO, audit logs and a 99.9% uptime SLA. Based on your workspace size I'd recommend a quick call with an account executive — I can route you to one within the next few minutes.`,
    account_access: `Let's get you back in, ${first}. I can send a secure password reset link (valid for 30 minutes). If you use SSO, I'll verify your identity provider settings. Which would you prefer?`,
    shipping: `Thanks ${first} — let me track that down. Tracking details sync from the carrier within two hours of dispatch. I can see your latest shipment and will share the live tracking link right now.`,
  };
  return map[intent];
}

export function routeDecision(intent: Intent, sentiment: Sentiment, confidence: number): PipelineTrace["route"] {
  if (intent === "complaint" || (intent === "refund_request" && sentiment === "negative")) return "human_handoff";
  if (confidence < 0.55 || intent === "technical_issue" || intent === "billing") return "ticket_created";
  return "auto_reply";
}

export function buildTrace(text: string): PipelineTrace {
  const { intent, confidence } = classifyIntent(text);
  const sentiment = detectSentiment(text);
  const retrievedContext = retrieveContext(intent, hash(text));
  return {
    intent,
    confidence,
    sentiment,
    retrievedContext,
    route: routeDecision(intent, sentiment, confidence),
    latencyMs: 220 + (hash(text) % 400),
    model: "nexus-mock-adapter-v1",
  };
}

// ---------- mock AI: lead scoring ----------
export function scoreLead(input: {
  tierValue: number; // 0..3
  engagement: number; // 0..1
  recencyDays: number;
  source: string;
  value: number;
}): { score: number; band: ScoreBand; rationale: string[] } {
  const rationale: string[] = [];
  let s = 0;
  const tierPts = input.tierValue * 14;
  s += tierPts;
  rationale.push(`Account tier contributes +${tierPts} (firmographic fit)`);
  const engPts = Math.round(input.engagement * 30);
  s += engPts;
  rationale.push(`Engagement signals +${engPts} (email opens, site visits, demo views)`);
  const recPts = Math.max(0, 20 - Math.round(input.recencyDays * 1.5));
  s += recPts;
  rationale.push(`Recency +${recPts} (last touch ${input.recencyDays}d ago)`);
  const srcPts = ["Referral", "Partner", "Website"].includes(input.source) ? 12 : 5;
  s += srcPts;
  rationale.push(`Source "${input.source}" +${srcPts} (channel quality)`);
  const valPts = input.value > 60000 ? 14 : input.value > 25000 ? 9 : 4;
  s += valPts;
  rationale.push(`Deal size +${valPts} (est. ACV $${input.value.toLocaleString()})`);
  const score = Math.max(1, Math.min(99, Math.round(s)));
  const band: ScoreBand = score >= 70 ? "hot" : score >= 45 ? "warm" : "cold";
  return { score, band, rationale };
}

export function suggestFollowUp(stage: LeadStage, band: ScoreBand, company: string): string {
  if (band === "hot" && (stage === "new" || stage === "qualified"))
    return `Book an executive demo with ${company} this week — strong fit + high intent. Lead with the SSO/audit story.`;
  if (stage === "proposal") return `Send a tailored ROI one-pager and propose a 14-day pilot to de-risk the decision.`;
  if (stage === "negotiation") return `Offer annual-commit pricing with a usage ramp; loop in a CSM to show onboarding velocity.`;
  if (band === "cold") return `Enroll in a low-touch nurture sequence; re-score after the next webinar touch.`;
  return `Share a relevant case study from the same industry and propose a 20-minute discovery call.`;
}

// ================= STORE =================
// Built once; mock API routes read/mutate this in-memory singleton.

function buildCustomers(): Customer[] {
  const r = rng(1001);
  return Array.from({ length: 24 }, (_, i) => {
    const name = `${pick(r, FIRST)} ${pick(r, LAST)}`;
    const company = pick(r, COMPANIES);
    return {
      id: `cus_${1000 + i}`,
      name,
      company,
      email: `${name.toLowerCase().replace(/[^a-z]/g, ".")}@${company.toLowerCase().replace(/[^a-z]/g, "")}.example`,
      tier: pick(r, TIERS as unknown as string[]) as Customer["tier"],
      region: pick(r, REGIONS),
      seed: hash(name),
    };
  });
}

const SAMPLE_OPENERS: Record<Intent, string> = {
  billing: "Hi, I was charged twice on my latest invoice and need this corrected.",
  technical_issue: "The dashboard keeps throwing a 500 error when I try to export reports.",
  refund_request: "I'd like a refund for last month — we never managed to use the product.",
  product_question: "Does Nexus integrate with Salesforce, and how long does setup take?",
  complaint: "This is unacceptable — the third outage this week and no updates. Frustrated.",
  feature_request: "It would be great if you could add bulk CSV import for contacts.",
  sales_inquiry: "We're evaluating upgrading to Enterprise for 120 seats — can I get pricing?",
  account_access: "I'm locked out of my account and the password reset email never arrives.",
  shipping: "Where is my order? The tracking hasn't updated in four days.",
};

function buildConversations(customers: Customer[], channel: Channel): Conversation[] {
  const r = rng(channel === "support" ? 2001 : 2002);
  const n = channel === "support" ? 14 : 10;
  return Array.from({ length: n }, (_, i) => {
    const cust = pick(r, customers);
    const intent = pick(r, INTENTS);
    const opener = SAMPLE_OPENERS[intent];
    const trace = buildTrace(opener);
    const createdMins = 30 + Math.floor(r() * 2000);
    const statusRoll = r();
    const status: ConversationStatus =
      trace.route === "human_handoff" ? "handoff" : statusRoll > 0.75 ? "resolved" : statusRoll > 0.5 ? "waiting" : "active";
    const convId = `${channel === "support" ? "cnv" : "wa"}_${3000 + (channel === "support" ? 0 : 100) + i}`;
    const messages: Message[] = [
      {
        id: `${convId}_m1`,
        conversationId: convId,
        role: "customer",
        text: opener,
        createdAt: minsAgo(createdMins),
        intent: trace.intent,
        confidence: trace.confidence,
      },
      {
        id: `${convId}_m2`,
        conversationId: convId,
        role: "ai",
        text: generateReply(trace.intent, cust.name, opener),
        createdAt: minsAgo(createdMins - 1),
      },
    ];
    if (status === "handoff") {
      messages.push({
        id: `${convId}_m3`,
        conversationId: convId,
        role: "system",
        text: `Escalated to ${pick(r, AGENTS)} — negative sentiment on ${INTENT_LABEL[intent]}.`,
        createdAt: minsAgo(createdMins - 2),
      });
    }
    return {
      id: convId,
      channel,
      customerId: cust.id,
      status,
      intent,
      sentiment: trace.sentiment,
      createdAt: minsAgo(createdMins),
      lastMessageAt: minsAgo(createdMins - 2),
      assignedAgent: status === "handoff" ? pick(r, AGENTS) : undefined,
      unread: status === "active" ? Math.floor(r() * 3) : 0,
      messages,
    };
  }).sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt));
}

function buildTickets(convs: Conversation[], customers: Customer[]): Ticket[] {
  const r = rng(4001);
  return convs
    .filter((c) => ["technical_issue", "billing", "refund_request", "account_access"].includes(c.intent))
    .map((c, i) => {
      const priority: Ticket["priority"] =
        c.sentiment === "negative" ? "urgent" : c.intent === "technical_issue" ? "high" : r() > 0.5 ? "medium" : "low";
      const status: Ticket["status"] = c.status === "resolved" ? "resolved" : c.status === "handoff" ? "escalated" : r() > 0.5 ? "open" : "pending";
      return {
        id: `tkt_${5000 + i}`,
        conversationId: c.id,
        customerId: c.customerId,
        subject: `${INTENT_LABEL[c.intent]} — ${customers.find((x) => x.id === c.customerId)?.company}`,
        category: c.intent,
        priority,
        status,
        createdAt: c.createdAt,
        slaDueAt: inDays(priority === "urgent" ? 0 : priority === "high" ? 1 : 2),
        assignedAgent: c.assignedAgent ?? (status !== "open" ? pick(r, AGENTS) : undefined),
      };
    });
}

function buildLeads(): Lead[] {
  const r = rng(6001);
  const stages: LeadStage[] = ["new", "qualified", "proposal", "negotiation", "won", "lost"];
  return Array.from({ length: 28 }, (_, i) => {
    const name = `${pick(r, FIRST)} ${pick(r, LAST)}`;
    const company = pick(r, COMPANIES);
    const stage = pick(r, stages);
    const tierValue = Math.floor(r() * 4);
    const source = pick(r, SOURCES);
    const value = 8000 + Math.floor(r() * 90000);
    const recencyDays = Math.floor(r() * 14);
    const engagement = r();
    const { score, band, rationale } = scoreLead({ tierValue, engagement, recencyDays, source, value });
    const categories = [
      tierValue >= 2 ? "Enterprise-fit" : "SMB",
      engagement > 0.6 ? "High-intent" : "Nurture",
      source,
    ];
    return {
      id: `led_${7000 + i}`,
      name,
      company,
      email: `${name.toLowerCase().replace(/[^a-z]/g, ".")}@${company.toLowerCase().replace(/[^a-z]/g, "")}.example`,
      source,
      stage,
      score,
      band,
      value,
      owner: pick(r, AGENTS),
      lastTouch: daysAgo(recencyDays),
      categories,
      rationale,
      followUp: suggestFollowUp(stage, band, company),
      createdAt: daysAgo(recencyDays + Math.floor(r() * 30)),
    };
  }).sort((a, b) => b.score - a.score);
}

function buildWorkflows(): Workflow[] {
  return [
    { id: "wf_1", name: "Auto-triage inbound support", description: "Classify intent, retrieve context, auto-reply or create ticket.", trigger: "On new support message", enabled: true, category: "support", successRate: 0.97, runsToday: 142, avgDurationMs: 640, lastRun: minsAgo(3) },
    { id: "wf_2", name: "WhatsApp first response", description: "Draft an AI reply for inbound WhatsApp and send if confidence > 0.7.", trigger: "On new WhatsApp message", enabled: true, category: "whatsapp", successRate: 0.94, runsToday: 88, avgDurationMs: 710, lastRun: minsAgo(1) },
    { id: "wf_3", name: "Lead scoring & routing", description: "Score new leads and route hot leads to an AE within 5 minutes.", trigger: "On new lead", enabled: true, category: "sales", successRate: 0.99, runsToday: 37, avgDurationMs: 420, lastRun: minsAgo(9) },
    { id: "wf_4", name: "Refund approval gate", description: "Pause refunds over $500 for human approval before issuing.", trigger: "On refund request", enabled: true, category: "ops", successRate: 1.0, runsToday: 6, avgDurationMs: 1200, lastRun: minsAgo(22) },
    { id: "wf_5", name: "Churn-risk CSM alert", description: "Notify a CSM when an Enterprise account shows negative sentiment.", trigger: "On negative sentiment", enabled: false, category: "support", successRate: 0.9, runsToday: 0, avgDurationMs: 300, lastRun: daysAgo(1) },
    { id: "wf_6", name: "Nightly analytics rollup", description: "Aggregate conversation + pipeline metrics into dashboards.", trigger: "Daily 02:00 UTC", enabled: true, category: "ops", successRate: 0.98, runsToday: 1, avgDurationMs: 5400, lastRun: minsAgo(740) },
  ];
}

function buildRuns(workflows: Workflow[]): WorkflowRun[] {
  const r = rng(8001);
  const runs: WorkflowRun[] = [];
  let id = 9000;
  for (const wf of workflows) {
    const count = 4 + Math.floor(r() * 4);
    for (let i = 0; i < count; i++) {
      const roll = r();
      const needsApproval = wf.id === "wf_4";
      const status: RunStatus = needsApproval && i === 0 ? "pending_approval" : roll > 0.9 ? "failed" : i === 0 && roll > 0.6 ? "running" : "success";
      const steps: WorkflowRun["steps"] = [
        { name: "Ingest", status: "done" },
        { name: "Classify intent", status: "done", detail: "confidence 0.91" },
        { name: "Retrieve context", status: "done", detail: "2 docs" },
        { name: "Generate action", status: status === "running" ? "running" : status === "failed" ? "failed" : "done" },
        { name: needsApproval ? "Human approval" : "Execute", status: status === "pending_approval" ? "pending" : status === "running" ? "pending" : status === "failed" ? "skipped" : "done" },
      ];
      runs.push({
        id: `run_${id++}`,
        workflowId: wf.id,
        status,
        startedAt: minsAgo(i * 17 + Math.floor(r() * 10)),
        durationMs: wf.avgDurationMs + Math.floor((r() - 0.5) * 300),
        trigger: wf.trigger,
        steps,
        requiresApproval: needsApproval,
      });
    }
  }
  return runs.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

function buildTemplates(): Template[] {
  return [
    { id: "tpl_1", name: "Order status", channel: "whatsapp", category: "Shipping", body: "Hi {{name}}! Your order {{order_id}} is on the way 🚚. Live tracking: {{tracking_url}}", usageCount: 1240 },
    { id: "tpl_2", name: "Payment reminder", channel: "whatsapp", category: "Billing", body: "Hi {{name}}, a quick reminder that invoice {{invoice_id}} is due on {{due_date}}. Reply PAY to settle instantly.", usageCount: 870 },
    { id: "tpl_3", name: "Appointment confirm", channel: "whatsapp", category: "Scheduling", body: "Hi {{name}}, confirming your appointment on {{date}} at {{time}}. Reply C to confirm or R to reschedule.", usageCount: 655 },
    { id: "tpl_4", name: "CSAT follow-up", channel: "whatsapp", category: "Support", body: "Thanks for contacting us, {{name}}! How did we do? Rate 1–5 ⭐ so we can keep improving.", usageCount: 2110 },
    { id: "tpl_5", name: "Refund confirmation", channel: "whatsapp", category: "Billing", body: "Hi {{name}}, your refund of {{amount}} is approved and will reach your account in 3–5 business days.", usageCount: 318 },
  ];
}

// Singleton store (per server process)
export interface Store {
  customers: Customer[];
  support: Conversation[];
  whatsapp: Conversation[];
  tickets: Ticket[];
  leads: Lead[];
  workflows: Workflow[];
  runs: WorkflowRun[];
  templates: Template[];
}

let _store: Store | null = null;
export function getStore(): Store {
  if (_store) return _store;
  const customers = buildCustomers();
  const support = buildConversations(customers, "support");
  const whatsapp = buildConversations(customers, "whatsapp");
  const tickets = buildTickets([...support, ...whatsapp], customers);
  const workflows = buildWorkflows();
  _store = {
    customers,
    support,
    whatsapp,
    tickets,
    leads: buildLeads(),
    workflows,
    runs: buildRuns(workflows),
    templates: buildTemplates(),
  };
  return _store;
}

export { hash, NOW, minsAgo, daysAgo, inDays };
