import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import MembersPage from "./pages/MembersPage";
import AttendancePage from "./pages/AttendancePage";
import AttendanceStatsPage from "./pages/AttendanceStatsPage";
import OrgChartPage from "./pages/OrgChartPage";
import MeetingMinutesPage from "./pages/MeetingMinutesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/members" replace />} />
          <Route element={<Layout />}>
            <Route path="/members" element={<MembersPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/attendance-stats" element={<AttendanceStatsPage />} />
            <Route path="/orgchart" element={<OrgChartPage />} />
            <Route path="/minutes" element={<MeetingMinutesPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
