"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Phone,
  CheckCircle2,
  ArrowLeft,
  Trash2,
  History,
  Timer,
  Calendar,
  Activity,
  MessageCircle,
  Voicemail,
  XCircle,
  UserX,
  RotateCcw,
  User,
  TrendingUp,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SessionData,
  SessionCall,
  getSessionById,
  getCurrentSession,
  deleteSession,
  formatDuration,
  formatDateTime,
  formatDate,
  formatTime,
  getActiveDuration,
  endSession,
  getSessionFromDB,
} from "@/lib/sessions";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  answered: { label: "Answered", color: "text-emerald-400", icon: CheckCircle2 },
  voicemail: { label: "Voicemail", color: "text-amber-400", icon: Voicemail },
  no_answer: { label: "No Answer", color: "text-red-400", icon: XCircle },
  not_interested: { label: "Not Interested", color: "text-zinc-400", icon: UserX },
  callback: { label: "Callback", color: "text-blue-400", icon: RotateCcw },
  gatekeeper: { label: "Gatekeeper", color: "text-violet-400", icon: User },
};

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [isCurrent, setIsCurrent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (!stored) {
      router.push("/login");
      return;
    }
    loadSession();
  }, [router, sessionId]);

  const loadSession = async () => {
    // Check if this is the current active session
    const current = getCurrentSession();
    if (current && current.id === sessionId) {
      setSession(current);
      setIsCurrent(true);
      setLoading(false);
      return;
    }

    // Check localStorage for past sessions
    const pastSession = getSessionById(sessionId);
    if (pastSession) {
      setSession(pastSession);
      setIsCurrent(false);
      setLoading(false);
      return;
    }

    // If not found locally, try loading from DB (for db_xxxx IDs)
    if (sessionId.startsWith('db_')) {
      try {
        const dbSession = await getSessionFromDB(sessionId);
        if (dbSession) {
          setSession(dbSession);
          setIsCurrent(false);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Failed to load DB session:", err);
      }
    }

    // Session not found
    setSession(null);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this session?")) return;
    if (sessionId.startsWith('db_')) {
      // For DB sessions, we can only remove from local state
      // The DB record remains (could add pb.collection("sessions").delete() here)
      console.log("DB session - cannot delete from localStorage");
    } else {
      deleteSession(sessionId);
    }
    router.push("/sessions");
  };

  const handleEndSession = async () => {
    if (!confirm("End the current session? This will save all call data.")) return;
    await endSession();
    await loadSession();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-zinc-800" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-t-emerald-500 border-r-emerald-500 border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p className="text-sm text-zinc-500 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-full flex flex-col bg-[#0a0a0a]">
        <header className="h-16 px-6 flex items-center gap-4 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40">
          <Link href="/sessions">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-zinc-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-sm font-semibold text-white tracking-tight">Session Not Found</h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <History className="h-8 w-8 text-zinc-600" />
            </div>
            <p className="text-zinc-400 mb-1">Session not found</p>
            <p className="text-sm text-zinc-500 mb-6">The session you're looking for doesn't exist or has been deleted</p>
            <Link href="/sessions">
              <Button className="h-10 px-5 bg-white text-black hover:bg-zinc-200 font-medium rounded-lg">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sessions
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Calculate durations
  const startDate = new Date(session.startTime);
  const endDate = session.endTime ? new Date(session.endTime) : new Date();
  const totalDurationMs = endDate.getTime() - startDate.getTime();
  const activeDurationMs = totalDurationMs - session.totalPausedTimeMs;
  const pausedDurationMs = session.totalPausedTimeMs;

  // Calculate stats
  const answerRate = session.totalCalls > 0 ? Math.round((session.answered / session.totalCalls) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/sessions">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-zinc-400 hover:text-white hover:bg-white/[0.05]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-6 bg-white/[0.06]" />
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              isCurrent ? "bg-emerald-500/10" : "bg-violet-500/10"
            )}>
              {isCurrent ? (
                <Activity className="h-4 w-4 text-emerald-400" />
              ) : (
                <History className="h-4 w-4 text-violet-400" />
              )}
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight">
                Session on {formatDate(session.startTime)}
              </h1>
              <p className="text-[11px] text-zinc-500">
                {isCurrent ? "Currently Active" : "Completed Session"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isCurrent && (
            <Button
              onClick={handleEndSession}
              variant="outline"
              className="h-9 px-4 bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-medium text-sm rounded-lg"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              End Session
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-9 w-9 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
            title="Delete session"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d]">
        <div className="max-w-6xl mx-auto p-8 space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                  <Phone className="h-4 w-4 text-violet-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Total Calls</span>
              </div>
              <p className="text-3xl font-semibold text-white">{session.totalCalls}</p>
            </div>

            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Clock className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Total Duration</span>
              </div>
              <p className="text-3xl font-semibold text-white">{formatDuration(totalDurationMs)}</p>
            </div>

            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Timer className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Active Time</span>
              </div>
              <p className="text-3xl font-semibold text-white">{formatDuration(activeDurationMs)}</p>
            </div>

            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Answer Rate</span>
              </div>
              <p className="text-3xl font-semibold text-white">{answerRate}%</p>
            </div>
          </div>

          {/* Time Breakdown */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                </div>
                <h2 className="text-base font-semibold text-white tracking-tight">Time Breakdown</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Start Time</span>
                    <span className="text-zinc-200">{formatDateTime(session.startTime)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">{session.endTime ? 'End Time' : 'Current Status'}</span>
                    <span className={cn("font-medium", isCurrent ? "text-emerald-400" : "text-zinc-200")}>
                      {session.endTime ? formatDateTime(session.endTime) : 'In Progress'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Total Duration</span>
                    <span className="text-zinc-200">{formatDuration(totalDurationMs)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Paused Time</span>
                    <span className="text-amber-400">{formatDuration(pausedDurationMs)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Active Time</span>
                    <span className="text-emerald-400 font-medium">{formatDuration(activeDurationMs)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Efficiency</span>
                    <span className="text-blue-400">
                      {totalDurationMs > 0 ? Math.round((activeDurationMs / totalDurationMs) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-6">
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${totalDurationMs > 0 ? (activeDurationMs / totalDurationMs) * 100 : 0}%` }}
                  />
                  <div
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${totalDurationMs > 0 ? (pausedDurationMs / totalDurationMs) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-zinc-500">Active</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-zinc-500">Paused</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call Outcomes */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                  <Target className="h-4 w-4 text-zinc-400" />
                </div>
                <h2 className="text-base font-semibold text-white tracking-tight">Call Outcomes</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: "Answered", value: session.answered, color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
                  { label: "Voicemail", value: session.voicemails, color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20" },
                  { label: "No Answer", value: session.noAnswers, color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/20" },
                  { label: "Not Interested", value: session.notInterested, color: "text-zinc-400", bgColor: "bg-zinc-500/10", borderColor: "border-zinc-500/20" },
                  { label: "Callback", value: session.callbacks, color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20" },
                  { label: "Gatekeeper", value: session.gatekeepers, color: "text-violet-400", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/20" },
                ].map((stat) => (
                  <div key={stat.label} className={cn(
                    "p-4 rounded-xl border transition-all duration-200",
                    stat.bgColor,
                    stat.borderColor
                  )}>
                    <p className={cn("text-2xl font-semibold", stat.color)}>{stat.value}</p>
                    <p className={cn("text-[10px] uppercase tracking-wider font-medium mt-1", stat.color)}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Call Log */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-zinc-400" />
                </div>
                <h2 className="text-base font-semibold text-white tracking-tight">Call Log</h2>
                <Badge variant="outline" className="ml-2 bg-zinc-800/50 text-zinc-400 border-zinc-700">
                  {session.calls.length} calls
                </Badge>
              </div>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {session.calls.length === 0 ? (
                <div className="text-center py-12">
                  <Phone className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500">No calls logged yet</p>
                </div>
              ) : (
                session.calls.map((call, index) => {
                  const config = STATUS_CONFIG[call.status] || STATUS_CONFIG.no_answer;
                  const Icon = config.icon;

                  return (
                    <div key={index} className="p-4 hover:bg-white/[0.02] transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center border flex-shrink-0",
                          call.status === 'answered' && "bg-emerald-500/10 border-emerald-500/20",
                          call.status === 'voicemail' && "bg-amber-500/10 border-amber-500/20",
                          call.status === 'no_answer' && "bg-red-500/10 border-red-500/20",
                          call.status === 'not_interested' && "bg-zinc-500/10 border-zinc-500/20",
                          call.status === 'callback' && "bg-blue-500/10 border-blue-500/20",
                          call.status === 'gatekeeper' && "bg-violet-500/10 border-violet-500/20",
                        )}>
                          <Icon className={cn("h-4 w-4", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-zinc-200 truncate">{call.businessName}</span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
                              call.status === 'answered' && "bg-emerald-500/10 text-emerald-400",
                              call.status === 'voicemail' && "bg-amber-500/10 text-amber-400",
                              call.status === 'no_answer' && "bg-red-500/10 text-red-400",
                              call.status === 'not_interested' && "bg-zinc-500/10 text-zinc-400",
                              call.status === 'callback' && "bg-blue-500/10 text-blue-400",
                              call.status === 'gatekeeper' && "bg-violet-500/10 text-violet-400",
                            )}>
                              {config.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-500">
                            <span>{call.phone}</span>
                            <span className="text-zinc-700">•</span>
                            <span>{formatTime(call.timestamp)}</span>
                          </div>
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
