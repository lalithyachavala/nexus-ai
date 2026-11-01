"use client";
import { usePathname } from "next/navigation";
import { NAV } from "@/components/shell/nav";
import { API_MODE } from "@/lib/api";
import { Search, Bell, Command } from "lucide-react";

export function Topbar() {
  const pathname = usePathname();
  const current = NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href))) ?? NAV[0];

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-canvas/80 px-6 backdrop-blur-md">
      <div className="min-w-0">
        <h1 className="truncate font-display text-[17px] font-bold tracking-tight text-ink">{current.label}</h1>
        <p className="truncate text-[12px] text-muted">{current.description}</p>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="hidden items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] text-muted md:flex">
          <Search className="h-3.5 w-3.5" />
          <span>Search conversations, leads…</span>
          <kbd className="ml-6 inline-flex items-center gap-0.5 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>

        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium " +
            (API_MODE === "live" ? "bg-success-soft text-success" : "bg-brand-soft text-brand-ink")
          }
          title={API_MODE === "live" ? "Connected to FastAPI backend" : "Running on mock adapters — no backend required"}
        >
          <span className={"h-1.5 w-1.5 rounded-full " + (API_MODE === "live" ? "bg-success" : "bg-brand")} />
          {API_MODE === "live" ? "Live API" : "Mock mode"}
        </span>

        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft hover:bg-surface-2 focusable">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger ring-2 ring-canvas" />
        </button>
      </div>
    </header>
  );
}
