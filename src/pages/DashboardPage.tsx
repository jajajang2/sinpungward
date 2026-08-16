import UpcomingBirthdaysCard from "@/components/dashboard/UpcomingBirthdaysCard";
import TempleRecommendCard from "@/components/dashboard/TempleRecommendCard";
import MonthCalendarCard from "@/components/dashboard/MonthCalendarCard";
import { LayoutGrid } from "lucide-react";

const DashboardPage = () => {
  return (
    <div className="min-h-dvh md:h-screen md:overflow-hidden md:flex md:flex-col p-4 md:p-6 bg-muted/30">
      <div className="mb-4 md:mb-6 flex items-center gap-3 md:shrink-0">
        <div className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
          <LayoutGrid className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">대시보드</h1>
          <p className="text-sm text-muted-foreground">주요 현황을 한눈에 확인하세요</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch md:flex-1 md:min-h-0">
        <div className="flex flex-col gap-4 lg:col-span-1 md:min-h-0">
          <UpcomingBirthdaysCard />
          <div className="md:flex-1 md:min-h-0">
            <TempleRecommendCard />
          </div>
        </div>
        <div className="lg:col-span-2 md:min-h-0">
          <MonthCalendarCard />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
