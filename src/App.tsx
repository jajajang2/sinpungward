import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import MembersPage from "./pages/MembersPage";
import DashboardPage from "./pages/DashboardPage";
import AttendancePage from "./pages/AttendancePage";
import AttendanceStatsPage from "./pages/AttendanceStatsPage";
import OrgChartPage from "./pages/OrgChartPage";
import MeetingMinutesPage from "./pages/MeetingMinutesPage";
import CleaningPage from "./pages/CleaningPage";
import SacramentPage from "./pages/SacramentPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/attendance-stats" element={<AttendanceStatsPage />} />
            <Route path="/orgchart" element={<OrgChartPage />} />
            <Route path="/minutes" element={<MeetingMinutesPage />} />
            <Route path="/cleaning" element={<CleaningPage />} />
            <Route path="/sacrament" element={<SacramentPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
