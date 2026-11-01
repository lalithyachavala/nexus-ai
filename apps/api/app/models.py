from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    company: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String)
    tier: Mapped[str] = mapped_column(String)
    region: Mapped[str] = mapped_column(String)
    seed: Mapped[int] = mapped_column(Integer)


class Conversation(Base):
    __tablename__ = "conversations"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    channel: Mapped[str] = mapped_column(String, index=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"))
    status: Mapped[str] = mapped_column(String, index=True)
    intent: Mapped[str] = mapped_column(String)
    sentiment: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    last_message_at: Mapped[datetime] = mapped_column(DateTime)
    assigned_agent: Mapped[str | None] = mapped_column(String, nullable=True)
    unread: Mapped[int] = mapped_column(Integer, default=0)
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at"
    )


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"))
    role: Mapped[str] = mapped_column(String)
    text: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    intent: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


class Ticket(Base):
    __tablename__ = "tickets"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String)
    customer_id: Mapped[str] = mapped_column(String)
    subject: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    priority: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    sla_due_at: Mapped[datetime] = mapped_column(DateTime)
    assigned_agent: Mapped[str | None] = mapped_column(String, nullable=True)


class Lead(Base):
    __tablename__ = "leads"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    company: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String)
    source: Mapped[str] = mapped_column(String)
    stage: Mapped[str] = mapped_column(String)
    score: Mapped[int] = mapped_column(Integer)
    band: Mapped[str] = mapped_column(String)
    value: Mapped[int] = mapped_column(Integer)
    owner: Mapped[str] = mapped_column(String)
    last_touch: Mapped[datetime] = mapped_column(DateTime)
    categories: Mapped[list] = mapped_column(JSON)
    rationale: Mapped[list] = mapped_column(JSON)
    follow_up: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class Workflow(Base):
    __tablename__ = "workflows"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    trigger: Mapped[str] = mapped_column(String)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    category: Mapped[str] = mapped_column(String)
    success_rate: Mapped[float] = mapped_column(Float)
    runs_today: Mapped[int] = mapped_column(Integer)
    avg_duration_ms: Mapped[int] = mapped_column(Integer)
    last_run: Mapped[datetime] = mapped_column(DateTime)


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    workflow_id: Mapped[str] = mapped_column(String, index=True)
    status: Mapped[str] = mapped_column(String)
    started_at: Mapped[datetime] = mapped_column(DateTime)
    duration_ms: Mapped[int] = mapped_column(Integer)
    trigger: Mapped[str] = mapped_column(String)
    steps: Mapped[list] = mapped_column(JSON)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False)


class Template(Base):
    __tablename__ = "templates"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    channel: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(String)
    usage_count: Mapped[int] = mapped_column(Integer)
