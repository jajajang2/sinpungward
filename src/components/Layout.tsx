import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import AppSidebar, { SidebarBrand, SidebarNavList, allNavItems } from "./AppSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Layout = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const current = allNavItems.find((item) => pathname === item.to || pathname.startsWith(item.to + "/"));
  const title = current?.label ?? "교회 관리";

  return (
    <div className="relative flex min-h-dvh w-full bg-background">
      <AppSidebar />

      <div className="flex-1 min-w-0 flex flex-col bg-background">
        {/* Mobile header */}
        <header
          className="sticky top-0 z-40 flex md:hidden items-center gap-2 border-b border-border bg-background/95 backdrop-blur px-2"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex h-14 w-full items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="메뉴 열기"
                  className="flex h-11 w-11 items-center justify-center rounded-md text-foreground hover:bg-muted"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[min(82vw,18rem)] p-0 border-0 bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-fg))]"
              >
                <div className="flex h-full flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
                  <SidebarBrand />
                  <SidebarNavList onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            <h1 className="truncate text-base font-semibold">{title}</h1>
          </div>
        </header>

        <main className="flex-1 min-w-0" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
