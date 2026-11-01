"use client";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, StatTile, Skeleton, ErrorState, Badge } from "@/components/ui/primitives";
import { AreaTrend, Donut, Legend, CHART_COLORS } from "@/components/charts";
import { NAV } from "@/components/shell/nav";
import { currency, compactNum } from "@/lib/format";
import {
  MessageSquare,
  Bot,
  Users,
  DollarSign,
  Workflow as WorkflowIcon,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

export default function OverviewPage() {
  const overview = useAsync(() => api.overview(), []);
  const runs = useAsync(() => api.automation.runs(), []);

  return (
    <>
      <PageHeader
        title="Operations Overview"
        subtitle="A unified view of AI-handled support, sales pipeline, and automation health."
      />

      {/* KPI row */}
      {overview.error ? (
        <Card className="p-2">
          <ErrorState message={overview.error} onRetry={overview.reload} />
        </Card>
      ) : overview.loading || !overview.data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-20" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="Conversations today"
            value={overview.data.conversationsToday}
            delta="+12%"
            icon={<MessageSquare className="h-4 w-4" />}
            footer="Across support & WhatsApp"
          />
          <StatTile
            label="Auto-resolution rate"
            value={`${Math.round(overview.data.autoResolutionRate * 100)}%`}
            delta="+4.1%"
            icon={<Bot className="h-4 w-4" />}
            footer="Resolved without an agent"
          />
          <StatTile
            label="Active leads"
            value={overview.data.activeLeads}
            delta="+8"
            icon={<Users className="h-4 w-4" />}
            footer="In open pipeline stages"
          />
          <StatTile
            label="Pipeline value"
            value={currency(overview.data.pipelineValue, true)}
            delta="+6.3%"
            icon={<DollarSign className="h-4 w-4" />}
            footer="Weighted open opportunities"
          />
        </div>
      )}

      {/* Charts */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Message volume"
            subtitle="Inbound conversations handled per day, last 14 days"
            action={
              <Legend
                items={[
                  { label: "Support", color: CHART_COLORS[0] },
                  { label: "WhatsApp", color: CHART_COLORS[1] },
                ]}
              />
            }
          />
          <div className="px-3 pb-4">
            {overview.data && (
              <AreaTrend
                data={overview.data.messagesTrend}
                keys={[
                  { key: "support", color: CHART_COLORS[0] },
                  { key: "whatsapp", color: CHART_COLORS[1] },
                ]}
                height={248}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Channel split" subtitle="Open conversations by channel" />
          <div className="px-3 pb-4">{overview.data && <Donut data={overview.data.channelSplit} height={248} />}</div>
        </Card>
      </div>

      {/* Secondary row: health tiles + approvals */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-3">
          <StatTile
            label="Workflow runs today"
            value={overview.data ? compactNum(overview.data.workflowRunsToday) : "—"}
            icon={<WorkflowIcon className="h-4 w-4" />}
          />
          <StatTile
            label="Pending approvals"
            value={overview.data?.pendingApprovals ?? "—"}
            deltaTone="warn"
            icon={<ShieldCheck className="h-4 w-4" />}
            footer="Awaiting human decision"
          />
          <StatTile label="CSAT" value={overview.data ? `${overview.data.csat}/5` : "—"} delta="+0.2" />
        </div>

        <Card>
          <CardHeader title="Needs attention" subtitle="Approvals & escalations" />
          <div className="divide-y divide-line-soft px-5 pb-3">
            {runs.loading ? (
              <div className="space-y-3 py-3">
                <Skeleton className="h-4" />
                <Skeleton className="h-4" />
              </div>
            ) : (
              runs.data
                ?.filter((r) => r.status === "pending_approval" || r.status === "failed")
                .slice(0, 4)
                .map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">{r.trigger}</p>
                      <p className="text-[12px] text-muted">{r.id}</p>
                    </div>
                    <Badge tone={r.status === "pending_approval" ? "warn" : "danger"} dot>
                      {r.status === "pending_approval" ? "Approve" : "Failed"}
                    </Badge>
                  </div>
                ))
            )}
            {runs.data && runs.data.filter((r) => r.status === "pending_approval" || r.status === "failed").length === 0 && (
              <p className="py-6 text-center text-[13px] text-muted">All clear — nothing needs attention.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Module quick links */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {NAV.filter((n) => n.href !== "/").map((n) => {
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href}>
              <Card className="group p-5 transition-shadow hover:shadow-card-hover">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <p className="mt-3 text-[14px] font-semibold text-ink">{n.label}</p>
                <p className="text-[12.5px] text-muted">{n.description}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
