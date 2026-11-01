import { LayoutDashboard, Headphones, TrendingUp, MessageCircle, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, description: "Operations at a glance" },
  { href: "/support", label: "AI Support", icon: Headphones, description: "Conversational support & tickets" },
  { href: "/sales", label: "Sales Intelligence", icon: TrendingUp, description: "Leads, scoring & pipeline" },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle, description: "Automated messaging" },
  { href: "/automation", label: "Automation", icon: Workflow, description: "Workflows & approvals" },
];
