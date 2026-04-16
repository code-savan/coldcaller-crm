"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { pb, User, Lead, Session } from "@/lib/pocketbase";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CallerStats } from "@/components/admin/CallerStats";
import { SessionTable } from "@/components/admin/SessionTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  UserCircle,
  Phone,
  CheckCircle2,
  Clock,
  Calendar,
  ArrowLeft,
  Trash2,
  Download,
  TrendingUp,
  Users,
  Flame,
  CheckCircle,
  Voicemail,
  XCircle,
  ThumbsDown,
  RotateCcw,
  Shield,
  MapPin,
} from "lucide-react";
import { SessionData, loadSessionsFromDB } from "@/lib/sessions";
import { exportToCSV } from "@/lib/csvParser";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  not_called: { label: "Not Called", color: "text-zinc-400", icon: Users },
  answered: { label: "Answered", color: "text-emerald-400", icon: CheckCircle },
  voicemail: { label: "Voicemail", color: "text-amber-400", icon: Voicemail },
  no_answer: { label: "No Answer", color: "text-red-400", icon: XCircle },
  not_interested: { label: "Not Interested", color: "text-zinc-400", icon: ThumbsDown },
  callback: { label: "Callback", color: "text-blue-400", icon: RotateCcw },
  gatekeeper: { label: "Gatekeeper", color: "text-violet-400", icon: Shield },
};

