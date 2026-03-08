import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const Layout = () => {
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <main className="flex-1 min-w-0 bg-background">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
