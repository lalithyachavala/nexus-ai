"use client";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Skeleton, Badge } from "@/components/ui/primitives";
import { ConversationInbox } from "@/components/inbox/ConversationInbox";
import { MessageCircle } from "lucide-react";

export default function WhatsAppPage() {
  return (
    <>
      <PageHeader
        title="WhatsApp Automation"
        subtitle="Simulated WhatsApp Business inbox — inbound processing, AI replies, classification, templates and escalation."
        actions={
          <Badge tone="success" dot>
            Business API connected (simulated)
          </Badge>
        }
      />
      <ConversationInbox channel="whatsapp" rightExtra={<TemplatesPanel />} />
    </>
  );
}

function TemplatesPanel() {
  const templates = useAsync(() => api.whatsapp.templates(), []);
  return (
    <Card>
      <CardHeader title="Message templates" subtitle="Approved WhatsApp templates" />
      <div className="space-y-2.5 px-4 pb-4">
        {templates.loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          : templates.data?.map((t) => (
              <div key={t.id} className="rounded-lg border border-line-soft bg-surface-2 p-3 transition-colors hover:border-line">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                    <MessageCircle className="h-3.5 w-3.5 text-success" />
                    {t.name}
                  </span>
                  <Badge tone="neutral">{t.category}</Badge>
                </div>
                <p className="mt-1.5 text-[12px] leading-snug text-muted">{t.body}</p>
                <p className="mt-1.5 text-[11px] text-muted/80">Used {t.usageCount.toLocaleString()}×</p>
              </div>
            ))}
      </div>
    </Card>
  );
}
