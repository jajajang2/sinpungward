import { NavLink } from "@/components/NavLink";
import { Users, Calendar, BarChart3, GitBranch, ChevronLeft, ChevronRight, BookOpen, LayoutDashboard, Sparkles, ListOrdered, FileCheck, Newspaper } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const mainNavItems = [
  { to: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { to: "/members", label: "회원기록양식", icon: Users },
  { to: "/attendance", label: "출석부", icon: Calendar },
  { to: "/attendance-stats", label: "출석통계", icon: BarChart3 },
  { to: "/sacrament", label: "성찬식 순서", icon: ListOrdered },
  { to: "/orgchart", label: "조직도", icon: GitBranch },
];

export const extraNavItems = [
  { to: "/minutes", label: "회의록", icon: BookOpen },
  { to: "/cleaning", label: "청소조", icon: Sparkles },
  { to: "/bulletin", label: "주보", icon: Newspaper },
  { to: "/temple-recommends", label: "성전 추천서", icon: FileCheck },
];

export const allNavItems = [...mainNavItems, ...extraNavItems];

interface NavListProps {
  showLabels?: boolean;
  onNavigate?: () => void;
}

export const SidebarNavList = ({ showLabels = true, onNavigate }: NavListProps) => {
  const renderNavLink = ({ to, label, icon: Icon }: { to: string; label: string; icon: React.ElementType }) => (
    <NavLink
      key={to}
      to={to}
      onClick={onNavigate}
      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-hover))]"
      activeClassName="bg-[hsl(var(--sidebar-active))] text-white"
    >
      <Icon className="w-5 h-5 shrink-0" />
      {showLabels && <span className="truncate">{label}</span>}
    </NavLink>
  );

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
      {mainNavItems.map(renderNavLink)}
      <div className="my-2 border-t border-[hsl(var(--sidebar-border))]" />
      {extraNavItems.map(renderNavLink)}
    </nav>
  );
};

export const SidebarBrand = ({ showLabels = true }: { showLabels?: boolean }) => (
  <div className="flex items-center gap-3 px-4 py-5 border-b border-[hsl(var(--sidebar-border))]">
    <div className="w-8 h-8 rounded-full bg-[hsl(var(--gold))] flex items-center justify-center shrink-0">
      <span className="text-white text-xs font-bold">⛪</span>
    </div>
    {showLabels && (
      <div className="overflow-hidden">
        <p className="text-sm font-bold leading-tight truncate">교회 관리</p>
        <p className="text-xs opacity-60 truncate">Church Manager</p>
      </div>
    )}
  </div>
);

/** Desktop-only fixed sidebar. Mobile navigation lives in Layout's Sheet. */
const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative hidden md:flex h-screen flex-col overflow-hidden bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-fg))] transition-all duration-300 shrink-0",
        collapsed ? "w-14" : "w-[220px]"
      )}
    >
      <SidebarBrand showLabels={!collapsed} />
      <SidebarNavList showLabels={!collapsed} />

      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center shadow-md hover:bg-[hsl(var(--primary))/90] z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
