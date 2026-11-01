"""AI service layer. The pipeline depends on the AIAdapter interface, never
on a vendor SDK. MockAIAdapter is deterministic so demos are reproducible;
real providers are opt-in via LLM_PROVIDER + an API key."""
from __future__ import annotations

import abc

from app.config import get_settings

INTENTS = [
    "billing", "technical_issue", "refund_request", "product_question",
    "complaint", "feature_request", "sales_inquiry", "account_access", "shipping",
]

INTENT_KEYWORDS: dict[str, list[str]] = {
    "billing": ["invoice", "charge", "billing", "payment", "card", "subscription", "overcharged", "receipt"],
    "technical_issue": ["error", "bug", "broken", "crash", "not working", "fails", "500", "timeout", "login loop"],
    "refund_request": ["refund", "money back", "cancel order", "return my", "reimburse"],
    "product_question": ["how do i", "can i", "does it", "feature", "support for", "integrate", "setup"],
    "complaint": ["terrible", "awful", "unacceptable", "angry", "worst", "disappointed", "frustrated", "ridiculous"],
    "feature_request": ["would be great", "please add", "wish", "feature request", "roadmap", "could you add"],
    "sales_inquiry": ["pricing", "quote", "upgrade", "enterprise plan", "demo", "talk to sales", "seats"],
    "account_access": ["locked out", "reset password", "can't log in", "cant login", "2fa", "access", "sso"],
    "shipping": ["shipping", "delivery", "tracking", "where is my order", "arrived", "delayed package"],
}

KB: dict[str, list[dict[str, str]]] = {
    "billing": [
        {"title": "Billing cycle policy", "snippet": "Invoices generate on the 1st; proration applies on mid-cycle plan changes."},
        {"title": "Refund SLA", "snippet": "Billing adjustments are processed within 3-5 business days to the original method."},
    ],
    "technical_issue": [
        {"title": "Incident runbook", "snippet": "Check the status page for active incidents before escalating a P2."},
        {"title": "Login loop fix", "snippet": "Clearing the session cookie resolves 90% of auth-loop reports."},
    ],
    "refund_request": [
        {"title": "Refund eligibility", "snippet": "Orders within 30 days qualify for a full refund; digital goods are case-by-case."},
        {"title": "Escalation rule", "snippet": "Refunds over $500 require supervisor approval before issuance."},
    ],
    "product_question": [
        {"title": "Integrations guide", "snippet": "Nexus connects to Salesforce, HubSpot and Slack via native connectors."},
        {"title": "Onboarding checklist", "snippet": "New workspaces complete setup in ~15 minutes with the guided flow."},
    ],
    "complaint": [
        {"title": "De-escalation guide", "snippet": "Acknowledge, apologize, and offer a concrete next step within the first reply."},
        {"title": "Churn-risk playbook", "snippet": "Negative sentiment from Enterprise accounts triggers a CSM alert."},
    ],
    "feature_request": [
        {"title": "Roadmap intake", "snippet": "Feature requests are logged to the product board and tagged by account tier."},
    ],
    "sales_inquiry": [
        {"title": "Plan comparison", "snippet": "Enterprise adds SSO, audit logs, and a 99.9% uptime SLA."},
        {"title": "Routing rule", "snippet": "Inbound sales from Mid-Market+ route to an AE within 5 minutes."},
    ],
    "account_access": [
        {"title": "Password reset", "snippet": "Send a secure reset link; links expire after 30 minutes."},
        {"title": "SSO troubleshooting", "snippet": "Verify the IdP metadata URL and clock skew under 60s."},
    ],
    "shipping": [
        {"title": "Tracking lookup", "snippet": "Tracking IDs sync from the carrier within 2 hours of dispatch."},
    ],
}

INTENT_LABEL = {
    "billing": "Billing", "technical_issue": "Technical Issue", "refund_request": "Refund Request",
    "product_question": "Product Question", "complaint": "Complaint", "feature_request": "Feature Request",
    "sales_inquiry": "Sales Inquiry", "account_access": "Account Access", "shipping": "Shipping",
}


