"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { pb, Lead } from "@/lib/pocketbase";
import { LeadCard } from "@/components/LeadCard";
import { ActiveCallScreen } from "@/components/ActiveCallScreen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { initDevice, destroyDevice } from "@/lib/twilioDevice";
import {
  Phone,
  Play,
  Pause,
  RotateCcw,
  Filter,
  ChevronDown,
  List,
  BarChart3,
  Target,
  Flame,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Search,
  ArrowRight,
  Zap,
  Timer,
  History,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SessionData,
  createSession,
  getCurrentSession,
  pauseSession,
  resumeSession,
  endSession,
  logCall,
  formatDuration,
  SessionCall,
} from "@/lib/sessions";

export default function OperationsPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [filter, setFilter] = useState("not_called");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Session management
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [activeDuration, setActiveDuration] = useState(0);

  // Auth check and load leads
  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUsername(stored);
    loadLeads(stored);

    // Check for existing active session
    const existingSession = getCurrentSession();
    if (existingSession && existingSession.status === 'active') {
      setCurrentSession(existingSession);
      setSessionActive(true);
    }

    // Initialize Twilio device
    initDevice(stored).catch(console.error);

    // Cleanup Twilio device on unmount
    return () => {
      destroyDevice().catch(console.error);
    };
  }, [router]);

  // Session timer - update every second
  useEffect(() => {
    if (!sessionActive || !currentSession) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const startTime = new Date(currentSession.startTime).getTime();
      const totalDuration = now - startTime;
      const activeTime = totalDuration - currentSession.totalPausedTimeMs;

      setSessionDuration(totalDuration);
      setActiveDuration(activeTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionActive, currentSession]);

  const loadLeads = async (user: string) => {
    try {
      const result = await pb.collection("leads").getFullList<Lead>({
        filter: `username = "${user}"`,
        sort: "-created",
      });
      setLeads(result);

      // Check if there's a lead to focus on (from Leads page)
      const focusLeadId = localStorage.getItem("focusLeadId");
      if (focusLeadId) {
        const focusLead = result.find(l => l.id === focusLeadId);
        if (focusLead) {
          const index = result.indexOf(focusLead);
          setCurrentIndex(index);
          setCurrentLead(focusLead);
        } else {
          // Find the first not_called lead as default
          const firstNotCalled = result.find(l => l.status === 'not_called');
          if (firstNotCalled) {
            const index = result.indexOf(firstNotCalled);
            setCurrentIndex(index);
            setCurrentLead(firstNotCalled);
          } else if (result.length > 0) {
            setCurrentLead(result[0]);
          }
        }
        localStorage.removeItem("focusLeadId");
      } else {
        // Find the first not_called lead as default
        const firstNotCalled = result.find(l => l.status === 'not_called');
        if (firstNotCalled) {
          const index = result.indexOf(firstNotCalled);
          setCurrentIndex(index);
          setCurrentLead(firstNotCalled);
        } else if (result.length > 0) {
          setCurrentLead(result[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load leads:", err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLeads = useCallback(() => {
    return leads.filter((l) => {
      const statusMatch = filter === "all" || l.status === filter;
      const nicheMatch = nicheFilter === "all" || l.niche === nicheFilter;
      return statusMatch && nicheMatch;
    });
  }, [leads, filter, nicheFilter]);

  const filteredLeads = getFilteredLeads();

  const handleNext = () => {
    if (currentIndex < filteredLeads.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setCurrentLead(filteredLeads[nextIndex]);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setCurrentLead(filteredLeads[prevIndex]);
    }
  };

  const handleUpdateLead = useCallback((updated: Lead) => {
    const prevLead = leads.find(l => l.id === updated.id);
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    if (currentLead?.id === updated.id) {
      setCurrentLead(updated);
    }

    // Log call to session if status changed and there's an active session
    if (currentSession && prevLead && prevLead.status !== updated.status && updated.status !== 'not_called') {
      const call: SessionCall = {
        leadId: updated.id,
        businessName: updated.business_name,
        phone: updated.phone,
        status: updated.status,
        timestamp: new Date().toISOString(),
        notes: updated.notes,
      };
      const updatedSession = logCall(currentSession.id, call);
      if (updatedSession) {
        setCurrentSession(updatedSession);
      }
    }
  }, [currentLead?.id, leads, currentSession]);

  const handleStartSession = async () => {
    // Create new session if none exists
    let session = currentSession;
    if (!session) {
      const stored = localStorage.getItem("username");
      if (stored) {
        session = await createSession(stored);
        setCurrentSession(session);
      }
    } else if (session.status === 'paused') {
      // Resume paused session
      const resumed = resumeSession();
      if (resumed) {
        setCurrentSession(resumed);
      }
    }

    setSessionActive(true);
    if (filteredLeads.length > 0) {
      setCurrentLead(filteredLeads[0]);
      setCurrentIndex(0);
    }
  };

  const handlePauseSession = () => {
    const paused = pauseSession();
    if (paused) {
      setCurrentSession(paused);
    }
    setSessionActive(false);
  };

  const handleResetSession = () => {
    setSessionActive(false);
    setCurrentIndex(0);
    if (filteredLeads.length > 0) {
      setCurrentLead(filteredLeads[0]);
    }
  };

  const handleEndSession = async () => {
    if (!confirm("End the current session? This will save all call data and cannot be undone.")) return;

    const ended = await endSession();
    if (ended) {
      setCurrentSession(null);
      setSessionActive(false);
      setSessionDuration(0);
      setActiveDuration(0);
    }
  };

  // Get unique niches
  const niches = Array.from(new Set(leads.map((l) => l.niche).filter(Boolean)));

  // Calculate stats
  const stats = {
    total: leads.length,
    called: leads.filter((l) => l.status !== "not_called").length,
    notCalled: leads.filter((l) => l.status === "not_called").length,
    callbacks: leads.filter((l) => l.status === "callback").length,
    goldMines: leads.filter((l) => l.verification_score >= 80).length,
    answered: leads.filter((l) => l.status === "answered").length,
  };

  // Get leads for sidebar queue
  const queueLeads = filteredLeads.slice(0, 20);

  // Calculate progress percentage
  const progressPercent = stats.total > 0 ? (stats.called / stats.total) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-zinc-800" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-t-emerald-500 border-r-emerald-500 border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p className="text-sm text-zinc-500 font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Active Call Overlay */}
      <ActiveCallScreen
        onLeadUpdate={handleUpdateLead}
        currentSession={currentSession}
      />

      {/* Top Navigation Bar - Minimal & Clean */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-6">
          {/* Logo/Title Area */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Phone className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight">Operations</h1>
              <p className="text-[11px] text-zinc-500">Cold Call Center</p>
            </div>
          </div>

          <Separator orientation="vertical" className="h-6 bg-white/[0.06]" />

          {/* Live Session Badge */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300",
            sessionActive
              ? "bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400"
              : currentSession
                ? "bg-amber-500/[0.08] border-amber-500/20 text-amber-400"
                : "bg-zinc-800/50 border-white/[0.06] text-zinc-400"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              sessionActive ? "bg-emerald-500 animate-pulse" : currentSession ? "bg-amber-500" : "bg-zinc-500"
            )} />
            <span className="text-xs font-medium">
              {sessionActive ? "Live Session" : currentSession ? "Paused" : "No Session"}
            </span>
          </div>

          {/* Session Timer */}
          {currentSession && (
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Active Time</span>
                <span className="text-xs text-zinc-300 font-medium tabular-nums">
                  {formatDuration(activeDuration)}
                </span>
              </div>
              <div className="w-px h-6 bg-white/[0.06]" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Calls</span>
                <span className="text-xs text-zinc-300 font-medium">
                  {currentSession.totalCalls}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Stats & Controls */}
        <div className="flex items-center gap-4">
          {/* Progress Mini-Stat */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Progress</span>
              <span className="text-xs text-zinc-300 font-medium">{stats.called} <span className="text-zinc-600">/</span> {stats.total}</span>
            </div>
            <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Session Control Button */}
          {!sessionActive ? (
            <Button
              onClick={handleStartSession}
              disabled={filteredLeads.length === 0}
              className="h-9 px-4 bg-white text-black hover:bg-zinc-200 font-medium text-sm rounded-lg transition-all duration-200 disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5 mr-2 fill-current" />
              {currentSession ? "Resume" : "Start Session"}
            </Button>
          ) : (
            <Button
              onClick={handlePauseSession}
              variant="outline"
              className="h-9 px-4 bg-transparent border-white/[0.1] text-zinc-300 hover:bg-white/[0.05] hover:text-white font-medium text-sm rounded-lg transition-all duration-200"
            >
              <Pause className="h-3.5 w-3.5 mr-2 fill-current" />
              Pause
            </Button>
          )}

          {/* End Session Button - only show when there's an active session */}
          {currentSession && (
            <Button
              onClick={handleEndSession}
              variant="outline"
              className="h-9 px-4 bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-medium text-sm rounded-lg transition-all duration-200"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
              End Session
            </Button>
          )}

          <Button
            onClick={handleResetSession}
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-transparent border-white/[0.1] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] rounded-lg transition-all duration-200"
            title="Reset to first lead"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Lead Queue */}
        <aside className="w-80 border-r border-white/[0.06] bg-[#0a0a0a] flex flex-col">
          {/* Filters Section */}
          <div className="p-4 border-b border-white/[0.06]">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                  <Filter className="h-4 w-4 text-zinc-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-zinc-200">Filters</p>
                  <p className="text-[11px] text-zinc-500">
                    {filter === "all" ? "All statuses" : filter.replace("_", " ")}
                    {nicheFilter !== "all" && ` • ${nicheFilter}`}
                  </p>
                </div>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-zinc-500 transition-transform duration-200",
                showFilters && "rotate-180"
              )} />
            </button>

            {/* Expanded Filters */}
              <div className={cn(
                "overflow-hidden transition-all duration-200",
                showFilters ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              )}>
                  <div className="pt-3 space-y-3">
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold px-1">Status</label>
                      <div className="relative">
                        <select
                          value={filter}
                          onChange={(e) => {
                            setFilter(e.target.value);
                            setCurrentIndex(0);
                          }}
                          className="w-full appearance-none px-3 py-2.5 bg-zinc-900/50 border border-white/[0.08] rounded-xl text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all cursor-pointer"
                        >
                          <option value="not_called">Not Called</option>
                          <option value="all">All Leads</option>
                          <option value="callback">Callbacks</option>
                          <option value="answered">Answered</option>
                          <option value="voicemail">Voicemail</option>
                          <option value="no_answer">No Answer</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>

                    {/* Niche Filter */}
                    {niches.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold px-1">Niche</label>
                        <div className="relative">
                          <select
                            value={nicheFilter}
                            onChange={(e) => {
                              setNicheFilter(e.target.value);
                              setCurrentIndex(0);
                            }}
                            className="w-full appearance-none px-3 py-2.5 bg-zinc-900/50 border border-white/[0.08] rounded-xl text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all cursor-pointer"
                          >
                            <option value="all">All Niches</option>
                            {niches.map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>
              </div>
          </div>

          {/* Stats Cards */}
          <div className="p-4 grid grid-cols-2 gap-2 border-b border-white/[0.06]">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Target className="h-3 w-3 text-blue-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Queue</span>
              </div>
              <p className="text-xl font-semibold text-white">{filteredLeads.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Flame className="h-3 w-3 text-amber-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Hot</span>
              </div>
              <p className="text-xl font-semibold text-white">{stats.goldMines}</p>
            </div>
          </div>

          {/* Lead Queue List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold px-2 mb-2">
                Lead Queue • {currentIndex + 1} of {filteredLeads.length}
              </p>

              {queueLeads.map((lead, idx) => {
                const isCurrent = currentLead?.id === lead.id;
                const isGoldMine = lead.verification_score >= 80;
                const isCallback = lead.status === "callback";

                return (
                  <button
                    key={lead.id}
                    onClick={() => {
                      setCurrentLead(lead);
                      setCurrentIndex(idx);
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all duration-200 group",
                      isCurrent
                        ? "bg-white/[0.06] border-white/[0.12] shadow-lg shadow-black/20"
                        : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            isCurrent ? "text-white" : "text-zinc300 group-hover:text-zinc-200"
                          )}>
                            {lead.business_name}
                          </p>
                          {isGoldMine && (
                            <Flame className="h-3 w-3 text-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-zinc-500">{lead.niche || "No niche"}</span>
                          <span className="text-zinc-700">•</span>
                          <span className="text-[11px] text-zinc-500">{lead.city || "Unknown"}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isCallback && (
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                        {isGoldMine && !isCurrent && (
                          <span className="text-[10px] font-medium text-amber-400">{lead.verification_score}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Content - Lead Card Area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d]">
          <div className="p-8">
            {filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-white/[0.06]">
                    <Phone className="h-10 w-10 text-zinc-600" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center">
                    <Search className="h-5 w-5 text-zinc-500" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No leads in queue</h3>
                <p className="text-sm text-zinc-500 max-w-sm mb-8">
                  {leads.length === 0
                    ? "Upload leads or discover new ones to start your calling session."
                    : "Try adjusting your filters to see more leads in your pipeline."
                  }
                </p>
                {leads.length === 0 && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => router.push("/discover")}
                      className="h-10 px-5 bg-white text-black hover:bg-zinc-200 font-medium rounded-lg transition-all duration-200"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Discover Leads
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/upload")}
                      className="h-10 px-5 bg-transparent border-white/[0.1] text-zinc-300 hover:bg-white/[0.05] hover:text-white font-medium rounded-lg transition-all duration-200"
                    >
                      Upload CSV
                    </Button>
                  </div>
                )}
              </div>
            ) : currentLead ? (
              <LeadCard
                lead={currentLead}
                onUpdate={handleUpdateLead}
                onNext={handleNext}
                onPrev={handlePrev}
                hasNext={currentIndex < filteredLeads.length - 1}
                hasPrev={currentIndex > 0}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
