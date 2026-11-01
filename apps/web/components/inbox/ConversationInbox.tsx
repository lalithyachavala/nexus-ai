"use client";
import * as React from "react";
import { api, streamReply } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { Card, Button, Textarea, Avatar, Skeleton, EmptyState, ErrorState, Badge } from "@/components/ui/primitives";
import { StatusBadge, IntentBadge, SentimentBadge } from "@/components/ui/badges";
import { PipelinePanel } from "@/components/inbox/PipelinePanel";
import type { Channel, Conversation, Customer, Message, PipelineTrace } from "@/lib/types";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/ui";
import { Send, CornerUpRight, Search } from "lucide-react";

export function ConversationInbox({
  channel,
  rightExtra,
}: {
  channel: Channel;
  rightExtra?: React.ReactNode;
}) {
  const load = channel === "support" ? api.support.conversations : api.whatsapp.conversations;
  const convs = useAsync<Conversation[]>(() => load(), [channel]);
  const customers = useAsync<Customer[]>(() => api.customers(), []);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [streamText, setStreamText] = React.useState<string | null>(null);
  const [trace, setTrace] = React.useState<PipelineTrace | null>(null);
  const [localMsgs, setLocalMsgs] = React.useState<Record<string, Message[]>>({});
  const [error, setError] = React.useState<string | null>(null);
  const threadRef = React.useRef<HTMLDivElement>(null);

  const custMap = React.useMemo(() => {
    const m = new Map<string, Customer>();
    customers.data?.forEach((c) => m.set(c.id, c));
    return m;
  }, [customers.data]);

  const list = convs.data ?? [];
  const selected = list.find((c) => c.id === selectedId) ?? list[0] ?? null;
  const selectedCustomer = selected ? custMap.get(selected.customerId) : undefined;

  // auto-select first + load its trace
  React.useEffect(() => {
    if (!selectedId && list.length) setSelectedId(list[0].id);
  }, [list, selectedId]);

  // Recompute the pipeline trace when switching conversation (shows how the AI classified the opener).
  React.useEffect(() => {
    if (!selected) return;
    const opener = selected.messages.find((m) => m.role === "customer");
    if (!opener) return;
    let alive = true;
    api.pipeline
      .trace(opener.text)
      .then((t) => alive && setTrace(t))
      .catch(() => alive && setTrace(null));
    return () => {
      alive = false;
    };
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const threadMessages: Message[] = selected
    ? [...selected.messages, ...(localMsgs[selected.id] ?? [])]
    : [];

  React.useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [threadMessages.length, streamText]);

  const filtered = list.filter((c) => {
    const cust = custMap.get(c.customerId);
    const q = filter.toLowerCase();
    return !q || cust?.name.toLowerCase().includes(q) || cust?.company.toLowerCase().includes(q);
  });

  function send() {
    setError(null);
    const text = draft.trim();
    if (!text) {
      setError("Message cannot be empty.");
      return;
    }
    if (!selected) return;
    const now = new Date().toISOString();
    const userMsg: Message = {
      id: `${selected.id}_local_${Date.now()}`,
      conversationId: selected.id,
      role: "customer",
      text,
      createdAt: now,
    };
    setLocalMsgs((prev) => ({ ...prev, [selected.id]: [...(prev[selected.id] ?? []), userMsg] }));
    setDraft("");
    setSending(true);
    setStreamText("");

    let acc = "";
    streamReply(
      { text, name: selectedCustomer?.name ?? "there" },
      {
        onTrace: (t) => setTrace(t),
        onToken: (tok) => {
          acc += tok;
          setStreamText(acc);
        },
        onDone: () => {
          const aiMsg: Message = {
            id: `${selected.id}_ai_${Date.now()}`,
            conversationId: selected.id,
            role: "ai",
            text: acc,
            createdAt: new Date().toISOString(),
          };
          setLocalMsgs((prev) => ({ ...prev, [selected.id]: [...(prev[selected.id] ?? []), aiMsg] }));
          setStreamText(null);
          setSending(false);
        },
        onError: () => {
          setError("The AI stream was interrupted. Please retry.");
          setStreamText(null);
          setSending(false);
        },
      }
    );
  }

  if (convs.error) return <Card className="p-2"><ErrorState message={convs.error} onRetry={convs.reload} /></Card>;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
      {/* Conversation list */}
      <Card className="flex max-h-[720px] flex-col overflow-hidden">
        <div className="border-b border-line-soft p-3">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5">
            <Search className="h-3.5 w-3.5 text-muted" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name or company"
              className="h-8 w-full bg-transparent text-[13px] outline-none placeholder:text-muted/70"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convs.loading ? (
            <div className="space-y-3 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No conversations" hint="Try a different filter." />
          ) : (
            filtered.map((c) => {
              const cust = custMap.get(c.customerId);
              const active = c.id === selected?.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-line-soft px-3 py-3 text-left transition-colors",
                    active ? "bg-brand-soft/50" : "hover:bg-surface-2"
                  )}
                >
                  {cust && <Avatar name={cust.name} seed={cust.seed} size={34} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13.5px] font-semibold text-ink">{cust?.name}</span>
                      <span className="shrink-0 text-[11px] text-muted">{relativeTime(c.lastMessageAt)}</span>
                    </div>
                    <p className="truncate text-[12px] text-muted">{cust?.company}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <StatusBadge status={c.status} />
                      {c.unread > 0 && (
                        <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Card>

      {/* Thread + composer */}
      <Card className="flex max-h-[720px] flex-col overflow-hidden">
        {selected && selectedCustomer ? (
          <>
            <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={selectedCustomer.name} seed={selectedCustomer.seed} size={38} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-ink">{selectedCustomer.name}</span>
                    <Badge tone="neutral">{selectedCustomer.tier}</Badge>
                  </div>
                  <p className="text-[12px] text-muted">
                    {selectedCustomer.company} · {selectedCustomer.region}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <IntentBadge intent={selected.intent} />
                {selected.status !== "handoff" && (
                  <Button size="sm" variant="secondary">
                    <CornerUpRight className="h-3.5 w-3.5" /> Hand off
                  </Button>
                )}
              </div>
            </div>

            <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto bg-surface-2/40 p-4">
              {threadMessages.map((m) => (
                <MessageBubble key={m.id} msg={m} customerName={selectedCustomer.name} seed={selectedCustomer.seed} />
              ))}
              {streamText !== null && (
                <MessageBubble
                  msg={{ id: "streaming", conversationId: selected.id, role: "ai", text: streamText, createdAt: new Date().toISOString() }}
                  customerName={selectedCustomer.name}
                  seed={selectedCustomer.seed}
                  streaming
                />
              )}
            </div>

            <div className="border-t border-line-soft p-3">
              {error && <p className="mb-2 text-[12px] font-medium text-danger">{error}</p>}
              <div className="flex items-end gap-2">
                <Textarea
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type a customer message to see the AI pipeline respond…"
                  maxLength={2000}
                />
                <Button aria-label="Send message" variant="primary" onClick={send} loading={sending} className="h-[52px] px-4">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                Enter to send · the AI classifies intent, retrieves context, and streams a reply.
              </p>
            </div>
          </>
        ) : convs.loading ? (
          <div className="flex-1 space-y-4 p-6">
            <Skeleton className="h-16" />
            <Skeleton className="h-16 w-2/3" />
          </div>
        ) : (
          <EmptyState title="Select a conversation" hint="Pick a thread to view the AI pipeline." />
        )}
      </Card>

      {/* Right: AI pipeline panel + extra */}
      <div className="space-y-4">
        <PipelinePanel trace={trace} />
        {rightExtra}
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  customerName,
  seed,
  streaming,
}: {
  msg: Message;
  customerName: string;
  seed: number;
  streaming?: boolean;
}) {
  if (msg.role === "system") {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-warn-soft px-3 py-1 text-[11.5px] font-medium text-warn">{msg.text}</span>
      </div>
    );
  }
  const isCustomer = msg.role === "customer";
  return (
    <div className={cn("flex items-end gap-2", isCustomer ? "justify-start" : "justify-end")}>
      {isCustomer && <Avatar name={customerName} seed={seed} size={28} />}
      <div className={cn("max-w-[78%]")}>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
            isCustomer
              ? "rounded-bl-sm bg-surface border border-line text-ink"
              : msg.role === "agent"
                ? "rounded-br-sm bg-ink text-white"
                : "rounded-br-sm bg-brand text-white"
          )}
        >
          {msg.text}
          {streaming && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse-dot bg-white/80 align-middle" />}
        </div>
        <div className={cn("mt-1 flex items-center gap-2 text-[10.5px] text-muted", isCustomer ? "justify-start" : "justify-end")}>
          {msg.role === "ai" && <span className="font-medium text-brand">AI reply</span>}
          {msg.role === "agent" && <span className="font-medium">Agent</span>}
          <span>{relativeTime(msg.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
