"use client";
import * as React from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Button, Badge, Skeleton, ErrorState, EmptyState } from "@/components/ui/primitives";
import { RunStatusBadge } from "@/components/ui/badges";
import { relativeTime, pct } from "@/lib/format";
import type { Workflow, WorkflowRun, WorkflowStep } from "@/lib/types";
import { cn } from "@/lib/ui";
import { Check, X, Clock, Loader2, Minus, ShieldCheck, Zap } from "lucide-react";

export default function AutomationPage() {
  const workflows = useAsync(() => api.automation.workflows(), []);
  const runs = useAsync(() => api.automation.runs(), []);
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const runList = runs.data ?? [];
  const selectedRun = runList.find((r) => r.id === selectedRunId) ?? runList.find((r) => r.status === "pending_approval") ?? runList[0] ?? null;
  const wfName = (id: string) => workflows.data?.find((w) => w.id === id)?.name ?? id;

  async function toggle(wf: Workflow) {
    setBusy(wf.id);
    try {
      const updated = await api.automation.toggle(wf.id);
      workflows.setData((workflows.data ?? []).map((w) => (w.id === updated.id ? updated : w)));
    } finally {
      setBusy(null);
    }
  }

  async function decide(run: WorkflowRun, decision: "approve" | "reject") {
    setBusy(run.id);
    try {
      const updated = await api.automation.approve(run.id, decision);
      runs.setData((runs.data ?? []).map((r) => (r.id === updated.id ? updated : r)));
    } finally {
      setBusy(null);
    }
  }

  const pendingCount = runList.filter((r) => r.status === "pending_approval").length;

  return (
    <>
      <PageHeader
        title="Automation Dashboard"
        subtitle="Active workflows, execution history, and human-in-the-loop approval gates."
        actions={
          pendingCount > 0 ? (
            <Badge tone="warn" dot>
              {pendingCount} pending approval{pendingCount > 1 ? "s" : ""}
            </Badge>
          ) : (
            <Badge tone="success" dot>
              All automations healthy
            </Badge>
          )
        }
      />

      {/* Workflow cards */}
      {workflows.error ? (
        <Card className="p-2"><ErrorState message={workflows.error} onRetry={workflows.reload} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.loading
            ? Array.from({ length: 6 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-24" /></Card>)
            : workflows.data?.map((wf) => (
                <Card key={wf.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[14px] font-semibold text-ink">{wf.name}</h3>
                      <p className="mt-0.5 text-[12px] text-muted">{wf.trigger}</p>
                    </div>
                    <Toggle on={wf.enabled} busy={busy === wf.id} onClick={() => toggle(wf)} />
                  </div>
                  <p className="mt-2 flex-1 text-[12.5px] leading-snug text-ink-soft">{wf.description}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3 text-[12px]">
                    <span className="text-muted">
                      <span className="font-semibold text-ink">{wf.runsToday}</span> runs today
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted">
                      <Zap className="h-3.5 w-3.5 text-brand" /> {wf.avgDurationMs}ms
                    </span>
                    <span className={cn("font-semibold", wf.successRate >= 0.95 ? "text-success" : "text-warn")}>
                      {pct(wf.successRate)}
                    </span>
                  </div>
                </Card>
              ))}
        </div>
      )}

      {/* Execution history + detail */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <CardHeader title="Execution history" subtitle="Most recent workflow runs" />
          <div className="max-h-[520px] overflow-y-auto">
            {runs.loading ? (
              <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <table className="w-full text-left text-[13px]">
                <tbody className="divide-y divide-line-soft">
                  {runList.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRunId(r.id)}
                      className={cn("cursor-pointer transition-colors", selectedRun?.id === r.id ? "bg-brand-soft/50" : "hover:bg-surface-2/60")}
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-ink">{wfName(r.workflowId)}</div>
                        <div className="text-[11.5px] text-muted">{r.id} · {r.trigger}</div>
                      </td>
                      <td className="px-3 py-3"><RunStatusBadge status={r.status} /></td>
                      <td className="px-5 py-3 text-right text-[12px] text-muted">{relativeTime(r.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Run detail */}
        {selectedRun ? (
          <Card className="h-fit">
            <CardHeader title="Run detail" subtitle={wfName(selectedRun.workflowId)} action={<RunStatusBadge status={selectedRun.status} />} />
            <div className="px-5 pb-5">
              <ol className="relative space-y-1 border-l border-line-soft pl-5">
                {selectedRun.steps.map((s, i) => (
                  <StepRow key={i} step={s} />
                ))}
              </ol>

              <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3 text-[12px] text-muted">
                <span>Duration</span>
                <span className="font-mono text-ink">{selectedRun.durationMs}ms</span>
              </div>

              {selectedRun.status === "pending_approval" && (
                <div className="mt-4 rounded-lg border border-warn/30 bg-warn-soft/60 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-warn">
                    <ShieldCheck className="h-4 w-4" /> Human approval required
                  </p>
                  <p className="mb-3 text-[12px] leading-snug text-ink-soft">
                    This run is paused at an approval gate. Nothing executes until a decision is recorded.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="primary" className="flex-1" loading={busy === selectedRun.id} onClick={() => decide(selectedRun, "approve")}>
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button variant="danger" className="flex-1" disabled={busy === selectedRun.id} onClick={() => decide(selectedRun, "reject")}>
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card><EmptyState title="Select a run" hint="Inspect steps and approve gated actions." /></Card>
        )}
      </div>
    </>
  );
}

function Toggle({ on, busy, onClick }: { on: boolean; busy: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      role="switch"
      aria-checked={on}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focusable",
        on ? "bg-brand" : "bg-line"
      )}
    >
      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", on ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

const STEP_ICON: Record<WorkflowStep["status"], React.ReactNode> = {
  done: <Check className="h-3 w-3 text-white" />,
  running: <Loader2 className="h-3 w-3 animate-spin text-white" />,
  pending: <Clock className="h-3 w-3 text-white" />,
  failed: <X className="h-3 w-3 text-white" />,
  skipped: <Minus className="h-3 w-3 text-white" />,
};
const STEP_BG: Record<WorkflowStep["status"], string> = {
  done: "bg-success",
  running: "bg-info",
  pending: "bg-warn",
  failed: "bg-danger",
  skipped: "bg-muted",
};

function StepRow({ step }: { step: WorkflowStep }) {
  return (
    <li className="relative py-1.5">
      <span className={cn("absolute -left-[26px] flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-surface", STEP_BG[step.status])}>
        {STEP_ICON[step.status]}
      </span>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink">{step.name}</span>
        {step.detail && <span className="text-[11.5px] text-muted">{step.detail}</span>}
      </div>
    </li>
  );
}
