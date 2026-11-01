"use client";
import * as React from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, StatTile, Button, Badge, Skeleton, ErrorState, SegmentedControl, EmptyState } from "@/components/ui/primitives";
import { BarsVertical, AreaTrend, Donut, Legend, CHART_COLORS } from "@/components/charts";
import { BandBadge, StageBadge } from "@/components/ui/badges";
import { currency, relativeTime } from "@/lib/format";
import type { Lead } from "@/lib/types";
import { Sparkles, RefreshCw, Target, Mail } from "lucide-react";

type Tab = "leads" | "analytics";

export default function SalesPage() {
  const [tab, setTab] = React.useState<Tab>("leads");
  return (
    <>
      <PageHeader
        title="AI Sales Intelligence"
        subtitle="Lead scoring, auto-categorization, AI follow-ups and pipeline analytics."
        actions={
          <SegmentedControl<Tab>
            value={tab}
            onChange={setTab}
            options={[{ value: "leads", label: "Leads" }, { value: "analytics", label: "Pipeline analytics" }]}
          />
        }
      />
      {tab === "leads" ? <LeadsView /> : <SalesAnalytics />}
    </>
  );
}

function ScoreRing({ score, band }: { score: number; band: Lead["band"] }) {
  const color = band === "hot" ? "#E5484D" : band === "warm" ? "#D9930B" : "#3B6FF6";
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#EEF0F6" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-[16px] font-bold text-ink">{score}</span>
    </div>
  );
}

function LeadsView() {
  const leads = useAsync(() => api.sales.leads(), []);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [rescoring, setRescoring] = React.useState(false);
  const [bandFilter, setBandFilter] = React.useState<"all" | Lead["band"]>("all");

  const list = (leads.data ?? []).filter((l) => bandFilter === "all" || l.band === bandFilter);
  const selected = leads.data?.find((l) => l.id === selectedId) ?? list[0] ?? null;

  async function rescore() {
    if (!selected) return;
    setRescoring(true);
    try {
      const updated = await api.sales.rescore(selected.id);
      leads.setData((leads.data ?? []).map((l) => (l.id === updated.id ? updated : l)));
      setSelectedId(updated.id);
    } catch {
      /* surfaced via disabled state */
    } finally {
      setRescoring(false);
    }
  }

  if (leads.error) return <Card className="p-2"><ErrorState message={leads.error} onRetry={leads.reload} /></Card>;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="overflow-hidden">
        <CardHeader
          title="Lead queue"
          subtitle="Ranked by AI score"
          action={
            <SegmentedControl<"all" | Lead["band"]>
              value={bandFilter}
              onChange={setBandFilter}
              options={[
                { value: "all", label: "All" },
                { value: "hot", label: "Hot" },
                { value: "warm", label: "Warm" },
                { value: "cold", label: "Cold" },
              ]}
            />
          }
        />
        <div className="max-h-[640px] overflow-y-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-y border-line-soft bg-surface-2 text-[11.5px] uppercase tracking-wide text-muted">
                <th className="px-5 py-2.5 font-semibold">Lead</th>
                <th className="px-3 py-2.5 font-semibold">Stage</th>
                <th className="px-3 py-2.5 font-semibold">Band</th>
                <th className="px-3 py-2.5 text-right font-semibold">Score</th>
                <th className="px-5 py-2.5 text-right font-semibold">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {leads.loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td className="px-5 py-3" colSpan={5}><Skeleton className="h-5" /></td></tr>
                  ))
                : list.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedId(l.id)}
                      className={"cursor-pointer transition-colors " + (selected?.id === l.id ? "bg-brand-soft/50" : "hover:bg-surface-2/60")}
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-ink">{l.name}</div>
                        <div className="text-[11.5px] text-muted">{l.company}</div>
                      </td>
                      <td className="px-3 py-3"><StageBadge stage={l.stage} /></td>
                      <td className="px-3 py-3"><BandBadge band={l.band} /></td>
                      <td className="px-3 py-3 text-right font-display font-semibold text-ink">{l.score}</td>
                      <td className="px-5 py-3 text-right text-ink-soft">{currency(l.value, true)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {leads.data && list.length === 0 && <EmptyState title="No leads in this band" />}
        </div>
      </Card>

      {/* Lead detail */}
      {selected ? (
        <Card className="h-fit">
          <div className="flex items-center gap-4 p-5">
            <ScoreRing score={selected.score} band={selected.band} />
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-ink">{selected.name}</h3>
              <p className="truncate text-[12.5px] text-muted">{selected.company}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <BandBadge band={selected.band} />
                <StageBadge stage={selected.stage} />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-line-soft px-5 py-4">
            <div className="grid grid-cols-2 gap-3 text-[12.5px]">
              <Meta label="Est. ACV" value={currency(selected.value)} />
              <Meta label="Owner" value={selected.owner} />
              <Meta label="Source" value={selected.source} />
              <Meta label="Last touch" value={relativeTime(selected.lastTouch)} />
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Auto-categories</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.categories.map((c) => (
                  <Badge key={c} tone="neutral">{c}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <Target className="h-3.5 w-3.5" /> Why this score
              </p>
              <ul className="space-y-1">
                {selected.rationale.map((r, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] text-ink-soft">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-brand/20 bg-brand-soft/60 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
                <Sparkles className="h-3.5 w-3.5" /> AI follow-up suggestion
              </p>
              <p className="text-[12.5px] leading-relaxed text-ink-soft">{selected.followUp}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="primary" className="flex-1" onClick={rescore} loading={rescoring}>
                <RefreshCw className="h-3.5 w-3.5" /> Re-score
              </Button>
              <Button variant="secondary" className="flex-1">
                <Mail className="h-3.5 w-3.5" /> Draft email
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card><EmptyState title="Select a lead" hint="View AI scoring rationale and follow-up." /></Card>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="font-medium text-ink">{value}</p>
    </div>
  );
}

function SalesAnalytics() {
  const a = useAsync(() => api.sales.analytics(), []);
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
        <StatTile label="Pipeline value" value={currency(d.pipelineValue, true)} delta="+6.3%" footer="Open opportunities" />
        <StatTile label="Win rate" value={`${Math.round(d.winRate * 100)}%`} delta="+2.1%" />
        <StatTile label="Avg deal size" value={currency(d.avgDealSize, true)} footer="Across all stages" />
        <StatTile label="Hot leads" value={d.bandBreakdown.find((b) => b.label === "Hot")?.value ?? 0} deltaTone="danger" footer="Score ≥ 70" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Conversion trend" subtitle="Leads created vs. won, by week" action={<Legend items={[{ label: "Created", color: CHART_COLORS[0] }, { label: "Won", color: CHART_COLORS[1] }]} />} />
          <div className="px-3 pb-4">
            <AreaTrend data={d.conversionTrend} keys={[{ key: "created", color: CHART_COLORS[0] }, { key: "won", color: CHART_COLORS[1] }]} height={260} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Lead bands" subtitle="Distribution by score" />
          <div className="px-3 pb-4"><Donut data={d.bandBreakdown} height={260} /></div>
        </Card>
      </div>
      <Card>
        <CardHeader title="Pipeline by stage" subtitle="Lead count per stage" />
        <div className="px-3 pb-4"><BarsVertical data={d.pipelineByStage} height={240} /></div>
      </Card>
    </div>
  );
}
