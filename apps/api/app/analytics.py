import random
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models
from app.ai import INTENT_LABEL

ANCHOR = datetime(2026, 11, 1)


def _last14_labels() -> list[str]:
    out = []
    for i in range(13, -1, -1):
        d = ANCHOR - timedelta(days=i)
        out.append(f"{d.month}/{d.day}")
    return out


def support_analytics(db: Session) -> dict:
    r = random.Random(31001)
    volume = []
    for label in _last14_labels():
        total = 60 + r.randint(0, 89)
        ai = int(total * (0.68 + r.random() * 0.12))
        volume.append({"label": label, "ai": ai, "agent": total - ai})

    rows = db.execute(
        select(models.Conversation.intent, func.count())
        .where(models.Conversation.channel == "support")
        .group_by(models.Conversation.intent)
    ).all()
    intent_breakdown = sorted(
        [{"label": INTENT_LABEL.get(i, i), "value": c} for i, c in rows],
        key=lambda x: -x["value"],
    )
    csat_trend = [{"label": f"W{i+1}", "value": round(4.3 + r.random() * 0.5, 2)} for i in range(8)]

    support_total = db.scalar(select(func.count()).select_from(models.Conversation).where(models.Conversation.channel == "support")) or 1
    resolved = db.scalar(select(func.count()).select_from(models.Conversation).where(models.Conversation.channel == "support", models.Conversation.status == "resolved")) or 0
    handoff = db.scalar(select(func.count()).select_from(models.Conversation).where(models.Conversation.channel == "support", models.Conversation.status == "handoff")) or 0
    open_tickets = db.scalar(select(func.count()).select_from(models.Ticket).where(models.Ticket.status != "resolved")) or 0

    return {
        "volumeByDay": volume,
        "intentBreakdown": intent_breakdown,
        "csat": 4.6,
        "csatTrend": csat_trend,
        "avgFirstResponseSec": 38,
        "autoResolutionRate": round(resolved / support_total, 2),
        "handoffRate": round(handoff / support_total, 2),
        "openTickets": open_tickets,
    }


def sales_analytics(db: Session) -> dict:
    r = random.Random(32001)
    stages = ["new", "qualified", "proposal", "negotiation", "won", "lost"]
    leads = db.scalars(select(models.Lead)).all()
    by_stage = [{"label": s.capitalize(), "value": sum(1 for l in leads if l.stage == s)} for s in stages]
    conv_trend = []
    for i in range(8):
        created = 18 + r.randint(0, 15)
        conv_trend.append({"label": f"W{i+1}", "created": created, "won": int(created * (0.18 + r.random() * 0.12))})
    open_leads = [l for l in leads if l.stage not in ("won", "lost")]
    won = [l for l in leads if l.stage == "won"]
    bands = {"hot": 0, "warm": 0, "cold": 0}
    for l in leads:
        bands[l.band] += 1
    total = len(leads) or 1
    return {
        "pipelineByStage": by_stage,
        "conversionTrend": conv_trend,
        "pipelineValue": sum(l.value for l in open_leads),
        "winRate": round(len(won) / total, 2),
        "avgDealSize": round(sum(l.value for l in leads) / total),
        "bandBreakdown": [
            {"label": "Hot", "value": bands["hot"]},
            {"label": "Warm", "value": bands["warm"]},
            {"label": "Cold", "value": bands["cold"]},
        ],
    }


def overview_metrics(db: Session) -> dict:
    r = random.Random(33001)
    trend = []
    for label in _last14_labels():
        trend.append({"label": label, "support": 40 + r.randint(0, 69), "whatsapp": 25 + r.randint(0, 54)})
    leads = db.scalars(select(models.Lead)).all()
    open_leads = [l for l in leads if l.stage not in ("won", "lost")]
    support_n = db.scalar(select(func.count()).select_from(models.Conversation).where(models.Conversation.channel == "support")) or 0
    wa_n = db.scalar(select(func.count()).select_from(models.Conversation).where(models.Conversation.channel == "whatsapp")) or 0
    runs_today = db.scalar(select(func.sum(models.Workflow.runs_today))) or 0
    pending = db.scalar(select(func.count()).select_from(models.WorkflowRun).where(models.WorkflowRun.status == "pending_approval")) or 0
    return {
        "conversationsToday": support_n + wa_n,
        "autoResolutionRate": 0.82,
        "activeLeads": len(open_leads),
        "pipelineValue": sum(l.value for l in open_leads),
        "workflowRunsToday": int(runs_today),
        "pendingApprovals": pending,
        "csat": 4.6,
        "messagesTrend": trend,
        "channelSplit": [{"label": "Support", "value": support_n}, {"label": "WhatsApp", "value": wa_n}],
    }
