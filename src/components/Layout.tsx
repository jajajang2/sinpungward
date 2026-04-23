import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const Layout = () => {
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile]);

  return (
    <div className="relative flex min-h-screen w-full bg-background">
      <AppSidebar isMobile={isMobile} mobileOpen={mobileSidebarOpen} onMobileToggle={() => setMobileSidebarOpen((prev) => !prev)} />
      <main className="flex-1 min-w-0 bg-background">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
