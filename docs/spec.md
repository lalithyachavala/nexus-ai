# Nexus AI — Design Spec

> **Independent illustrative engineering demonstration.** Nexus AI is an
> original portfolio artifact built to demonstrate engineering capability.
> It is not affiliated with, and does not represent, any real company,
> product, or customer. All data is synthetic.

## Problem statement

Support, sales, and messaging teams operate in disconnected tools. Inbound
messages (chat, WhatsApp) are triaged by hand, leads are scored on gut feel,
and automations are opaque black boxes with no approval trail. Nexus AI
demonstrates a single operations plane where every inbound message flows
through one explainable AI pipeline and every automated action is auditable
and, when risky, gated behind human approval.

## System overview

Monorepo with a clear frontend/backend split:

- **apps/web** — Next.js 14 (App Router), TypeScript, Tailwind, Recharts.
  Enterprise shell with five modules: Overview, Support, Sales, WhatsApp,
  Automation.
- **apps/api** — FastAPI, SQLAlchemy, Pydantic. Houses the AI message
  pipeline, business-context retrieval, and the automation engine.
- **infra** — docker-compose (Postgres + api + web) as the production target.

### The AI message pipeline (centerpiece)

```
ingest → classify intent → retrieve business context → adapter generates
reply/action → persist → route (auto-reply | ticket | human handoff) →
emit analytics event
```

A single `process_message` service runs this for both Support and WhatsApp
inbound. The `AIAdapter` interface decouples the pipeline from any model
vendor.

## Technology stack

| Layer     | Choice |
|-----------|--------|
| Frontend  | Next.js 14, React 18, TypeScript, Tailwind, Recharts, lucide-react |
| Backend   | FastAPI, SQLAlchemy 2, Pydantic v2, sse-starlette, httpx |
| Database  | Postgres (Supabase) via `DATABASE_URL`; SQLite auto-fallback for zero-setup dev |
| AI        | `AIAdapter` interface → `MockAIAdapter` (default) + optional OpenAI/Claude |

## Key engineering decisions

1. **Adapter pattern for AI.** Pipeline depends on an interface, never a
   vendor SDK. Mock adapter is deterministic (hash-seeded) so demos and
   screenshots are reproducible. Real providers are opt-in via env.
2. **Two data modes on the frontend.** `NEXT_PUBLIC_API_MODE=mock` serves
   seeded data from Next route handlers so the UI runs with zero backend —
   this is what makes the demo portable and screenshottable. `live` mode
   talks to FastAPI.
3. **DB via env, SQLite fallback.** Postgres/Supabase is the real target;
   SQLite kicks in when `DATABASE_URL` is unset so the API boots anywhere.
4. **SSE for streaming replies.** AI replies stream token-by-token over
   Server-Sent Events — credible UX without WebSocket complexity.
5. **Approval gates as first-class state.** Automation runs can halt in a
   `pending_approval` state; nothing destructive executes without a decision.

## Data flow

Inbound message → `POST /support/messages` (or `/whatsapp/messages`) →
pipeline → persisted `Message` + `Conversation` + optional `Ticket` →
`AnalyticsEvent` row → SSE stream pushes the AI reply to the client →
dashboards read aggregates from `/analytics/*`.

## Security considerations

- Pydantic validation at every boundary; typed errors with problem details.
- Secrets only server-side (`apps/api/.env`); never shipped to the client.
- Mock mode means no key is ever required to run or demo.
- PII note: synthetic data only; the case study documents where real PII
  controls (encryption at rest, field-level redaction, retention) would go.
- Approval gates prevent unattended destructive actions.

## Scalability considerations

- Stateless API → horizontal scale behind a load balancer.
- Pipeline stages are separable; classify/retrieve/generate can become
  independent workers fed by a queue.
- Postgres read replicas for analytics; Redis cache for hot context.

## Key features (per module)

- **Support** — streaming AI chat, intent classification, auto ticket
  creation + escalation, human handoff, support analytics.
- **Sales** — lead table, AI lead scoring with rationale, auto
  categorization, follow-up suggestions, pipeline + conversion analytics.
- **WhatsApp** — simulated conversation UI, inbound processing, AI replies,
  customer classification, escalation, message templates.
- **Automation** — active workflows, execution history, success/failure
  states, config, manual approval controls.

## Limitations of the demonstration

- Mock AI is deterministic heuristics, not a real model (real providers are
  opt-in).
- SQLite fallback is single-node; Postgres is required for real concurrency.
- Auth is a stubbed session, not a full IdP integration.
- WhatsApp is a faithful simulation of the Business API contract, not a live
  Meta integration.
