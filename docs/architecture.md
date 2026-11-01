# Nexus AI — Architecture

> Independent illustrative engineering demonstration. Synthetic data only.

## System architecture

```mermaid
flowchart TB
    subgraph client["Client · Next.js 14 (App Router, TS, Tailwind)"]
        UI["Enterprise shell<br/>Overview · Support · Sales · WhatsApp · Automation"]
        APIClient["Typed API client<br/>(mock | live switch)"]
        UI --> APIClient
    end

    subgraph mock["Mock adapter layer (default — zero backend)"]
        Routes["Next route handlers<br/>/api/* dispatcher"]
        Engine["Deterministic engine<br/>synthetic data + mock AI"]
        Routes --> Engine
    end

    subgraph backend["Backend · FastAPI (Python)"]
        REST["REST + SSE endpoints"]
        Pipeline["process_message pipeline"]
        AIFactory["AIAdapter factory"]
        REST --> Pipeline --> AIFactory
    end

    subgraph ai["AI service layer"]
        MockAI["MockAIAdapter<br/>(deterministic)"]
        OpenAI["OpenAIAdapter<br/>(opt-in)"]
        Claude["ClaudeAdapter<br/>(opt-in)"]
        AIFactory --> MockAI & OpenAI & Claude
    end

    subgraph data["Data · SQLAlchemy"]
        DB[("PostgreSQL / Supabase<br/>SQLite fallback")]
    end

    subgraph ext["External (simulated)"]
        WA["WhatsApp Business API"]
        LLM["LLM provider APIs"]
    end

    APIClient -- "NEXT_PUBLIC_API_MODE=mock" --> Routes
    APIClient -- "NEXT_PUBLIC_API_MODE=live (CORS)" --> REST
    Pipeline --> DB
    OpenAI -.-> LLM
    Claude -.-> LLM
    WA -.-> REST

    subgraph deploy["Deployment"]
        Vercel["Vercel · web"]
        Cloud["Docker · api + db<br/>(GCP/Azure, GitHub Actions CI)"]
    end
    client -.deploy.-> Vercel
    backend -.deploy.-> Cloud
```

**Trust boundary & security.** Secrets live only in `apps/api/.env` (never
shipped to the client). The client never holds an LLM key — the backend owns
all provider calls. Mock mode requires no key at all, so the demo is safe to
run and share. Pydantic validates every request body; typed problem responses
are returned on validation and not-found errors.

## AI message-processing sequence

How an inbound message (Support or WhatsApp) flows through the single
`process_message` pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant W as Web / WhatsApp
    participant API as FastAPI
    participant P as Pipeline
    participant AD as AIAdapter
    participant KB as Context store
    participant DB as Database
    participant A as Analytics

    C->>W: Sends message
    W->>API: POST /support/messages (validated)
    API->>P: process_message(text)
    P->>AD: classify_intent(text)
    AD-->>P: intent + confidence
    P->>AD: detect_sentiment(text)
    AD-->>P: sentiment
    P->>KB: retrieve_context(intent)
    KB-->>P: ranked business context
    P->>AD: generate_reply(intent, customer, text)
    AD-->>P: drafted reply
    P->>P: route(intent, sentiment, confidence)
    alt confident & low-risk
        P-->>W: auto_reply (SSE token stream)
    else billing / technical / low confidence
        P->>DB: create Ticket
        P-->>W: ticket_created
    else complaint / negative refund
        P->>DB: set status = handoff
        P-->>W: human_handoff
    end
    P->>DB: persist messages + conversation
    P->>A: emit analytics event
    A-->>W: dashboards updated
```

## Routing rules (deterministic in mock mode)

| Condition | Route |
|-----------|-------|
| `complaint`, or `refund_request` + negative sentiment | `human_handoff` |
| confidence < 0.55, or `technical_issue` / `billing` | `ticket_created` |
| otherwise | `auto_reply` |

## Data model (core entities)

```mermaid
erDiagram
    CUSTOMER ||--o{ CONVERSATION : has
    CONVERSATION ||--o{ MESSAGE : contains
    CONVERSATION ||--o| TICKET : "may create"
    CUSTOMER ||--o{ LEAD : "maps to"
    WORKFLOW ||--o{ WORKFLOW_RUN : executes
    WORKFLOW_RUN ||--o{ STEP : "has (JSON)"
```
