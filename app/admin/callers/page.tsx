"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pb, User, Lead, Session } from "@/lib/pocketbase";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight, Phone, CheckCircle2, Clock, Activity } from "lucide-react";

interface CallerWithStats {
  user: User;
  totalLeads: number;
  todayStats: {
    callsMade: number;
    answered: number;
    callbacks: number;
  };
  sessionActive: boolean;
  lastActive: string | null;
}

export default function CallersListPage() {
  const router = useRouter();
  const [callers, setCallers] = useState<CallerWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin access check
  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
  }, [router]);

  // Load callers data
  useEffect(() => {
    loadCallers();
  }, []);

  const loadCallers = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      // Load all users (callers only)
      const usersResult = await pb.collection("users").getFullList<User>({
        sort: "username",
      });
      const callersList = usersResult.filter((u) => !u.is_admin);

      // Load all leads
      const leadsResult = await pb.collection("leads").getFullList<Lead>();

      // Load today's sessions
      const sessionsResult = await pb.collection("sessions").getFullList<Session>({
        filter: `date = "${today}"`,
      });

      // Calculate stats for each caller
      const callersWithStats: CallerWithStats[] = callersList.map((user) => {
        const userLeads = leadsResult.filter((l) => l.username === user.username);
        const userSessions = sessionsResult.filter((s) => s.username === user.username);

        return {
          user,
          totalLeads: userLeads.length,
          todayStats: {
            callsMade: userSessions.reduce((sum, s) => sum + s.calls_made, 0),
            answered: userSessions.reduce((sum, s) => sum + s.answered, 0),
            callbacks: userSessions.reduce((sum, s) => sum + s.callbacks, 0),
          },
          sessionActive: user.session_active || false,
          lastActive: user.last_active || null,
        };
      });

      // Sort by session active first, then by calls today
      callersWithStats.sort((a, b) => {
        if (a.sessionActive !== b.sessionActive) {
          return b.sessionActive ? 1 : -1;
        }
        return b.todayStats.callsMade - a.todayStats.callsMade;
      });

      setCallers(callersWithStats);
    } catch (err) {
      console.error("Failed to load callers:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatLastActive = (lastActive: string | null) => {
    if (!lastActive) return "Never";
    const diff = Date.now() - new Date(lastActive).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-zinc-800" />
                <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin" />
              </div>
              <p className="text-sm text-zinc-500 font-medium">Loading callers...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Callers</h1>
              <p className="text-sm text-zinc-500">
                {callers.length} callers · {callers.filter((c) => c.sessionActive).length} active
              </p>
            </div>
          </div>
          <Button
            onClick={loadCallers}
            variant="outline"
            className="bg-transparent border-white/[0.1] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Callers Grid */}
        {callers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500">No callers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {callers.map((caller) => (
              <Card
                key={caller.user.id}
                className="bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] transition-colors cursor-pointer group"
                onClick={() => router.push(`/admin/callers/${caller.user.username}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {caller.user.username.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        {/* Status dot */}
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${
                            caller.sessionActive ? "bg-emerald-500" : "bg-zinc-600"
                          }`}
                        />
                      </div>

                      <div>
                        <h3 className="font-medium text-white group-hover:text-indigo-400 transition-colors">
                          {caller.user.username}
                        </h3>
                        <p className="text-xs text-zinc-500">
                          {caller.sessionActive ? (
                            <span className="text-emerald-400">● Active now</span>
                          ) : (
                            `Last seen ${formatLastActive(caller.lastActive)}`
                          )}
                        </p>
                      </div>
                    </div>

                    <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-sm text-white font-medium">
                        {caller.todayStats.callsMade}
                      </span>
                      <span className="text-xs text-zinc-500">today</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-sm text-emerald-400">
                        {caller.todayStats.answered}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-sm text-blue-400">
                        {caller.todayStats.callbacks}
                      </span>
                    </div>

                    <div className="ml-auto">
                      <Badge
                        variant="outline"
                        className="text-xs bg-transparent border-white/[0.1] text-zinc-400"
                      >
                        {caller.totalLeads} leads
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
