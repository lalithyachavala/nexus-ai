"use client";
import { Card, CardHeader, Badge, Skeleton } from "@/components/ui/primitives";
import { IntentBadge, SentimentBadge } from "@/components/ui/badges";
import type { PipelineTrace } from "@/lib/types";
import { Cpu, Database, GitBranch, Zap, CheckCircle2, UserRound, Ticket } from "lucide-react";

const ROUTE_META = {
  auto_reply: { icon: CheckCircle2, label: "Auto-reply sent", tone: "success" as const, desc: "High confidence — resolved automatically." },
  ticket_created: { icon: Ticket, label: "Ticket created", tone: "info" as const, desc: "Logged for agent follow-up." },
  human_handoff: { icon: UserRound, label: "Human handoff", tone: "danger" as const, desc: "Escalated to a specialist." },
};

export function PipelinePanel({ trace }: { trace: PipelineTrace | null }) {
  return (
    <Card>
      <CardHeader title="AI pipeline" subtitle="How this message was processed" />
      <div className="space-y-4 px-5 pb-5">
        {!trace ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          <>
            {/* 1. Classify */}
            <Step icon={<Cpu className="h-3.5 w-3.5" />} title="1 · Intent classification">
              <div className="flex items-center justify-between">
                <IntentBadge intent={trace.intent} />
                <span className="text-[12px] font-semibold text-ink">{Math.round(trace.confidence * 100)}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-soft">
                <div className="h-full rounded-full bg-brand" style={{ width: `${trace.confidence * 100}%` }} />
              </div>
              <div className="mt-2 flex items-center gap-2 text-[12px] text-muted">
                Sentiment <SentimentBadge sentiment={trace.sentiment} />
              </div>
            </Step>

            {/* 2. Retrieve */}
            <Step icon={<Database className="h-3.5 w-3.5" />} title="2 · Business context retrieved">
              <div className="space-y-1.5">
                {trace.retrievedContext.map((d) => (
                  <div key={d.title} className="rounded-lg border border-line-soft bg-surface-2 px-2.5 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-medium text-ink">{d.title}</span>
                      <span className="rounded bg-brand-soft px-1.5 text-[10.5px] font-semibold text-brand-ink">
                        {d.score.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{d.snippet}</p>
                  </div>
                ))}
              </div>
            </Step>

            {/* 3. Route */}
            <Step icon={<GitBranch className="h-3.5 w-3.5" />} title="3 · Routing decision">
              <RouteRow route={trace.route} />
            </Step>

            <div className="flex items-center justify-between border-t border-line-soft pt-3 text-[11.5px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-brand" /> {trace.latencyMs} ms
              </span>
              <span className="font-mono">{trace.model}</span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function Step({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-soft text-brand">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function RouteRow({ route }: { route: PipelineTrace["route"] }) {
  const meta = ROUTE_META[route];
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-line-soft bg-surface-2 px-3 py-2.5">
      <Icon className={"mt-0.5 h-4 w-4 " + (meta.tone === "success" ? "text-success" : meta.tone === "danger" ? "text-danger" : "text-info")} />
      <div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <p className="mt-1 text-[11.5px] leading-snug text-muted">{meta.desc}</p>
      </div>
    </div>
  );
}
