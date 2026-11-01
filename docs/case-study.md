# Case Study — Nexus AI: Enterprise AI Operations Platform

> **Independent illustrative engineering demonstration.** Nexus AI is an
> original portfolio artifact. It is not affiliated with, nor does it
> represent, any real company, product, or customer. All data is synthetic.

| | |
|---|---|
| **Type** | Full-stack AI operations platform (demonstration) |
| **Role demonstrated** | AI Technical Product Engineer / Software Engineer |
| **Stack** | Next.js 14 · TypeScript · Tailwind · FastAPI · SQLAlchemy · PostgreSQL/Supabase |
| **AI** | Adapter pattern — deterministic mock by default; OpenAI / Claude opt-in |
| **Runs without API keys?** | Yes — mock adapters + SQLite fallback |

---

## 1. Problem statement

Support, sales, and messaging teams operate across disconnected tools.
Inbound messages (web chat, WhatsApp) are triaged by hand, leads are scored on
intuition, and automations run as opaque black boxes with no audit trail or
approval step. The result is slow first responses, inconsistent lead
prioritization, and automation nobody fully trusts.

Nexus AI demonstrates a single operations plane where **every inbound message
flows through one explainable AI pipeline** and **every automated action is
auditable and, when risky, gated behind human approval.**

## 2. System overview

A monorepo with a clean frontend/backend split:

- **`apps/web`** — Next.js 14 (App Router) enterprise console with five
  modules: Overview, AI Support, Sales Intelligence, WhatsApp, Automation.
- **`apps/api`** — FastAPI service hosting the AI message pipeline, business
  context retrieval, lead scoring, and the automation engine.
- **`infra`** — `docker-compose` (Postgres + api + web) as the production target.

The frontend runs in two modes. **Mock mode** (default) serves seeded data from
Next route handlers so the entire product runs with zero backend — this is what
makes it portable and screenshottable. **Live mode** points the same typed
client at FastAPI. The request/response shapes are identical in both.

See [`architecture.md`](./architecture.md) for the system and sequence diagrams.

## 3. Architecture

The centerpiece is a single `process_message` pipeline shared by both Support
and WhatsApp inbound:

```
ingest → classify intent → retrieve business context → generate reply/action
       → persist → route (auto-reply | ticket | human handoff) → emit analytics
```

The pipeline depends only on an `AIAdapter` interface, never on a vendor SDK.
This keeps the business logic (routing, retrieval, scoring) stable while the
model behind reply generation is swappable. See the sequence diagram for the
full message flow and the routing-rules table.

## 4. Technology stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 14, React 18, TypeScript | App Router, server + client components, strong typing |
| Styling | Tailwind CSS, custom design tokens | Distinctive identity (dark rail + violet signal accent), no template look |
| Charts | Recharts | Real, themed area/bar/donut/sparkline charts |
| Backend | FastAPI, Pydantic v2 | Async, automatic validation + OpenAPI docs |
| ORM | SQLAlchemy 2 | Postgres/Supabase in prod, SQLite fallback for dev |
| Streaming | Server-Sent Events | Token-streamed AI replies without WebSocket complexity |
| AI | `AIAdapter` → Mock / OpenAI / Claude | Vendor-agnostic, deterministic default |

## 5. Important engineering decisions

1. **Adapter pattern for AI.** The pipeline calls an interface. `MockAIAdapter`
   is deterministic (hash-seeded), so demos and screenshots reproduce exactly;
   real providers (`OpenAIAdapter`, `ClaudeAdapter`) are opt-in via
   `LLM_PROVIDER` + a key and gracefully fall back to the mock on any error.
2. **Two frontend data modes behind one client.** `NEXT_PUBLIC_API_MODE`
   switches between mock route handlers and the live FastAPI backend without
   touching component code.
3. **DB via env with a safe fallback.** `DATABASE_URL` targets
   Supabase/Postgres; unset, it falls back to SQLite so the API boots anywhere.
4. **SSE for streaming replies.** Each token is JSON-encoded over an SSE event
   stream (preserving whitespace), giving a credible "AI is typing" UX.
5. **Approval gates as first-class state.** Automation runs can halt in
   `pending_approval`; nothing destructive executes until a decision is recorded.
6. **Explainable scoring.** Lead scores ship with a human-readable rationale
   (tier, engagement, recency, source, deal size) rather than an opaque number.

## 6. Data flow

An inbound message hits `POST /support/messages` (or `/whatsapp/messages`),
runs the pipeline, and is persisted as `Message` + `Conversation` rows, plus a
`Ticket` when routing demands it. The AI reply streams back over SSE. Dashboards
read aggregates from `/overview`, `/support/analytics`, and `/sales/analytics`.
Mutations — lead re-score, workflow toggle, run approve/reject — write through
the same validated endpoints.

## 7. Security considerations

- **Secrets stay server-side.** LLM keys and the DB URL live only in
  `apps/api/.env`; the browser never receives them.
- **No key required to run.** Mock mode removes the most common leak vector for
  a demo entirely.
- **Input validation at every boundary** via Pydantic (and client-side guards),
  with typed problem responses on 422/404.
- **Approval gates** prevent unattended destructive automation.
- **PII posture (documented).** All data here is synthetic. In production, PII
  fields would be encrypted at rest, access-controlled per role, redacted in
  logs, and subject to a retention/deletion policy.
- **CORS** is restricted to the known web origin.

## 8. Scalability considerations

- Stateless API → horizontal scale behind a load balancer.
- Pipeline stages (classify / retrieve / generate) are separable and can become
  independent queue-fed workers.
- Postgres read replicas for analytics; a Redis cache for hot business context
  and session memory.
- SSE connections are cheap and can be fronted by a streaming-aware proxy.

## 9. Key features

| Module | Features |
|--------|----------|
| **Overview** | Unified KPIs, message-volume trend, channel split, needs-attention queue |
| **AI Support** | Streaming AI chat, intent classification, context retrieval panel, auto-ticketing, escalation, human handoff, support analytics |
| **Sales Intelligence** | Lead queue, explainable AI scoring, auto-categorization, AI follow-up suggestions, re-score, pipeline + conversion analytics |
| **WhatsApp** | Simulated Business API inbox, inbound processing, AI replies, classification, templates, escalation |
| **Automation** | Active workflows with enable toggles, execution history, step-level run traces, success/failure states, human approval controls |

## 10. Limitations of the demonstration

- Mock AI is deterministic heuristics, not a real model (real providers are opt-in).
- SQLite fallback is single-node; Postgres is required for real concurrency.
- Auth is a stubbed session, not a full IdP/SSO integration.
- WhatsApp is a faithful simulation of the Business API contract, not a live
  Meta integration.
- Analytics trends are synthetic time series, not computed from historical events.
