from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class CustomerOut(CamelModel):
    id: str
    name: str
    company: str
    email: str
    tier: str
    region: str
    seed: int


class MessageOut(CamelModel):
    id: str
    conversation_id: str
    role: str
    text: str
    created_at: datetime
    intent: str | None = None
    confidence: float | None = None


class ConversationOut(CamelModel):
    id: str
    channel: str
    customer_id: str
    status: str
    intent: str
    sentiment: str
    created_at: datetime
    last_message_at: datetime
    assigned_agent: str | None = None
    unread: int
    messages: list[MessageOut]


class TicketOut(CamelModel):
    id: str
    conversation_id: str
    customer_id: str
    subject: str
    category: str
    priority: str
    status: str
    created_at: datetime
    sla_due_at: datetime
    assigned_agent: str | None = None


class LeadOut(CamelModel):
    id: str
    name: str
    company: str
    email: str
    source: str
    stage: str
    score: int
    band: str
    value: int
    owner: str
    last_touch: datetime
    categories: list[str]
    rationale: list[str]
    follow_up: str
    created_at: datetime


class WorkflowOut(CamelModel):
    id: str
    name: str
    description: str
    trigger: str
    enabled: bool
    category: str
    success_rate: float
    runs_today: int
    avg_duration_ms: int
    last_run: datetime


class WorkflowRunOut(CamelModel):
    id: str
    workflow_id: str
    status: str
    started_at: datetime
    duration_ms: int
    trigger: str
    steps: list[dict[str, Any]]
    requires_approval: bool


class TemplateOut(CamelModel):
    id: str
    name: str
    channel: str
    category: str
    body: str
    usage_count: int


# ---- request bodies ----
class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    conversation_id: str | None = Field(default=None, alias="conversationId")
    customer_id: str | None = Field(default=None, alias="customerId")
    model_config = ConfigDict(populate_by_name=True)


class TraceIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class DecisionIn(BaseModel):
    decision: str