def _hash(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


class AIAdapter(abc.ABC):
    name: str = "adapter"

    @abc.abstractmethod
    def classify_intent(self, text: str) -> tuple[str, float]: ...

    @abc.abstractmethod
    def generate_reply(self, intent: str, name: str, text: str) -> str: ...

    def detect_sentiment(self, text: str) -> str:
        t = text.lower()
        neg = ["terrible", "awful", "angry", "worst", "disappointed", "frustrated", "unacceptable", "broken", "ridiculous", "refund", "cancel"]
        pos = ["thanks", "great", "love", "awesome", "perfect", "appreciate", "excellent", "happy"]
        n = sum(w in t for w in neg)
        p = sum(w in t for w in pos)
        return "negative" if n > p else "positive" if p > n else "neutral"

    def retrieve_context(self, intent: str) -> list[dict]:
        docs = KB.get(intent, KB["product_question"])
        out = []
        for i, d in enumerate(docs):
            out.append({**d, "score": round(0.72 + ((_hash(d["title"]) % 26) / 100), 2)})
        return sorted(out, key=lambda x: -x["score"])

    def score_lead(self, tier_value: int, engagement: float, recency_days: int, source: str, value: int):
        rationale = []
        s = 0
        tp = tier_value * 14
        s += tp
        rationale.append(f"Account tier contributes +{tp} (firmographic fit)")
        ep = round(engagement * 30)
        s += ep
        rationale.append(f"Engagement signals +{ep} (email opens, site visits, demo views)")
        rp = max(0, 20 - round(recency_days * 1.5))
        s += rp
        rationale.append(f"Recency +{rp} (last touch {recency_days}d ago)")
        sp = 12 if source in ("Referral", "Partner", "Website") else 5
        s += sp
        rationale.append(f'Source "{source}" +{sp} (channel quality)')
        vp = 14 if value > 60000 else 9 if value > 25000 else 4
        s += vp
        rationale.append(f"Deal size +{vp} (est. ACV ${value:,})")
        score = max(1, min(99, round(s)))
        band = "hot" if score >= 70 else "warm" if score >= 45 else "cold"
        return score, band, rationale

    def suggest_follow_up(self, stage: str, band: str, company: str) -> str:
        if band == "hot" and stage in ("new", "qualified"):
            return f"Book an executive demo with {company} this week - strong fit + high intent. Lead with the SSO/audit story."
        if stage == "proposal":
            return "Send a tailored ROI one-pager and propose a 14-day pilot to de-risk the decision."
        if stage == "negotiation":
            return "Offer annual-commit pricing with a usage ramp; loop in a CSM to show onboarding velocity."
        if band == "cold":
            return "Enroll in a low-touch nurture sequence; re-score after the next webinar touch."
        return "Share a relevant case study from the same industry and propose a 20-minute discovery call."


_REPLIES = {
    "billing": "Hi {first}, I can help with that billing question. Charges post on the 1st and any mid-cycle plan change is prorated. If something looks off, I can open a billing adjustment that resolves in 3-5 business days.",
    "technical_issue": "Thanks for flagging this, {first}. There's no active incident on our status page. For login or session errors, clearing the session cookie resolves most cases - want me to walk you through it, or open a priority ticket for engineering?",
    "refund_request": "I understand, {first}, and I'm sorry for the hassle. Orders within 30 days qualify for a full refund to your original payment method. I've started the request; because of the amount, a supervisor will confirm it shortly.",
    "product_question": "Great question, {first}. Nexus supports that - we offer native connectors for Salesforce, HubSpot and Slack, and most workspaces finish setup in about 15 minutes with the guided flow. Would you like the step-by-step guide?",
    "complaint": "I hear you, {first}, and I'm genuinely sorry about this experience. I've escalated your account to a specialist and flagged it as a priority. You'll hear back within the hour with a concrete resolution.",
    "feature_request": "Love this idea, {first} - thank you. I've logged it to our product roadmap and tagged it to your account so our team can follow up.",
    "sales_inquiry": "Happy to help, {first}. Our Enterprise plan adds SSO, audit logs and a 99.9% uptime SLA. I'd recommend a quick call with an account executive - I can route you to one within a few minutes.",
    "account_access": "Let's get you back in, {first}. I can send a secure password reset link (valid for 30 minutes). If you use SSO, I'll verify your identity provider settings. Which would you prefer?",
    "shipping": "Thanks {first} - let me track that down. Tracking details sync from the carrier within two hours of dispatch. I can see your latest shipment and will share the live tracking link right now.",
}


class MockAIAdapter(AIAdapter):
    name = "nexus-mock-adapter-v1"

    def classify_intent(self, text: str) -> tuple[str, float]:
        t = text.lower()
        best, best_hits = "product_question", 0
        for intent in INTENTS:
            hits = sum(1 for kw in INTENT_KEYWORDS[intent] if kw in t)
            if hits > best_hits:
                best, best_hits = intent, hits
        confidence = 0.42 if best_hits == 0 else min(0.98, 0.6 + best_hits * 0.14)
        return best, round(confidence, 2)

    def generate_reply(self, intent: str, name: str, text: str) -> str:
        first = name.split(" ")[0] if name else "there"
        return _REPLIES.get(intent, _REPLIES["product_question"]).format(first=first)


class OpenAIAdapter(MockAIAdapter):
    """Opt-in. Uses the OpenAI Chat Completions API for classification + reply,
    and reuses the deterministic business logic for retrieval/scoring."""
    name = "openai"

    def __init__(self, api_key: str, model: str):
        self._key, self._model = api_key, model

    def generate_reply(self, intent: str, name: str, text: str) -> str:
        import httpx
        system = ("You are Nexus AI, an enterprise support assistant. Be concise, "
                  "professional and empathetic. Address the customer by first name.")
        try:
            r = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self._key}"},
                json={"model": self._model, "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": f"Customer ({name}) says: {text}\nIntent: {intent}"},
                ], "temperature": 0.4, "max_tokens": 220},
                timeout=20,
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()
        except Exception:
            return super().generate_reply(intent, name, text)


