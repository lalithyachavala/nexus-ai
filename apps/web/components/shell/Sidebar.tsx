"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/components/shell/nav";
import { cn } from "@/lib/ui";
import { Hexagon, FlaskConical } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-rail text-rail-text shadow-rail lg:flex">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
          <Hexagon className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
        </div>
        <div className="leading-tight">
          <div className="font-display text-[15px] font-bold tracking-tight text-white">Nexus AI</div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-rail-text/70">Operations Cloud</div>
        </div>
      </div>

      <div className="px-3 pt-2 pb-1">
        <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-rail-text/50">
          Workspace
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                active ? "bg-rail-2 text-white" : "text-rail-text hover:bg-rail-2/60 hover:text-white"
              )}
            >
              {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand" />}
              <Icon className={cn("h-[18px] w-[18px]", active ? "text-brand" : "text-rail-text/80")} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: demo label + synthetic workspace */}
      <div className="space-y-3 border-t border-rail-line p-3">
        <div className="flex items-start gap-2 rounded-lg bg-rail-2 px-3 py-2.5">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p className="text-[11px] leading-snug text-rail-text/80">
            Independent illustrative engineering demonstration. Synthetic data only.
          </p>
        </div>
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#8B5CF6] text-[11px] font-semibold text-white">
            OP
          </span>
          <div className="leading-tight">
            <div className="text-[12.5px] font-medium text-white">Ops Demo User</div>
            <div className="text-[11px] text-rail-text/60">Acme Workspace</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
