"use client";
import { Badge, type Tone } from "@/components/ui/primitives";
import type {
  ConversationStatus,
  Intent,
  LeadStage,
  RunStatus,
  ScoreBand,
  Sentiment,
  TicketPriority,
  TicketStatus,
} from "@/lib/types";
import { INTENT_LABEL } from "@/lib/mock/engine";

export function StatusBadge({ status }: { status: ConversationStatus }) {
  const map: Record<ConversationStatus, [Tone, string]> = {
    active: ["info", "Active"],
    waiting: ["warn", "Waiting"],
    resolved: ["success", "Resolved"],
    handoff: ["danger", "Human handoff"],
  };
  const [tone, label] = map[status];
  return <Badge tone={tone} dot>{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const map: Record<TicketPriority, [Tone, string]> = {
    low: ["neutral", "Low"],
    medium: ["info", "Medium"],
    high: ["warn", "High"],
    urgent: ["danger", "Urgent"],
  };
  const [tone, label] = map[priority];
  return <Badge tone={tone}>{label}</Badge>;
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, [Tone, string]> = {
    open: ["info", "Open"],
    pending: ["warn", "Pending"],
    escalated: ["danger", "Escalated"],
    resolved: ["success", "Resolved"],
  };
  const [tone, label] = map[status];
  return <Badge tone={tone} dot>{label}</Badge>;
}

export function IntentBadge({ intent }: { intent: Intent }) {
  return <Badge tone="brand">{INTENT_LABEL[intent]}</Badge>;
}

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const map: Record<Sentiment, [Tone, string]> = {
    positive: ["success", "Positive"],
    neutral: ["neutral", "Neutral"],
    negative: ["danger", "Negative"],
  };
  const [tone, label] = map[sentiment];
  return <Badge tone={tone}>{label}</Badge>;
}

export function BandBadge({ band }: { band: ScoreBand }) {
  const map: Record<ScoreBand, [Tone, string]> = {
    hot: ["danger", "Hot"],
    warm: ["warn", "Warm"],
    cold: ["info", "Cold"],
  };
  const [tone, label] = map[band];
  return <Badge tone={tone} dot>{label}</Badge>;
}

export function StageBadge({ stage }: { stage: LeadStage }) {
  const map: Record<LeadStage, [Tone, string]> = {
    new: ["neutral", "New"],
    qualified: ["info", "Qualified"],
    proposal: ["brand", "Proposal"],
    negotiation: ["warn", "Negotiation"],
    won: ["success", "Won"],
    lost: ["danger", "Lost"],
  };
  const [tone, label] = map[stage];
  return <Badge tone={tone}>{label}</Badge>;
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const map: Record<RunStatus, [Tone, string]> = {
    success: ["success", "Success"],
    failed: ["danger", "Failed"],
    pending_approval: ["warn", "Pending approval"],
    running: ["info", "Running"],
  };
  const [tone, label] = map[status];
  return <Badge tone={tone} dot>{label}</Badge>;
}