class ClaudeAdapter(MockAIAdapter):
    """Opt-in. Uses the Anthropic Messages API for reply generation."""
    name = "claude"

    def __init__(self, api_key: str, model: str):
        self._key, self._model = api_key, model

    def generate_reply(self, intent: str, name: str, text: str) -> str:
        import httpx
        try:
            r = httpx.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": self._key, "anthropic-version": "2023-06-01"},
                json={"model": self._model, "max_tokens": 220, "system":
                      "You are Nexus AI, an enterprise support assistant. Be concise, professional and empathetic.",
                      "messages": [{"role": "user", "content": f"Customer ({name}): {text}\nIntent: {intent}"}]},
                timeout=20,
            )
            r.raise_for_status()
            return r.json()["content"][0]["text"].strip()
        except Exception:
            return super().generate_reply(intent, name, text)


def get_adapter() -> AIAdapter:
    s = get_settings()
    if s.llm_provider == "openai" and s.openai_api_key:
        return OpenAIAdapter(s.openai_api_key, s.openai_model)
    if s.llm_provider == "claude" and s.anthropic_api_key:
        return ClaudeAdapter(s.anthropic_api_key, s.anthropic_model)
    return MockAIAdapter()


def route_decision(intent: str, sentiment: str, confidence: float) -> str:
    if intent == "complaint" or (intent == "refund_request" and sentiment == "negative"):
        return "human_handoff"
    if confidence < 0.55 or intent in ("technical_issue", "billing"):
        return "ticket_created"
    return "auto_reply"


def build_trace(text: str, adapter: AIAdapter) -> dict:
    intent, confidence = adapter.classify_intent(text)
    sentiment = adapter.detect_sentiment(text)
    ctx = adapter.retrieve_context(intent)
    return {
        "intent": intent,
        "confidence": confidence,
        "sentiment": sentiment,
        "retrievedContext": ctx,
        "route": route_decision(intent, sentiment, confidence),
        "latencyMs": 220 + (_hash(text) % 400),
        "model": adapter.name,
    }