export default function CallerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  const [user, setUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [sessionPage, setSessionPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const SESSIONS_PER_PAGE = 10;

  // Admin access check
  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
  }, [router]);

  // Load caller data
  useEffect(() => {
    if (!username) return;
    loadCallerData();
  }, [username]);

  const loadCallerData = async () => {
    setLoading(true);
    try {
      // Load user
      const usersResult = await pb.collection("users").getList<User>(1, 1, {
        filter: `username = "${username}"`,
      });
      if (usersResult.items.length === 0) {
        router.push("/admin/overview");
        return;
      }
      setUser(usersResult.items[0]);

      // Load leads
      const leadsResult = await pb.collection("leads").getFullList<Lead>({
        filter: `username = "${username}"`,
        sort: "-created",
      });
      setLeads(leadsResult);

      // Load sessions from DB
      const dbSessions = await loadSessionsFromDB(username);
      setSessions(dbSessions);
    } catch (err) {
      console.error("Failed to load caller data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const today = new Date().toISOString().split("T")[0];
  const todaySessions = sessions.filter((s) => s.startTime.startsWith(today));
  const todayCalls = todaySessions.reduce((sum, s) => sum + s.totalCalls, 0);
  const todayAnswered = todaySessions.reduce((sum, s) => sum + s.answered, 0);
  const todayCallbacks = todaySessions.reduce((sum, s) => sum + s.callbacks, 0);
  const todayAnswerRate = todayCalls > 0 ? Math.round((todayAnswered / todayCalls) * 100) : 0;

  // Lead breakdown by status
  const statusCounts = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Lead breakdown by tier
  const goldMines = leads.filter((l) => l.verification_score >= 80).length;
  const solid = leads.filter((l) => l.verification_score >= 50 && l.verification_score < 80).length;
  const lukewarm = leads.filter((l) => l.verification_score >= 20 && l.verification_score < 50).length;
  const skip = leads.filter((l) => l.verification_score > 0 && l.verification_score < 20).length;
  const unverified = leads.filter((l) => !l.verified || l.verification_score === 0).length;

  // Format last active
  const formatLastActive = (isoString?: string) => {
    if (!isoString) return "Never";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  // Handle delete all leads
  const handleDeleteAllLeads = async () => {
    if (!confirm(`Are you sure you want to delete all ${leads.length} leads for ${username}? This cannot be undone.`)) {
      return;
    }

    try {
      for (const lead of leads) {
        await pb.collection("leads").delete(lead.id);
      }
      setLeads([]);
      alert("All leads deleted successfully");
    } catch (err) {
      console.error("Failed to delete leads:", err);
      alert("Failed to delete some leads");
    }
  };

  // Handle export leads
  const handleExportLeads = () => {
    const headers = [
      "business_name",
      "contact_name",
      "phone",
      "city",
      "state",
      "niche",
      "website",
      "status",
      "notes",
      "call_count",
      "verification_score",
    ];
    const csvData = leads.map((l) => ({
      business_name: l.business_name,
      contact_name: l.contact_name,
      phone: l.phone,
      city: l.city,
      state: l.state,
      niche: l.niche,
      website: l.website,
      status: l.status,
      notes: l.notes,
      call_count: l.call_count,
      verification_score: l.verification_score,
    }));
    const csv = exportToCSV(headers, csvData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${username}_leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pagination for sessions
  const totalSessionPages = Math.ceil(sessions.length / SESSIONS_PER_PAGE);
  const paginatedSessions = sessions.slice(
    (sessionPage - 1) * SESSIONS_PER_PAGE,
    sessionPage * SESSIONS_PER_PAGE
  );

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
              <p className="text-sm text-zinc-500 font-medium">Loading caller data...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-zinc-500">Caller not found</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/overview")}
          className="bg-transparent border-white/[0.1] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Caller Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <UserCircle className="h-8 w-8 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{user.username}</h1>
              <Badge
                className={`${
                  user.session_active
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                {user.session_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {user.name && <p className="text-zinc-400">{user.name}</p>}
            <p className="text-sm text-zinc-500 mt-1">
              Last seen {formatLastActive(user.last_active)} • Joined{" "}
              {new Date(user.created).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportLeads}
            className="bg-transparent border-white/[0.1] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Leads
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAllLeads}
            className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All
          </Button>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="mb-8">
        <CallerStats
          calls={todayCalls}
          answered={todayAnswered}
          answerRate={todayAnswerRate}
          callbacks={todayCallbacks}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session History */}
        <div className="lg:col-span-2">
          <Card className="bg-white/[0.02] border-white/[0.06]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-white">
                    Session History
                  </CardTitle>
                  <p className="text-xs text-zinc-500">{sessions.length} total sessions</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-zinc-500">No sessions recorded</p>
                </div>
              ) : (
                <SessionTable
                  sessions={paginatedSessions}
                  page={sessionPage}
                  totalPages={totalSessionPages}
                  onPageChange={setSessionPage}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lead Quality Breakdown */}
        <div className="space-y-6">
          {/* Status Breakdown */}
          <Card className="bg-white/[0.02] border-white/[0.06]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-white">
                    Lead Status
                  </CardTitle>
                  <p className="text-xs text-zinc-500">
                    {leads.length} total leads
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                  const count = statusCounts[status] || 0;
                  const percentage = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                  const Icon = config.icon;

                  return (
                    <div key={status} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span className="text-sm text-zinc-300">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">{count}</span>
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              status === "answered"
                                ? "bg-emerald-500"
                                : status === "callback"
                                ? "bg-blue-500"
                                : status === "voicemail"
                                ? "bg-amber-500"
                                : "bg-zinc-600"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Verification Tier Breakdown */}
          <Card className="bg-white/[0.02] border-white/[0.06]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Flame className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-white">
                    Quality Tiers
                  </CardTitle>
                  <p className="text-xs text-zinc-500">
                    {leads.filter((l) => l.verified).length} verified
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <TierRow label="Gold Mine" count={goldMines} color="amber" total={leads.length} />
                <TierRow label="Solid" count={solid} color="emerald" total={leads.length} />
                <TierRow label="Lukewarm" count={lukewarm} color="blue" total={leads.length} />
                <TierRow label="Skip" count={skip} color="zinc" total={leads.length} />
                <TierRow label="Unverified" count={unverified} color="zinc" total={leads.length} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}

// Tier Row Component
function TierRow({
  label,
  count,
  color,
  total,
}: {
  label: string;
  count: number;
  color: string;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  const colorClasses: Record<string, { bg: string; text: string; bar: string }> = {
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", bar: "bg-amber-500" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", bar: "bg-emerald-500" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", bar: "bg-blue-500" },
    zinc: { bg: "bg-zinc-800", text: "text-zinc-400", bar: "bg-zinc-500" },
  };

  const colors = colorClasses[color];

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${colors.bar}`} />
        <span className="text-sm text-zinc-300">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-white">{count}</span>
        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </div>
  );
}
