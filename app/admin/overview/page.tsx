"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pb, User, Lead, Session } from "@/lib/pocketbase";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CallerCard } from "@/components/admin/CallerCard";
import { LeaderboardTable } from "@/components/admin/LeaderboardTable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  CheckCircle2,
  Clock,
  Flame,
  Users,
  RefreshCw,
  LayoutDashboard,
  Trophy,
  BarChart3,
  TrendingUp,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CallerWithStats {
  user: User;
  todayStats: {
    callsMade: number;
    answered: number;
    callbacks: number;
    answerRate: number;
  };
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  callsToday: number;
  answered: number;
  answerRate: number;
  callbacks: number;
  goldMines: number;
}

interface GlobalStats {
  totalCallsToday: number;
  totalAnsweredToday: number;
  totalCallbacksToday: number;
  totalGoldMines: number;
  totalLeads: number;
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [callers, setCallers] = useState<CallerWithStats[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalCallsToday: 0,
    totalAnsweredToday: 0,
    totalCallbacksToday: 0,
    totalGoldMines: 0,
    totalLeads: 0,
  });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // Admin access check
  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
  }, [router]);

  // Load data function
  const loadData = async () => {
    try {
      // Get today's date
      const today = new Date().toISOString().split("T")[0];

      // Load all users (callers only, not admins)
      const usersResult = await pb.collection("users").getFullList<User>({
        sort: "username",
      });
      const callersList = usersResult.filter((u) => !u.is_admin);

      // Load all leads for gold mine count
      const leadsResult = await pb.collection("leads").getFullList<Lead>();
      const goldMines = leadsResult.filter((l) => l.verification_score >= 80);

      // Load today's sessions
      const sessionsResult = await pb.collection("sessions").getFullList<Session>({
        filter: `date = "${today}"`,
      });

      // Calculate caller stats
      const callersWithStats: CallerWithStats[] = callersList.map((user) => {
        const userSessions = sessionsResult.filter((s) => s.username === user.username);
        const callsMade = userSessions.reduce((sum, s) => sum + s.calls_made, 0);
        const answered = userSessions.reduce((sum, s) => sum + s.answered, 0);
        const callbacks = userSessions.reduce((sum, s) => sum + s.callbacks, 0);
        const answerRate = callsMade > 0 ? Math.round((answered / callsMade) * 100) : 0;

        return {
          user,
          todayStats: {
            callsMade,
            answered,
            callbacks,
            answerRate,
          },
        };
      });

      // Calculate leaderboard (sorted by calls made)
      const leaderboardData: LeaderboardEntry[] = callersList
        .map((user, index) => {
          const userSessions = sessionsResult.filter((s) => s.username === user.username);
          const userLeads = leadsResult.filter((l) => l.username === user.username);
          const callsMade = userSessions.reduce((sum, s) => sum + s.calls_made, 0);
          const answered = userSessions.reduce((sum, s) => sum + s.answered, 0);
          const callbacks = userSessions.reduce((sum, s) => sum + s.callbacks, 0);
          const answerRate = callsMade > 0 ? Math.round((answered / callsMade) * 100) : 0;
          const userGoldMines = userLeads.filter((l) => l.verification_score >= 80).length;

          return {
            rank: 0, // Will be set after sorting
            username: user.username,
            callsToday: callsMade,
            answered,
            answerRate,
            callbacks,
            goldMines: userGoldMines,
          };
        })
        .sort((a, b) => b.callsToday - a.callsToday)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      // Calculate global stats
      const totalCallsToday = sessionsResult.reduce((sum, s) => sum + s.calls_made, 0);
      const totalAnsweredToday = sessionsResult.reduce((sum, s) => sum + s.answered, 0);
      const totalCallbacksToday = sessionsResult.reduce((sum, s) => sum + s.callbacks, 0);

      setCallers(callersWithStats);
      setLeaderboard(leaderboardData);
      setGlobalStats({
        totalCallsToday,
        totalAnsweredToday,
        totalCallbacksToday,
        totalGoldMines: goldMines.length,
        totalLeads: leadsResult.length,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and polling
  useEffect(() => {
    loadData();

    // Poll every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Format "X seconds ago"
  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-zinc-800" />
              <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin" />
            </div>
            <p className="text-sm text-zinc-500 font-medium">Loading admin dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Calculate additional stats
  const activeCallers = callers.filter((c) => c.user.session_active).length;
  const totalAnswerRate = globalStats.totalCallsToday > 0
    ? Math.round((globalStats.totalAnsweredToday / globalStats.totalCallsToday) * 100)
    : 0;

  return (
    <AdminLayout>
      <div className="h-full flex flex-col bg-[#0a0a0a]">
        {/* Header Bar */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-6">
            {/* Logo/Title Area */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <LayoutDashboard className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white tracking-tight">Admin Overview</h1>
                <p className="text-[11px] text-zinc-500">Live monitoring & daily stats</p>
              </div>
            </div>

            <Separator orientation="vertical" className="h-6 bg-white/[0.06]" />

            {/* Stats Summary */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">Active:</span>
                <span className="text-emerald-400 font-medium">{activeCallers} callers</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">Calls:</span>
                <span className="text-zinc-200 font-medium">{globalStats.totalCallsToday}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">Rate:</span>
                <span className={totalAnswerRate >= 50 ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                  {totalAnswerRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">
              Updated {getTimeSinceUpdate()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="h-9 px-4 bg-transparent border-white/[0.1] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d]">
          <div className="max-w-7xl mx-auto p-8 space-y-8">
            {/* Live Callers Section */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white tracking-tight">Live Callers</h2>
                    <p className="text-[11px] text-zinc-500">{activeCallers} active now</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/admin/callers")}
                  className="text-zinc-400 hover:text-white hover:bg-white/[0.05] text-xs font-medium"
                >
                  View All
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>

              <div className="p-6">
                {callers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-zinc-500">No callers found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {callers.map((caller) => (
                      <CallerCard
                        key={caller.user.id}
                        user={caller.user}
                        todayStats={caller.todayStats}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Grid: Leaderboard + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Daily Leaderboard */}
              <div className="lg:col-span-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white tracking-tight">Daily Leaderboard</h2>
                      <p className="text-[11px] text-zinc-500">Ranked by calls today</p>
                    </div>
                  </div>
                </div>

                <div className="p-0">
                  <LeaderboardTable data={leaderboard} />
                </div>
              </div>

              {/* Right Sidebar - Global Stats */}
              <div className="space-y-4">
                {/* Today's Stats */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
                  <div className="px-6 py-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-indigo-400" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-white tracking-tight">Today&apos;s Stats</h2>
                        <p className="text-[11px] text-zinc-500">Global activity breakdown</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <StatRow label="Calls Made" value={globalStats.totalCallsToday} icon={Phone} color="text-indigo-400" bgColor="bg-indigo-500/10" />
                    <StatRow label="Answered" value={globalStats.totalAnsweredToday} icon={CheckCircle2} color="text-emerald-400" bgColor="bg-emerald-500/10" />
                    <StatRow label="Callbacks" value={globalStats.totalCallbacksToday} icon={Clock} color="text-blue-400" bgColor="bg-blue-500/10" />
                    <StatRow label="Gold Mines" value={globalStats.totalGoldMines} icon={Flame} color="text-amber-400" bgColor="bg-amber-500/10" />
                    <Separator className="bg-white/[0.06]" />
                    <StatRow label="Total Leads" value={globalStats.totalLeads} icon={Users} color="text-violet-400" bgColor="bg-violet-500/10" />
                  </div>
                </div>

                {/* Performance */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
                  <div className="px-6 py-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-violet-400" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-white tracking-tight">Performance</h2>
                        <p className="text-[11px] text-zinc-500">Answer rate today</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="text-center">
                      <span className={cn("text-4xl font-bold", totalAnswerRate >= 50 ? "text-emerald-400" : totalAnswerRate >= 30 ? "text-amber-400" : "text-zinc-400")}>
                        {totalAnswerRate}%
                      </span>
                      <p className="text-xs text-zinc-500 mt-1">Answer Rate</p>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", totalAnswerRate >= 50 ? "bg-emerald-500" : totalAnswerRate >= 30 ? "bg-amber-500" : "bg-zinc-500")}
                        style={{ width: `${totalAnswerRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-500 text-center">
                      {globalStats.totalAnsweredToday} answered of {globalStats.totalCallsToday} calls
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AdminLayout>
  );
}

// Helper Component
function StatRow({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", bgColor)}>
          <Icon className={cn("h-3 w-3", color)} />
        </div>
        <span className="text-sm text-zinc-400">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
