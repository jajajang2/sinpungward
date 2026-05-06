import { NavLink } from "@/components/NavLink";
import { Users, Calendar, BarChart3, GitBranch, ChevronLeft, ChevronRight, BookOpen, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
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

interface AppSidebarProps {
  isMobile: boolean;
  mobileOpen: boolean;
  onMobileToggle: () => void;
}

const AppSidebar = ({ isMobile, mobileOpen, onMobileToggle }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  const renderNavLink = ({ to, label, icon: Icon }: { to: string; label: string; icon: React.ElementType }) => (
    <NavLink
      key={to}
      to={to}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-hover))]"
      activeClassName="bg-[hsl(var(--sidebar-active))] text-white"
    >
      <Icon className="w-5 h-5 shrink-0" />
      {(isMobile || !collapsed) && <span className="truncate">{label}</span>}
    </NavLink>
  );

  return (
    <>
      {isMobile && mobileOpen && <button type="button" aria-label="사이드바 닫기" className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm" onClick={onMobileToggle} />}

      {isMobile && (
        <button
          type="button"
          aria-label="사이드바 열기"
          onClick={onMobileToggle}
          className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <aside
        className={cn(
          "flex h-screen flex-col overflow-hidden bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-fg))] transition-all duration-300 shrink-0",
          isMobile
            ? cn("fixed inset-y-0 left-0 z-40 w-[min(82vw,18rem)] shadow-2xl", mobileOpen ? "translate-x-0" : "-translate-x-full")
            : cn("relative", collapsed ? "w-14" : "w-[220px]")
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

        {isMobile && (
          <button type="button" aria-label="사이드바 닫기" onClick={onMobileToggle} className="ml-auto flex h-8 w-8 items-center justify-center rounded-md hover:bg-[hsl(var(--sidebar-hover))]">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {mainNavItems.map(renderNavLink)}

        {/* Divider */}
        <div className={cn("my-2 border-t border-[hsl(var(--sidebar-border))]", collapsed && "mx-1")} />

        {extraNavItems.map(renderNavLink)}
      </nav>

      {/* Collapse toggle */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center shadow-md hover:bg-[hsl(var(--primary))/90] z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      )}
      </aside>
    </>
  );
};

export default AppSidebar;
