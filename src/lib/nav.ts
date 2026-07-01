import {
  LayoutDashboard,
  FileStack,
  CalendarDays,
  BarChart3,
  FolderOpen,
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
  { title: "Assets", href: "/assets", icon: FolderOpen },
  { title: "Team", href: "/team", icon: Users },
];

export const bottomNavItems: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
];
