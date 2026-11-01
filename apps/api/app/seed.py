"""Deterministic synthetic data. Seeded so the DB is reproducible across runs.
Mirrors the frontend mock engine so live and mock modes look consistent."""
import random
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.ai import MockAIAdapter, INTENT_LABEL, INTENTS, build_trace

NOW = datetime(2026, 11, 1, 14, 20, 0)
AI = MockAIAdapter()

FIRST = ["Amara", "Diego", "Priya", "Noah", "Lina", "Mateo", "Sofia", "Kenji", "Hana", "Omar", "Elena", "Theo", "Yara", "Ivan", "Chloe", "Raj", "Nina", "Felix", "Zara", "Luca"]
LAST = ["Okafor", "Reyes", "Sharma", "Bennett", "Haas", "Rossi", "Cruz", "Tanaka", "Kim", "Nasser", "Petrova", "Lindqvist", "Haddad", "Novak", "Dubois", "Mehta", "Andersen", "Moreau", "Costa", "Ferraro"]
COMPANIES = ["Northwind Logistics", "Lumen Retail", "Vertex Health", "Orbit Fintech", "Cedar Foods", "Helio Energy", "Atlas Freight", "Brightwave Media", "Ironclad Security", "Pinecone Labs", "Solstice Travel", "Bluefin Analytics", "Maple & Co", "Quanta Devices", "Riverstone Bank"]
REGIONS = ["NA-East", "NA-West", "EMEA", "APAC", "LATAM"]
TIERS = ["SMB", "Mid-Market", "Enterprise"]
AGENTS = ["Dana Whitfield", "Marcus Lee", "Priyanka Rao", "Tomas Herrera"]
SOURCES = ["Website", "Webinar", "Outbound", "Referral", "Trade Show", "Content", "Partner"]

OPENERS = {
    "billing": "Hi, I was charged twice on my latest invoice and need this corrected.",
    "technical_issue": "The dashboard keeps throwing a 500 error when I try to export reports.",
    "refund_request": "I'd like a refund for last month - we never managed to use the product.",
    "product_question": "Does Nexus integrate with Salesforce, and how long does setup take?",
    "complaint": "This is unacceptable - the third outage this week and no updates. Frustrated.",
    "feature_request": "It would be great if you could add bulk CSV import for contacts.",
    "sales_inquiry": "We're evaluating upgrading to Enterprise for 120 seats - can I get pricing?",
    "account_access": "I'm locked out of my account and the password reset email never arrives.",
    "shipping": "Where is my order? The tracking hasn't updated in four days.",
}


