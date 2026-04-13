"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Phone,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Trash2,
  History,
  Play,
  Pause,
  Timer,
  Activity,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SessionData,
  getAllSessions,
  getCurrentSession,
  deleteSession,
  formatDuration,
  formatDateTime,
  formatDate,
  formatTime,
  endSession,
} from "@/lib/sessions";

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUsername(stored);
    loadSessions();
  }, [router]);

  const loadSessions = () => {
    const allSessions = getAllSessions();
    const current = getCurrentSession();
    setSessions(allSessions);
    setCurrentSession(current);
    setLoading(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;
    deleteSession(id);
    loadSessions();
  };

  const handleEndSession = async () => {
    if (!confirm("End the current session? This will save all call data.")) return;
    await endSession();
    loadSessions();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { label: "Active", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      case 'paused':
        return { label: "Paused", class: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
      case 'completed':
        return { label: "Completed", class: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
      default:
        return { label: status, class: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-zinc-800" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-t-emerald-500 border-r-emerald-500 border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p className="text-sm text-zinc-500 font-medium">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <History className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight">Sessions</h1>
              <p className="text-[11px] text-zinc-500">Call session history</p>
            </div>
          </div>

          <Separator orientation="vertical" className="h-6 bg-white/[0.06]" />

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-zinc-500">Total Sessions:</span>
              <span className="text-zinc-200 font-medium">{sessions.length}</span>
            </div>
            {currentSession && (
              <div className="flex items-center gap-2 text-xs">
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Active Now</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentSession && (
            <Button
              onClick={handleEndSession}
              variant="outline"
              className="h-9 px-4 bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-medium text-sm rounded-lg transition-all duration-200"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              End Session
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d]">
        <div className="max-w-6xl mx-auto p-8 space-y-6">
          {/* Current Session Card */}
          {currentSession && (
            <div className="bg-emerald-500/[0.03] border border-emerald-500/20 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-4 border-b border-emerald-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Play className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white tracking-tight">Current Session</h2>
                    <p className="text-[11px] text-zinc-500">Started {formatDateTime(currentSession.startTime)}</p>
                  </div>
                  <div className="ml-auto">
                    {(() => {
                      const badge = getStatusBadge(currentSession.status);
                      return (
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide border",
                          badge.class
                        )}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="h-4 w-4 text-zinc-500" />
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Calls</span>
                    </div>
                    <p className="text-2xl font-semibold text-white">{currentSession.totalCalls}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-zinc-500" />
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Duration</span>
                    </div>
                    <p className="text-2xl font-semibold text-white">
                      {formatDuration(Date.now() - new Date(currentSession.startTime).getTime() - currentSession.totalPausedTimeMs)}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                      <Timer className="h-4 w-4 text-zinc-500" />
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Active Time</span>
                    </div>
                    <p className="text-2xl font-semibold text-white">
                      {formatDuration(Date.now() - new Date(currentSession.startTime).getTime() - currentSession.totalPausedTimeMs)}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-zinc-500" />
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Answer Rate</span>
                    </div>
                    <p className="text-2xl font-semibold text-white">
                      {currentSession.totalCalls > 0
                        ? Math.round((currentSession.answered / currentSession.totalCalls) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => router.push("/operations")}
                    className="h-10 px-5 bg-emerald-500 text-black hover:bg-emerald-400 font-medium rounded-lg transition-all duration-200"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Continue Session
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Sessions List */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="px-6 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                  <History className="h-4 w-4 text-zinc-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white tracking-tight">Past Sessions</h2>
                  <p className="text-[11px] text-zinc-500">{sessions.length} completed sessions</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {sessions.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                    <History className="h-8 w-8 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 mb-1">No completed sessions yet</p>
                  <p className="text-sm text-zinc-500 mb-6">Start a session in Operations to track your calls</p>
                  <Button
                    onClick={() => router.push("/operations")}
                    className="h-10 px-5 bg-white text-black hover:bg-zinc-200 font-medium rounded-lg transition-all duration-200"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start New Session
                  </Button>
                </div>
              ) : (
                sessions.map((session) => {
                  const startDate = new Date(session.startTime);
                  const endDate = session.endTime ? new Date(session.endTime) : new Date();
                  const totalDuration = endDate.getTime() - startDate.getTime();
                  const activeDuration = totalDuration - session.totalPausedTimeMs;

                  return (
                    <div
                      key={session.id}
                      className="p-6 hover:bg-white/[0.02] transition-all duration-200"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Session Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-zinc-200">
                              Session on {formatDate(session.startTime)}
                            </h3>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border",
                              getStatusBadge(session.status).class
                            )}>
                              {getStatusBadge(session.status).label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-zinc-500 flex-wrap">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'Now'}
                            </span>
                            <span className="text-zinc-700">•</span>
                            <span className="flex items-center gap-1.5">
                              <Timer className="h-3.5 w-3.5" />
                              {formatDuration(activeDuration)} active
                            </span>
                            <span className="text-zinc-700">•</span>
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" />
                              {session.totalCalls} calls
                            </span>
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {session.answered > 0 && (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              {session.answered} answered
                            </Badge>
                          )}
                          {session.voicemails > 0 && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                              {session.voicemails} voicemail
                            </Badge>
                          )}
                          {session.noAnswers > 0 && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">
                              {session.noAnswers} no answer
                            </Badge>
                          )}
                          {session.callbacks > 0 && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                              {session.callbacks} callback
                            </Badge>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link href={`/sessions/${session.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-4 bg-transparent border-white/[0.1] text-zinc-300 hover:bg-white/[0.05] hover:text-white hover:border-white/[0.15] font-medium text-sm rounded-lg transition-all duration-200"
                            >
                              View Details
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(session.id)}
                            className="h-9 w-9 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                            title="Delete session"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
