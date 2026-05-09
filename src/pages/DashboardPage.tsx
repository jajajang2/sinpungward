import UpcomingBirthdaysCard from "@/components/dashboard/UpcomingBirthdaysCard";
import TempleRecommendCard from "@/components/dashboard/TempleRecommendCard";
import RecentAttendanceCard from "@/components/dashboard/RecentAttendanceCard";
import MonthCalendarCard from "@/components/dashboard/MonthCalendarCard";

const DashboardPage = () => {
  return (
    <div className="h-screen overflow-y-auto p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">대시보드</h1>
        <p className="text-sm text-muted-foreground">주요 현황을 한눈에 확인하세요</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingBirthdaysCard />
        <TempleRecommendCard />
        <RecentAttendanceCard />
        <MonthCalendarCard />
      </div>
    </div>
  );
};

export default DashboardPage;
