import UpcomingBirthdaysCard from "@/components/dashboard/UpcomingBirthdaysCard";
import TempleRecommendCard from "@/components/dashboard/TempleRecommendCard";
import RecentAttendanceCard from "@/components/dashboard/RecentAttendanceCard";
import MonthCalendarCard from "@/components/dashboard/MonthCalendarCard";
import { LayoutGrid } from "lucide-react";

const DashboardPage = () => {
  return (
    <div className="min-h-dvh md:h-screen md:overflow-hidden p-4 md:p-6 bg-muted/30">
      <div className="mb-4 md:mb-6 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
          <LayoutGrid className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">대시보드</h1>
          <p className="text-sm text-muted-foreground">주요 현황을 한눈에 확인하세요</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="space-y-4 lg:col-span-1">
          <UpcomingBirthdaysCard />
          <TempleRecommendCard />
          <RecentAttendanceCard />
        </div>
        <div className="lg:col-span-2">
          <MonthCalendarCard />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
