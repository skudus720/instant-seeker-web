import {
  Activity,
  BarChart3,
  BrainCircuit,
  ClipboardCheck,
  FileClock,
  Gauge,
  HandCoins,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminPermission } from "@/lib/admin/permissions";

export interface AdminNavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: AdminPermission;
  keywords: string;
}

export const adminNavigation: AdminNavigationItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    permission: "dashboard:view",
    keywords: "overview metrics charts activity",
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
    permission: "users:view",
    keywords: "members accounts suspension roles",
  },
  {
    label: "Analyses",
    href: "/admin/analyses",
    icon: BrainCircuit,
    permission: "analyses:view",
    keywords: "queue screenshots results retries",
  },
  {
    label: "Win Records",
    href: "/admin/win-records",
    icon: Trophy,
    permission: "moderation:view",
    keywords: "verification tickets evidence publication",
  },
  {
    label: "Reviews",
    href: "/admin/reviews",
    icon: MessageSquareText,
    permission: "moderation:view",
    keywords: "moderation ratings publication",
  },
  {
    label: "Public Content",
    href: "/admin/content",
    icon: ClipboardCheck,
    permission: "content:view",
    keywords: "cms homepage legal banners footer",
  },
  {
    label: "AI Configuration",
    href: "/admin/ai-configuration",
    icon: Gauge,
    permission: "ai_config:view",
    keywords: "provider model prompt thresholds versions",
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
    permission: "reports:view",
    keywords: "export csv trends operations",
  },
  {
    label: "Referral Partners",
    href: "/admin/referrals",
    icon: HandCoins,
    permission: "referrals:view",
    keywords: "sub-admin partners commissions payouts referrals",
  },
  {
    label: "System Health",
    href: "/admin/system-health",
    icon: Activity,
    permission: "system:view",
    keywords: "status errors storage jobs diagnostics",
  },
  {
    label: "Audit Logs",
    href: "/admin/audit-logs",
    icon: FileClock,
    permission: "audit:view",
    keywords: "security actions history changes",
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    permission: "settings:view",
    keywords: "general safety privacy limits features",
  },
];

export const adminQuickActions = [
  {
    label: "Open moderation queues",
    href: "/admin/reviews?status=pending",
    icon: ShieldCheck,
  },
  {
    label: "Review failed analyses",
    href: "/admin/analyses?status=failed",
    icon: BrainCircuit,
  },
] as const;
