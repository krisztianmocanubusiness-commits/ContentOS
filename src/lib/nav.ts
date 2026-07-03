import {
  LayoutDashboard,
  FileStack,
  CalendarDays,
  BarChart3,
  Share2,
  Inbox,
  FolderOpen,
  CircleDollarSign,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Content", href: "/content", icon: FileStack },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Social Accounts", href: "/social-accounts", icon: Share2 },
  { title: "Inbox", href: "/inbox", icon: Inbox },
  { title: "Assets", href: "/assets", icon: FolderOpen },
  { title: "Monetization", href: "/monetization", icon: CircleDollarSign },
  { title: "Team", href: "/team", icon: Users },
];

export const bottomNavItems: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
];

// The mobile bottom tab bar only has room for a few destinations — these
// are the ones used often enough to earn a permanent thumb-reachable slot.
// Everything else in navItems shows up in the bottom bar's "More" sheet.
const MOBILE_PRIMARY_HREFS = ["/dashboard", "/content", "/calendar", "/inbox"];

export const mobilePrimaryNavItems: NavItem[] = MOBILE_PRIMARY_HREFS.map(
  (href) => navItems.find((item) => item.href === href)!
);

export const mobileMoreNavItems: NavItem[] = navItems.filter(
  (item) => !MOBILE_PRIMARY_HREFS.includes(item.href)
);
