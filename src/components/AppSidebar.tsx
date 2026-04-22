import { NavLink } from "react-router-dom";
import { Users, Calendar, BarChart3, GitBranch, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const mainNavItems = [
  { to: "/members", label: "회원기록양식", icon: Users },
  { to: "/attendance", label: "출석부", icon: Calendar },
  { to: "/attendance-stats", label: "출석통계", icon: BarChart3 },
  { to: "/orgchart", label: "조직도", icon: GitBranch },
];

const extraNavItems = [
  { to: "/minutes", label: "회의록", icon: BookOpen },
];

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  const renderNavLink = ({ to, label, icon: Icon }: { to: string; label: string; icon: React.ElementType }) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-[hsl(var(--sidebar-active))] text-white"
            : "text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-hover))]"
        )
      }
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );

  return (
    <aside
      className={cn(
        "flex flex-col min-h-screen bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-fg))] transition-all duration-300 relative shrink-0",
        collapsed ? "w-14" : "w-[220px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[hsl(var(--sidebar-border))]">
        <div className="w-8 h-8 rounded-full bg-[hsl(var(--gold))] flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">⛪</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold leading-tight truncate">교회 관리</p>
            <p className="text-xs opacity-60 truncate">Church Manager</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {mainNavItems.map(renderNavLink)}

        {/* Divider */}
        <div className={cn("my-2 border-t border-[hsl(var(--sidebar-border))]", collapsed && "mx-1")} />

        {extraNavItems.map(renderNavLink)}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center shadow-md hover:bg-[hsl(var(--primary))/90] z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
