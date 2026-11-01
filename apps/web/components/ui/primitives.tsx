"use client";
import * as React from "react";
import { cn } from "@/lib/ui";
import { initials, gradientFromSeed } from "@/lib/format";
import { Loader2, Inbox, AlertTriangle } from "lucide-react";

/* ---------------- Button ---------------- */
type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
type BtnSize = "sm" | "md";
export function Button({
  variant = "secondary",
  size = "md",
  className,
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
}) {
  const variants: Record<BtnVariant, string> = {
    primary: "bg-brand text-white hover:bg-brand-hover shadow-sm",
    secondary: "bg-surface text-ink border border-line hover:bg-surface-2 hover:border-line",
    ghost: "text-ink-soft hover:bg-line-soft",
    danger: "bg-danger text-white hover:brightness-95",
  };
  const sizes: Record<BtnSize, string> = {
    sm: "h-8 px-3 text-[13px] gap-1.5",
    md: "h-9 px-3.5 text-sm gap-2",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focusable disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}
export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-4 pb-3", className)}>
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {subtitle && <p className="text-[13px] text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Badge ---------------- */
export type Tone = "neutral" | "brand" | "success" | "warn" | "danger" | "info";
const toneMap: Record<Tone, string> = {
  neutral: "bg-line-soft text-ink-soft",
  brand: "bg-brand-soft text-brand-ink",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};
export function Badge({
  tone = "neutral",
  children,
  className,
  dot,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium",
        toneMap[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

/* ---------------- StatTile ---------------- */
export function StatTile({
  label,
  value,
  delta,
  deltaTone = "success",
  icon,
  footer,
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaTone?: Tone;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="font-display text-[26px] font-bold leading-none tracking-tight text-ink">{value}</span>
        {delta && (
          <span className={cn("mb-0.5 text-[12px] font-semibold", toneMap[deltaTone].split(" ")[1])}>{delta}</span>
        )}
      </div>
      {footer && <div className="mt-2 text-[12px] text-muted">{footer}</div>}
    </Card>
  );
}

/* ---------------- Inputs ---------------- */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 transition-colors focusable",
          className
        )}
        {...props}
      />
    );
  }
);

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 transition-colors focusable",
        className
      )}
      {...props}
    />
  );
}

/* ---------------- Avatar ---------------- */
export function Avatar({ name, seed, size = 36 }: { name: string; seed: number; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white ring-1 ring-black/5"
      style={{ width: size, height: size, background: gradientFromSeed(seed) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* ---------------- Skeleton / states ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} />;
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-line-soft text-muted">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="max-w-xs text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink">Something went wrong</p>
        <p className="mt-0.5 max-w-sm text-[13px] text-muted">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ---------------- SegmentedControl ---------------- */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1 text-[13px] font-medium transition-colors",
            value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
