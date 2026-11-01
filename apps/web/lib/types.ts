// Shared domain types for Nexus AI. Mirrored by the FastAPI Pydantic schemas.

export type Channel = "support" | "whatsapp";
export type Tier = "SMB" | "Mid-Market" | "Enterprise";

export type Intent =
  | "billing"
  | "technical_issue"
  | "refund_request"
  | "product_question"
  | "complaint"
  | "feature_request"
  | "sales_inquiry"
  | "account_access"
  | "shipping";

export type Sentiment = "positive" | "neutral" | "negative";

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  tier: Tier;
  region: string;
  seed: number; // avatar/gradient seed
}

export type MessageRole = "customer" | "ai" | "agent" | "system";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  text: string;
  createdAt: string; // ISO
  intent?: Intent;
  confidence?: number; // 0..1
}

export type ConversationStatus = "active" | "waiting" | "resolved" | "handoff";

export interface Conversation {
  id: string;
  channel: Channel;
  customerId: string;
  status: ConversationStatus;
  intent: Intent;
  sentiment: Sentiment;
  createdAt: string;
  lastMessageAt: string;
  assignedAgent?: string;
  unread: number;
  messages: Message[];
}

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "pending" | "escalated" | "resolved";

export interface Ticket {
  id: string;
  conversationId: string;
  customerId: string;
  subject: string;
  category: Intent;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  slaDueAt: string;
  assignedAgent?: string;
}

export type LeadStage =
  | "new"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type ScoreBand = "hot" | "warm" | "cold";

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  source: string;
  stage: LeadStage;
  score: number; // 0..100
  band: ScoreBand;
  value: number; // ACV estimate
  owner: string;
  lastTouch: string;
  categories: string[];
  rationale: string[]; // explainable scoring factors
  followUp: string; // AI-suggested next action
  createdAt: string;
}

export type RunStatus = "success" | "failed" | "pending_approval" | "running";

export interface WorkflowStep {
  name: string;
  status: "done" | "running" | "pending" | "failed" | "skipped";
  detail?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: RunStatus;
  startedAt: string;
  durationMs: number;
  trigger: string;
  steps: WorkflowStep[];
  requiresApproval: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  enabled: boolean;
  category: "support" | "sales" | "whatsapp" | "ops";
  successRate: number; // 0..1
  runsToday: number;
  avgDurationMs: number;
  lastRun: string;
}

export interface Template {
  id: string;
  name: string;
  channel: Channel;
  category: string;
  body: string;
  usageCount: number;
}

// Analytics aggregates
export interface TimePoint {
  label: string;
  value: number;
}
export interface SeriesPoint {
  label: string;
  [key: string]: number | string;
}

export interface SupportAnalytics {
  volumeByDay: SeriesPoint[]; // ai vs agent handled
  intentBreakdown: TimePoint[];
  csat: number;
  csatTrend: TimePoint[];
  avgFirstResponseSec: number;
  autoResolutionRate: number;
  handoffRate: number;
  openTickets: number;
}

export interface SalesAnalytics {
  pipelineByStage: TimePoint[];
  conversionTrend: SeriesPoint[]; // created vs won
  pipelineValue: number;
  winRate: number;
  avgDealSize: number;
  bandBreakdown: TimePoint[];
}

export interface OverviewMetrics {
  conversationsToday: number;
  autoResolutionRate: number;
  activeLeads: number;
  pipelineValue: number;
  workflowRunsToday: number;
  pendingApprovals: number;
  csat: number;
  messagesTrend: SeriesPoint[];
  channelSplit: TimePoint[];
}

// Pipeline trace used by the Support/WhatsApp "how the AI decided" panel
export interface PipelineTrace {
  intent: Intent;
  confidence: number;
  sentiment: Sentiment;
  retrievedContext: { title: string; snippet: string; score: number }[];
  route: "auto_reply" | "ticket_created" | "human_handoff";
  latencyMs: number;
  model: string;
}

export interface ProblemError {
  error: string;
  detail: string;
  field?: string;
}
