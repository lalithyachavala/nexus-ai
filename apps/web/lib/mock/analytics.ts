import type {
  OverviewMetrics,
  SalesAnalytics,
  SupportAnalytics,
  TimePoint,
  SeriesPoint,
} from "@/lib/types";
import { getStore, rng, INTENT_LABEL } from "@/lib/mock/engine";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function last14Labels(): string[] {
  // Deterministic labels ending "today" (fixed NOW = 2026-11-01, a Sunday).
  const out: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.parse("2026-11-01T00:00:00Z") - i * 86400000);
    out.push(`${d.getUTCMonth() + 1}/${d.getUTCDate()}`);
  }
  return out;
}

export function supportAnalytics(): SupportAnalytics {
  const s = getStore();
  const r = rng(31001);
  const volumeByDay: SeriesPoint[] = last14Labels().map((label) => {
    const total = 60 + Math.floor(r() * 90);
    const ai = Math.floor(total * (0.68 + r() * 0.12));
    return { label, ai, agent: total - ai };
  });
  const counts: Record<string, number> = {};
  for (const c of s.support) counts[c.intent] = (counts[c.intent] ?? 0) + 1;
  const intentBreakdown: TimePoint[] = Object.entries(counts)
    .map(([k, v]) => ({ label: INTENT_LABEL[k as keyof typeof INTENT_LABEL] ?? k, value: v }))
    .sort((a, b) => b.value - a.value);
  const csatTrend: TimePoint[] = Array.from({ length: 8 }, (_, i) => ({
    label: `W${i + 1}`,
    value: Number((4.3 + r() * 0.5).toFixed(2)),
  }));
  const resolved = s.support.filter((c) => c.status === "resolved").length;
  const handoff = s.support.filter((c) => c.status === "handoff").length;
  return {
    volumeByDay,
    intentBreakdown,
    csat: 4.6,
    csatTrend,
    avgFirstResponseSec: 38,
    autoResolutionRate: Number((resolved / s.support.length).toFixed(2)),
    handoffRate: Number((handoff / s.support.length).toFixed(2)),
    openTickets: s.tickets.filter((t) => t.status !== "resolved").length,
  };
}

export function salesAnalytics(): SalesAnalytics {
  const s = getStore();
  const r = rng(32001);
  const stages = ["new", "qualified", "proposal", "negotiation", "won", "lost"] as const;
  const pipelineByStage: TimePoint[] = stages.map((st) => ({
    label: st[0].toUpperCase() + st.slice(1),
    value: s.leads.filter((l) => l.stage === st).length,
  }));
  const conversionTrend: SeriesPoint[] = Array.from({ length: 8 }, (_, i) => {
    const created = 18 + Math.floor(r() * 16);
    return { label: `W${i + 1}`, created, won: Math.floor(created * (0.18 + r() * 0.12)) };
  });
  const open = s.leads.filter((l) => l.stage !== "won" && l.stage !== "lost");
  const won = s.leads.filter((l) => l.stage === "won");
  const bands = { hot: 0, warm: 0, cold: 0 };
  for (const l of s.leads) bands[l.band]++;
  return {
    pipelineByStage,
    conversionTrend,
    pipelineValue: open.reduce((a, l) => a + l.value, 0),
    winRate: Number((won.length / s.leads.length).toFixed(2)),
    avgDealSize: Math.round(s.leads.reduce((a, l) => a + l.value, 0) / s.leads.length),
    bandBreakdown: [
      { label: "Hot", value: bands.hot },
      { label: "Warm", value: bands.warm },
      { label: "Cold", value: bands.cold },
    ],
  };
}

export function overviewMetrics(): OverviewMetrics {
  const s = getStore();
  const r = rng(33001);
  const messagesTrend: SeriesPoint[] = last14Labels().map((label) => ({
    label,
    support: 40 + Math.floor(r() * 70),
    whatsapp: 25 + Math.floor(r() * 55),
  }));
  const open = s.leads.filter((l) => l.stage !== "won" && l.stage !== "lost");
  return {
    conversationsToday: s.support.length + s.whatsapp.length,
    autoResolutionRate: 0.82,
    activeLeads: open.length,
    pipelineValue: open.reduce((a, l) => a + l.value, 0),
    workflowRunsToday: s.workflows.reduce((a, w) => a + w.runsToday, 0),
    pendingApprovals: s.runs.filter((x) => x.status === "pending_approval").length,
    csat: 4.6,
    messagesTrend,
    channelSplit: [
      { label: "Support", value: s.support.length },
      { label: "WhatsApp", value: s.whatsapp.length },
    ],
  };
}
