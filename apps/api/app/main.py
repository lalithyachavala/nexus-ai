import asyncio
import json
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import analytics, models, schemas
from app.ai import build_trace, get_adapter
from app.config import get_settings
from app.db import SessionLocal, engine, get_db
from app.seed import seed_if_empty

settings = get_settings()
app = FastAPI(
    title="Nexus AI API",
    version="0.1.0",
    description="Independent illustrative engineering demonstration. Synthetic data only.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "adapter": get_adapter().name, "database": settings.database_url.split("://")[0]}


# ---------------- overview / customers ----------------
@app.get("/overview")
def overview(db: Session = Depends(get_db)):
    return analytics.overview_metrics(db)


@app.get("/customers", response_model=list[schemas.CustomerOut])
def customers(db: Session = Depends(get_db)):
    return db.scalars(select(models.Customer)).all()


# ---------------- support ----------------
def _convs(db: Session, channel: str):
    return db.scalars(
        select(models.Conversation)
        .where(models.Conversation.channel == channel)
        .order_by(models.Conversation.last_message_at.desc())
    ).all()


@app.get("/support/conversations", response_model=list[schemas.ConversationOut])
def support_conversations(db: Session = Depends(get_db)):
    return _convs(db, "support")


@app.get("/support/analytics")
def support_analytics(db: Session = Depends(get_db)):
    return analytics.support_analytics(db)


@app.get("/whatsapp/conversations", response_model=list[schemas.ConversationOut])
def whatsapp_conversations(db: Session = Depends(get_db)):
    return _convs(db, "whatsapp")


@app.get("/whatsapp/templates", response_model=list[schemas.TemplateOut])
def templates(db: Session = Depends(get_db)):
    return db.scalars(select(models.Template)).all()


@app.get("/tickets", response_model=list[schemas.TicketOut])
def tickets(db: Session = Depends(get_db)):
    return db.scalars(select(models.Ticket).order_by(models.Ticket.created_at.desc())).all()


def _send(channel: str, body: schemas.MessageIn, db: Session):
    adapter = get_adapter()
    conv = None
    if body.conversation_id:
        conv = db.get(models.Conversation, body.conversation_id)
    if conv is None:
        conv = _convs(db, channel)[0] if _convs(db, channel) else None
    customer = db.get(models.Customer, conv.customer_id) if conv else None
    name = customer.name if customer else "there"
    trace = build_trace(body.text, adapter)
    reply = adapter.generate_reply(trace["intent"], name, body.text)
    if conv:
        now = datetime.utcnow()
        n = len(conv.messages)
        db.add(models.Message(id=f"{conv.id}_u{n+1}", conversation_id=conv.id, role="customer",
                              text=body.text, created_at=now, intent=trace["intent"], confidence=trace["confidence"]))
        db.add(models.Message(id=f"{conv.id}_a{n+2}", conversation_id=conv.id, role="ai",
                              text=reply, created_at=now))
        conv.last_message_at = now
        conv.intent = trace["intent"]
        conv.sentiment = trace["sentiment"]
        if trace["route"] == "human_handoff":
            conv.status = "handoff"
        db.commit()
    return {"trace": trace, "reply": reply, "conversationId": conv.id if conv else None}


@app.post("/support/messages")
def support_send(body: schemas.MessageIn, db: Session = Depends(get_db)):
    return _send("support", body, db)


@app.post("/whatsapp/messages")
def whatsapp_send(body: schemas.MessageIn, db: Session = Depends(get_db)):
    return _send("whatsapp", body, db)


# ---------------- pipeline trace ----------------
@app.post("/pipeline/trace")
def pipeline_trace(body: schemas.TraceIn):
    return build_trace(body.text, get_adapter())


# ---------------- SSE streaming reply ----------------
@app.get("/support/stream")
async def support_stream(text: str, name: str = "there"):
    if not text.strip():
        raise HTTPException(status_code=422, detail="text is required")
    adapter = get_adapter()
    trace = build_trace(text, adapter)
    reply = adapter.generate_reply(trace["intent"], name, text)

    async def gen():
        yield f"event: trace\ndata: {json.dumps(trace)}\n\n"
        import re
        for tok in re.split(r"(\s+)", reply):
            yield f"event: token\ndata: {json.dumps(tok)}\n\n"
            await asyncio.sleep(0.022)
        yield "event: done\ndata: end\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache, no-transform"})


# ---------------- sales ----------------
@app.get("/sales/leads", response_model=list[schemas.LeadOut])
def leads(db: Session = Depends(get_db)):
    return db.scalars(select(models.Lead).order_by(models.Lead.score.desc())).all()


@app.get("/sales/analytics")
def sales_analytics(db: Session = Depends(get_db)):
    return analytics.sales_analytics(db)


@app.post("/sales/leads/{lead_id}/rescore", response_model=schemas.LeadOut)
def rescore(lead_id: str, db: Session = Depends(get_db)):
    import random
    lead = db.get(models.Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail=f"Lead {lead_id} not found")
    adapter = get_adapter()
    tier_value = 3 if "Enterprise-fit" in lead.categories else 1
    score, band, rationale = adapter.score_lead(tier_value, random.random(), 0, lead.source, lead.value)
    lead.score, lead.band, lead.rationale = score, band, rationale
    lead.follow_up = adapter.suggest_follow_up(lead.stage, band, lead.company)
    lead.last_touch = datetime.utcnow()
    db.commit()
    db.refresh(lead)
    return lead


# ---------------- automation ----------------
@app.get("/automation/workflows", response_model=list[schemas.WorkflowOut])
def workflows(db: Session = Depends(get_db)):
    return db.scalars(select(models.Workflow)).all()


@app.get("/automation/runs", response_model=list[schemas.WorkflowRunOut])
def runs(db: Session = Depends(get_db)):
    return db.scalars(select(models.WorkflowRun).order_by(models.WorkflowRun.started_at.desc())).all()


@app.post("/automation/workflows/{wf_id}/toggle", response_model=schemas.WorkflowOut)
def toggle(wf_id: str, db: Session = Depends(get_db)):
    wf = db.get(models.Workflow, wf_id)
    if not wf:
        raise HTTPException(status_code=404, detail=f"Workflow {wf_id} not found")
    wf.enabled = not wf.enabled
    db.commit()
    db.refresh(wf)
    return wf


@app.post("/automation/runs/{run_id}/decision", response_model=schemas.WorkflowRunOut)
def decision(run_id: str, body: schemas.DecisionIn, db: Session = Depends(get_db)):
    run = db.get(models.WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    if body.decision not in ("approve", "reject"):
        raise HTTPException(status_code=422, detail="decision must be 'approve' or 'reject'")
    approved = body.decision == "approve"
    run.status = "success" if approved else "failed"
    run.steps = [
        {**s, "status": ("done" if approved else "skipped")} if s.get("status") == "pending" else s
        for s in run.steps
    ]
    db.commit()
    db.refresh(run)
    return run