def _hash(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def seed_if_empty(db: Session) -> None:
    models.Base = models.Base  # noqa
    if db.scalar(select(models.Customer).limit(1)):
        return

    r = random.Random(1001)
    customers: list[models.Customer] = []
    for i in range(24):
        name = f"{r.choice(FIRST)} {r.choice(LAST)}"
        company = r.choice(COMPANIES)
        email = name.lower().replace(" ", ".") + "@" + "".join(c for c in company.lower() if c.isalpha()) + ".example"
        cust = models.Customer(id=f"cus_{1000+i}", name=name, company=company, email=email,
                               tier=r.choice(TIERS), region=r.choice(REGIONS), seed=_hash(name))
        customers.append(cust)
        db.add(cust)

    def build_convs(channel: str, n: int, seed: int):
        rr = random.Random(seed)
        for i in range(n):
            cust = rr.choice(customers)
            intent = rr.choice(INTENTS)
            opener = OPENERS[intent]
            trace = build_trace(opener, AI)
            created_mins = 30 + rr.randint(0, 2000)
            roll = rr.random()
            status = ("handoff" if trace["route"] == "human_handoff"
                      else "resolved" if roll > 0.75 else "waiting" if roll > 0.5 else "active")
            prefix = "cnv" if channel == "support" else "wa"
            base = 3000 + (0 if channel == "support" else 100) + i
            conv_id = f"{prefix}_{base}"
            conv = models.Conversation(
                id=conv_id, channel=channel, customer_id=cust.id, status=status,
                intent=intent, sentiment=trace["sentiment"],
                created_at=NOW - timedelta(minutes=created_mins),
                last_message_at=NOW - timedelta(minutes=created_mins - 2),
                assigned_agent=rr.choice(AGENTS) if status == "handoff" else None,
                unread=rr.randint(0, 2) if status == "active" else 0,
            )
            db.add(conv)
            db.add(models.Message(id=f"{conv_id}_m1", conversation_id=conv_id, role="customer",
                                  text=opener, created_at=NOW - timedelta(minutes=created_mins),
                                  intent=trace["intent"], confidence=trace["confidence"]))
            db.add(models.Message(id=f"{conv_id}_m2", conversation_id=conv_id, role="ai",
                                  text=AI.generate_reply(trace["intent"], cust.name, opener),
                                  created_at=NOW - timedelta(minutes=created_mins - 1)))
            if status == "handoff":
                db.add(models.Message(id=f"{conv_id}_m3", conversation_id=conv_id, role="system",
                                      text=f"Escalated to {rr.choice(AGENTS)} - negative sentiment on {INTENT_LABEL[intent]}.",
                                      created_at=NOW - timedelta(minutes=created_mins - 2)))

    build_convs("support", 14, 2001)
    build_convs("whatsapp", 10, 2002)
    db.flush()

    # tickets from support/whatsapp convs with actionable intents
    rt = random.Random(4001)
    tnum = 5000
    convs = db.scalars(select(models.Conversation)).all()
    for c in convs:
        if c.intent not in ("technical_issue", "billing", "refund_request", "account_access"):
            continue
        priority = ("urgent" if c.sentiment == "negative" else "high" if c.intent == "technical_issue"
                    else "medium" if rt.random() > 0.5 else "low")
        status = ("resolved" if c.status == "resolved" else "escalated" if c.status == "handoff"
                  else "open" if rt.random() > 0.5 else "pending")
        company = next((x.company for x in customers if x.id == c.customer_id), "")
        db.add(models.Ticket(id=f"tkt_{tnum}", conversation_id=c.id, customer_id=c.customer_id,
                             subject=f"{INTENT_LABEL[c.intent]} - {company}", category=c.intent,
                             priority=priority, status=status, created_at=c.created_at,
                             sla_due_at=NOW + timedelta(days=0 if priority == "urgent" else 1 if priority == "high" else 2),
                             assigned_agent=c.assigned_agent or (rt.choice(AGENTS) if status != "open" else None)))
        tnum += 1

    # leads
    rl = random.Random(6001)
    stages = ["new", "qualified", "proposal", "negotiation", "won", "lost"]
    for i in range(28):
        name = f"{rl.choice(FIRST)} {rl.choice(LAST)}"
        company = rl.choice(COMPANIES)
        stage = rl.choice(stages)
        tier_value = rl.randint(0, 3)
        source = rl.choice(SOURCES)
        value = 8000 + rl.randint(0, 90000)
        recency = rl.randint(0, 13)
        engagement = rl.random()
        score, band, rationale = AI.score_lead(tier_value, engagement, recency, source, value)
        categories = ["Enterprise-fit" if tier_value >= 2 else "SMB",
                      "High-intent" if engagement > 0.6 else "Nurture", source]
        email = name.lower().replace(" ", ".") + "@" + "".join(c for c in company.lower() if c.isalpha()) + ".example"
        db.add(models.Lead(id=f"led_{7000+i}", name=name, company=company, email=email, source=source,
                          stage=stage, score=score, band=band, value=value, owner=rl.choice(AGENTS),
                          last_touch=NOW - timedelta(days=recency), categories=categories, rationale=rationale,
                          follow_up=AI.suggest_follow_up(stage, band, company),
                          created_at=NOW - timedelta(days=recency + rl.randint(0, 30))))

    # workflows
    wfs = [
        ("wf_1", "Auto-triage inbound support", "Classify intent, retrieve context, auto-reply or create ticket.", "On new support message", True, "support", 0.97, 142, 640, 3),
        ("wf_2", "WhatsApp first response", "Draft an AI reply for inbound WhatsApp and send if confidence > 0.7.", "On new WhatsApp message", True, "whatsapp", 0.94, 88, 710, 1),
        ("wf_3", "Lead scoring & routing", "Score new leads and route hot leads to an AE within 5 minutes.", "On new lead", True, "sales", 0.99, 37, 420, 9),
        ("wf_4", "Refund approval gate", "Pause refunds over $500 for human approval before issuing.", "On refund request", True, "ops", 1.0, 6, 1200, 22),
        ("wf_5", "Churn-risk CSM alert", "Notify a CSM when an Enterprise account shows negative sentiment.", "On negative sentiment", False, "support", 0.9, 0, 300, 1440),
        ("wf_6", "Nightly analytics rollup", "Aggregate conversation + pipeline metrics into dashboards.", "Daily 02:00 UTC", True, "ops", 0.98, 1, 5400, 740),
    ]
    for (wid, nm, desc, trig, en, cat, sr, rt_, dur, last_min) in wfs:
        db.add(models.Workflow(id=wid, name=nm, description=desc, trigger=trig, enabled=en, category=cat,
                              success_rate=sr, runs_today=rt_, avg_duration_ms=dur,
                              last_run=NOW - timedelta(minutes=last_min)))

    # runs
    rrun = random.Random(8001)
    rid = 9000
    for (wid, nm, desc, trig, en, cat, sr, rt_, dur, last_min) in wfs:
        count = 4 + rrun.randint(0, 3)
        for i in range(count):
            roll = rrun.random()
            needs = wid == "wf_4"
            status = ("pending_approval" if needs and i == 0 else "failed" if roll > 0.9
                      else "running" if i == 0 and roll > 0.6 else "success")
            steps = [
                {"name": "Ingest", "status": "done"},
                {"name": "Classify intent", "status": "done", "detail": "confidence 0.91"},
                {"name": "Retrieve context", "status": "done", "detail": "2 docs"},
                {"name": "Generate action", "status": "running" if status == "running" else "failed" if status == "failed" else "done"},
                {"name": "Human approval" if needs else "Execute",
                 "status": "pending" if status in ("pending_approval", "running") else "skipped" if status == "failed" else "done"},
            ]
            db.add(models.WorkflowRun(id=f"run_{rid}", workflow_id=wid, status=status,
                                     started_at=NOW - timedelta(minutes=i * 17 + rrun.randint(0, 10)),
                                     duration_ms=dur + rrun.randint(-150, 150), trigger=trig,
                                     steps=steps, requires_approval=needs))
            rid += 1

    # templates
    tpls = [
        ("tpl_1", "Order status", "whatsapp", "Shipping", "Hi {{name}}! Your order {{order_id}} is on the way. Live tracking: {{tracking_url}}", 1240),
        ("tpl_2", "Payment reminder", "whatsapp", "Billing", "Hi {{name}}, a quick reminder that invoice {{invoice_id}} is due on {{due_date}}. Reply PAY to settle instantly.", 870),
        ("tpl_3", "Appointment confirm", "whatsapp", "Scheduling", "Hi {{name}}, confirming your appointment on {{date}} at {{time}}. Reply C to confirm or R to reschedule.", 655),
        ("tpl_4", "CSAT follow-up", "whatsapp", "Support", "Thanks for contacting us, {{name}}! How did we do? Rate 1-5 so we can keep improving.", 2110),
        ("tpl_5", "Refund confirmation", "whatsapp", "Billing", "Hi {{name}}, your refund of {{amount}} is approved and will reach your account in 3-5 business days.", 318),
    ]
    for (tid, nm, ch, cat, body, uc) in tpls:
        db.add(models.Template(id=tid, name=nm, channel=ch, category=cat, body=body, usage_count=uc))

    db.commit()
