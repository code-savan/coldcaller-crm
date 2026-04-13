"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { pb, Lead } from "@/lib/pocketbase";
import { SessionStats } from "@/components/SessionStats";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  List,
  Search,
  Upload,
  TrendingUp,
  Clock,
  Target,
  ArrowRight,
  LayoutDashboard,
  Flame,
  Download,
  ChevronRight,
  Building2,
  MapPin,
  Zap,
  BarChart3
} from "lucide-react";
import { exportToCSV } from "@/lib/csvParser";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (!stored) {
      router.push("/login");
      return;
    }
    loadLeads(stored);
  }, [router]);

  const loadLeads = async (user: string) => {
    try {
      const result = await pb.collection("leads").getFullList<Lead>({
        filter: `username = "${user}"`,
        sort: "-created",
      });
      setLeads(result);
    } catch (err) {
      console.error("Failed to load leads:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type: "all" | "callbacks" | "gold") => {
    let data = leads;
    if (type === "callbacks") {
      data = leads.filter((l) => l.status === "callback");
    } else if (type === "gold") {
      data = leads.filter((l) => l.verification_score >= 80);
    }

    const headers = [
      "business_name", "contact_name", "phone", "city", "state",
      "niche", "website", "status", "notes", "call_count",
      "verification_score", "verification_tier",
    ];

    const csvData = data.map((l) => ({
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
      verification_tier: l.verification_score >= 80 ? "Gold Mine" :
                         l.verification_score >= 50 ? "Solid Lead" :
                         l.verification_score >= 20 ? "Lukewarm" : "Skip",
    }));

    const csv = exportToCSV(headers, csvData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_leads_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate stats
  const stats = {
    total: leads.length,
    notCalled: leads.filter((l) => l.status === "not_called").length,
    called: leads.filter((l) => l.status !== "not_called").length,
    callbacks: leads.filter((l) => l.status === "callback").length,
    gold: leads.filter((l) => l.verification_score >= 80).length,
  };

  // Get recent leads
  const recentLeads = leads.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-zinc-800" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-t-emerald-500 border-r-emerald-500 border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p className="text-sm text-zinc-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate additional stats
  const solidLeads = leads.filter(l => l.verification_score >= 50 && l.verification_score < 80).length;
  const lukewarmLeads = leads.filter(l => l.verification_score >= 20 && l.verification_score < 50).length;
  const progressPercent = stats.total > 0 ? (stats.called / stats.total) * 100 : 0;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header Bar */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-6">
          {/* Logo/Title Area */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <LayoutDashboard className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight">Dashboard</h1>
              <p className="text-[11px] text-zinc-500">Overview & Analytics</p>
            </div>
          </div>

          <Separator orientation="vertical" className="h-6 bg-white/[0.06]" />

          {/* Stats Summary */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Total:</span>
              <span className="text-zinc-200 font-medium">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Called:</span>
              <span className="text-emerald-400 font-medium">{stats.called}</span>
            </div>
            {stats.gold > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <Flame className="h-3 w-3 text-amber-400" />
                <span className="text-amber-400 font-medium">{stats.gold} Gold</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - CTA */}
        <div className="flex items-center gap-3">
          {/* Export Dropdown */}
          <div className="relative group">
            <Button
              variant="outline"
              className="h-9 px-4 bg-transparent border-white/[0.1] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200 hover:border-white/[0.15] font-medium text-sm rounded-lg transition-all duration-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {/* Export Options */}
            <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-zinc-900 border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <button
                onClick={() => handleExport("all")}
                className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.04] hover:text-white transition-colors"
              >
                All Leads
              </button>
              <button
                onClick={() => handleExport("callbacks")}
                className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.04] hover:text-white transition-colors"
              >
                Callbacks Only
              </button>
              <button
                onClick={() => handleExport("gold")}
                className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.04] hover:text-white transition-colors"
              >
                Gold Mines Only
              </button>
            </div>
          </div>

          <Button
            onClick={() => router.push("/operations")}
            className="h-9 px-4 bg-white text-black hover:bg-zinc-200 font-medium text-sm rounded-lg transition-all duration-200"
          >
            <Phone className="h-4 w-4 mr-2" />
            Start Calling
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d]">
        <div className="max-w-7xl mx-auto p-8 space-y-8">
          {/* Stats Grid */}
          <SessionStats leads={leads} />

          {/* Quick Actions Grid */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-4">Quick Actions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  title: "Operations",
                  desc: "Start calling session",
                  icon: Phone,
                  href: "/operations",
                  gradient: "from-emerald-500 to-teal-600",
                  iconBg: "bg-emerald-500/10",
                  iconColor: "text-emerald-400"
                },
                {
                  title: "Discover",
                  desc: "Find new leads",
                  icon: Search,
                  href: "/discover",
                  gradient: "from-violet-500 to-purple-600",
                  iconBg: "bg-violet-500/10",
                  iconColor: "text-violet-400"
                },
                {
                  title: "Leads",
                  desc: "Manage all leads",
                  icon: List,
                  href: "/leads",
                  gradient: "from-blue-500 to-indigo-600",
                  iconBg: "bg-blue-500/10",
                  iconColor: "text-blue-400"
                },
                {
                  title: "Upload",
                  desc: "Import CSV data",
                  icon: Upload,
                  href: "/upload",
                  gradient: "from-amber-500 to-orange-600",
                  iconBg: "bg-amber-500/10",
                  iconColor: "text-amber-400"
                },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.title}
                    onClick={() => router.push(action.href)}
                    className="group relative p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200 text-left"
                  >
                    {/* Glow effect */}
                    <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${action.gradient} opacity-0 rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-500`} />

                    <div className="relative flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl ${action.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${action.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white">{action.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{action.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Leads */}
            <div className="lg:col-span-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white tracking-tight">Recent Leads</h2>
                    <p className="text-[11px] text-zinc-500">Latest additions to your pipeline</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/leads")}
                  className="text-zinc-400 hover:text-white hover:bg-white/[0.05] text-xs font-medium"
                >
                  View All
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>

              <div className="p-6">
                {recentLeads.length > 0 ? (
                  <div className="space-y-2">
                    {recentLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => router.push("/operations")}
                        className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-zinc-800/50 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-4 w-4 text-zinc-500" />
                          </div>
                          <div>
                            <p className="font-medium text-zinc-200 text-sm">{lead.business_name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                              <MapPin className="h-3 w-3" />
                              <span>{lead.city}, {lead.state}</span>
                              <span className="text-zinc-700">•</span>
                              <span>{lead.niche}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide border",
                            lead.status === "not_called" && "bg-zinc-800/50 text-zinc-400 border-white/[0.06]",
                            lead.status === "answered" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                            lead.status === "callback" && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                            lead.status === "voicemail" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                            lead.status === "no_answer" && "bg-red-500/10 text-red-400 border-red-500/20",
                            lead.status === "not_interested" && "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
                            lead.status === "gatekeeper" && "bg-violet-500/10 text-violet-400 border-violet-500/20"
                          )}>
                            {lead.status.replace("_", " ")}
                          </span>
                          {lead.verification_score >= 80 && (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                              <Flame className="h-3 w-3" />
                              Gold
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                      <Zap className="h-7 w-7 text-zinc-600" />
                    </div>
                    <p className="text-sm text-zinc-400 mb-1">No leads yet</p>
                    <p className="text-xs text-zinc-500">Start by discovering or uploading leads</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar - Stats */}
            <div className="space-y-4">
              {/* Pipeline Progress */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="px-6 py-5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-violet-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white tracking-tight">Pipeline</h2>
                      <p className="text-[11px] text-zinc-500">Call progress breakdown</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Progress Overview */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-400">Progress</span>
                      <span className="text-sm font-medium text-white">{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-2">
                      {stats.called} of {stats.total} leads contacted
                    </p>
                  </div>

                  <Separator className="bg-white/[0.06]" />

                  {/* Status Breakdown */}
                  <div className="space-y-3">
                    <StatusBar label="Not Called" value={stats.notCalled} total={stats.total} color="bg-zinc-500" />
                    <StatusBar label="Called" value={stats.called} total={stats.total} color="bg-emerald-500" />
                    <StatusBar label="Callbacks" value={stats.callbacks} total={stats.total} color="bg-blue-500" />
                  </div>
                </div>
              </div>

              {/* Quality Breakdown */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="px-6 py-5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white tracking-tight">Quality</h2>
                      <p className="text-[11px] text-zinc-500">Lead quality breakdown</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-2">
                  <QualityRow
                    label="Gold Mine"
                    count={stats.gold}
                    icon={Flame}
                    iconColor="text-amber-400"
                    bgColor="bg-amber-500/10"
                    borderColor="border-amber-500/20"
                  />
                  <QualityRow
                    label="Solid Leads"
                    count={solidLeads}
                    icon={Zap}
                    iconColor="text-emerald-400"
                    bgColor="bg-emerald-500/10"
                    borderColor="border-emerald-500/20"
                  />
                  <QualityRow
                    label="Lukewarm"
                    count={lukewarmLeads}
                    icon={Clock}
                    iconColor="text-blue-400"
                    bgColor="bg-blue-500/10"
                    borderColor="border-blue-500/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper Components
function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className={cn("font-medium", color.replace("bg-", "text-"))}>{value}</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function QualityRow({
  label,
  count,
  icon: Icon,
  iconColor,
  bgColor,
  borderColor
}: {
  label: string;
  count: number;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.03] transition-colors">
      <div className="flex items-center gap-2">
        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", bgColor, borderColor)}>
          <Icon className={cn("h-3 w-3", iconColor)} />
        </div>
        <span className="text-sm text-zinc-300">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white">{count}</span>
    </div>
  );
}
