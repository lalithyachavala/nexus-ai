"use client";
import * as React from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, StatTile, Skeleton, ErrorState, SegmentedControl, Avatar } from "@/components/ui/primitives";
import { AreaTrend, BarsHorizontal, Sparkline, Legend, CHART_COLORS } from "@/components/charts";
import { ConversationInbox } from "@/components/inbox/ConversationInbox";
import { PriorityBadge, TicketStatusBadge, IntentBadge } from "@/components/ui/badges";
import { relativeTime } from "@/lib/format";
import type { Customer } from "@/lib/types";

type Tab = "inbox" | "analytics" | "tickets";

export default function SupportPage() {
  const [tab, setTab] = React.useState<Tab>("inbox");
  return (
    <>
      <PageHeader
        title="AI Customer Support"
        subtitle="Conversational AI with intent classification, context retrieval, ticketing and human handoff."
        actions={
          <SegmentedControl<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "inbox", label: "Inbox" },
              { value: "analytics", label: "Analytics" },
              { value: "tickets", label: "Tickets" },
            ]}
          />
        }
      />
      {tab === "inbox" && <ConversationInbox channel="support" />}
      {tab === "analytics" && <SupportAnalytics />}
      {tab === "tickets" && <TicketsTable />}
    </>
  );
}

function SupportAnalytics() {
  const a = useAsync(() => api.support.analytics(), []);
  if (a.error) return <Card className="p-2"><ErrorState message={a.error} onRetry={a.reload} /></Card>;
  if (a.loading || !a.data)
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5"><Skeleton className="h-3 w-20" /><Skeleton className="mt-3 h-7 w-16" /></Card>
        ))}
      </div>
    );
  const d = a.data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="CSAT" value={`${d.csat}/5`} delta="+0.2" footer={<Sparkline data={d.csatTrend} />} />
        <StatTile label="Auto-resolution" value={`${Math.round(d.autoResolutionRate * 100)}%`} delta="+4%" footer="Resolved without an agent" />
        <StatTile label="Avg first response" value={`${d.avgFirstResponseSec}s`} deltaTone="success" delta="-11s" footer="AI drafts in under a minute" />
        <StatTile label="Open tickets" value={d.openTickets} deltaTone="warn" footer={`Handoff rate ${Math.round(d.handoffRate * 100)}%`} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Handled volume"
            subtitle="AI vs. agent, last 14 days"
            action={<Legend items={[{ label: "AI", color: CHART_COLORS[0] }, { label: "Agent", color: CHART_COLORS[1] }]} />}
          />
          <div className="px-3 pb-4">
            <AreaTrend data={d.volumeByDay} keys={[{ key: "ai", color: CHART_COLORS[0] }, { key: "agent", color: CHART_COLORS[1] }]} height={260} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Intent breakdown" subtitle="Top classified intents" />
          <div className="px-4 pb-4"><BarsHorizontal data={d.intentBreakdown} height={260} /></div>
        </Card>
      </div>
    </div>
  );
}

function TicketsTable() {
  const tickets = useAsync(() => api.tickets(), []);
  const customers = useAsync(() => api.customers(), []);
  const map = React.useMemo(() => {
    const m = new Map<string, Customer>();
    customers.data?.forEach((c) => m.set(c.id, c));
    return m;
  }, [customers.data]);

  if (tickets.error) return <Card className="p-2"><ErrorState message={tickets.error} onRetry={tickets.reload} /></Card>;

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Tickets" subtitle="Auto-created from classified conversations" />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-y border-line-soft bg-surface-2 text-[11.5px] uppercase tracking-wide text-muted">
              <th className="px-5 py-2.5 font-semibold">Subject</th>
              <th className="px-3 py-2.5 font-semibold">Customer</th>
              <th className="px-3 py-2.5 font-semibold">Category</th>
              <th className="px-3 py-2.5 font-semibold">Priority</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 font-semibold">Agent</th>
              <th className="px-5 py-2.5 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {tickets.loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3" colSpan={7}><Skeleton className="h-5" /></td>
                  </tr>
                ))
              : tickets.data?.map((t) => {
                  const cust = map.get(t.customerId);
                  return (
                    <tr key={t.id} className="hover:bg-surface-2/60">
                      <td className="px-5 py-3">
                        <div className="font-medium text-ink">{t.subject}</div>
                        <div className="text-[11.5px] text-muted">{t.id}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {cust && <Avatar name={cust.name} seed={cust.seed} size={26} />}
                          <span className="text-[12.5px] text-ink-soft">{cust?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3"><IntentBadge intent={t.category} /></td>
                      <td className="px-3 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-3 py-3"><TicketStatusBadge status={t.status} /></td>
                      <td className="px-3 py-3 text-[12.5px] text-ink-soft">{t.assignedAgent ?? "Unassigned"}</td>
                      <td className="px-5 py-3 text-[12.5px] text-muted">{relativeTime(t.createdAt)}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {tickets.data && tickets.data.length === 0 && <p className="py-10 text-center text-[13px] text-muted">No tickets.</p>}
      </div>
    </Card>
  );
}
