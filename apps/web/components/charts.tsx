"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint, TimePoint } from "@/lib/types";

const INK = "#0C1020";
const GRID = "#EEF0F6";
const MUTED = "#6B7385";
export const CHART_COLORS = ["#6D5EF6", "#10A37F", "#D9930B", "#3B6FF6", "#E5484D", "#8B5CF6"];

const axis = { stroke: GRID, tick: { fill: MUTED, fontSize: 11 }, tickLine: false, axisLine: false } as const;

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[12px] shadow-pop">
      <div className="mb-1 font-medium text-ink">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-ink-soft">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-semibold text-ink">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function AreaTrend({
  data,
  keys,
  height = 220,
}: {
  data: SeriesPoint[];
  keys: { key: string; color?: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          {keys.map((k, i) => (
            <linearGradient key={k.key} id={`g-${k.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={k.color ?? CHART_COLORS[i]} stopOpacity={0.28} />
              <stop offset="100%" stopColor={k.color ?? CHART_COLORS[i]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" {...axis} minTickGap={24} />
        <YAxis {...axis} width={44} />
        <Tooltip content={<TooltipBox />} />
        {keys.map((k, i) => (
          <Area
            key={k.key}
            type="monotone"
            dataKey={k.key}
            stroke={k.color ?? CHART_COLORS[i]}
            strokeWidth={2}
            fill={`url(#g-${k.key})`}
            dot={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarsVertical({ data, color = CHART_COLORS[0], height = 220 }: { data: TimePoint[]; color?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} width={44} />
        <Tooltip cursor={{ fill: "#F2F3F9" }} content={<TooltipBox />} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarsHorizontal({ data, height = 240 }: { data: TimePoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" {...axis} />
        <YAxis type="category" dataKey="label" {...axis} width={120} />
        <Tooltip cursor={{ fill: "#F2F3F9" }} content={<TooltipBox />} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 220 }: { data: TimePoint[]; height?: number }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none">
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<TooltipBox />} />
        <text x="50%" y="48%" textAnchor="middle" className="fill-ink font-display" style={{ fontSize: 22, fontWeight: 700 }}>
          {total}
        </text>
        <text x="50%" y="58%" textAnchor="middle" style={{ fontSize: 11, fill: MUTED }}>
          total
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, color = CHART_COLORS[0], height = 46 }: { data: TimePoint[]; color?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-[12px] text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
