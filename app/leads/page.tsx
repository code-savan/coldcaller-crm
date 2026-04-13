"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { pb, Lead } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Phone,
  MapPin,
  ExternalLink,
  Edit3,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Play,
  List,
  Filter,
  ChevronDown,
  Building2,
  Flame,
  MoreHorizontal,
  X,
  CheckCircle2,
  ArrowRight,
  Zap,
  Users
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/csvParser";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "not_called", label: "Not Called" },
  { value: "answered", label: "Answered" },
  { value: "voicemail", label: "Voicemail" },
  { value: "no_answer", label: "No Answer" },
  { value: "callback", label: "Callback" },
  { value: "not_interested", label: "Not Interested" },
  { value: "gatekeeper", label: "Gatekeeper" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; borderColor: string; bgColor: string }> = {
  not_called: { label: "Not Called", color: "text-zinc-400", borderColor: "border-white/[0.06]", bgColor: "bg-zinc-800/30" },
  answered: { label: "Answered", color: "text-emerald-400", borderColor: "border-emerald-500/20", bgColor: "bg-emerald-500/10" },
  voicemail: { label: "Voicemail", color: "text-amber-400", borderColor: "border-amber-500/20", bgColor: "bg-amber-500/10" },
  no_answer: { label: "No Answer", color: "text-red-400", borderColor: "border-red-500/20", bgColor: "bg-red-500/10" },
  callback: { label: "Callback", color: "text-blue-400", borderColor: "border-blue-500/20", bgColor: "bg-blue-500/10" },
  not_interested: { label: "Not Interested", color: "text-zinc-400", borderColor: "border-zinc-500/20", bgColor: "bg-zinc-500/10" },
  gatekeeper: { label: "Gatekeeper", color: "text-violet-400", borderColor: "border-violet-500/20", bgColor: "bg-violet-500/10" },
};

const ITEMS_PER_PAGE = 20;

export default function LeadsPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Edit modal
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUsername(stored);
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

  // Get unique niches
  const niches = Array.from(new Set(leads.map(l => l.niche).filter(Boolean))).sort();

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesNiche = nicheFilter === "all" || lead.niche === nicheFilter;

    let matchesScore = true;
    if (scoreFilter === "gold") matchesScore = lead.verification_score >= 80;
    else if (scoreFilter === "solid") matchesScore = lead.verification_score >= 50 && lead.verification_score < 80;
    else if (scoreFilter === "warm") matchesScore = lead.verification_score >= 20 && lead.verification_score < 50;
    else if (scoreFilter === "low") matchesScore = lead.verification_score < 20 && lead.verification_score > 0;

    return matchesSearch && matchesStatus && matchesNiche && matchesScore;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Delete ${lead.business_name}?`)) return;
    try {
      await pb.collection("leads").delete(lead.id);
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleCall = (lead: Lead) => {
    // Store the lead ID to focus on in operations
    localStorage.setItem("focusLeadId", lead.id);
    router.push("/operations");
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setEditForm({
      business_name: lead.business_name,
      contact_name: lead.contact_name,
      phone: lead.phone,
      city: lead.city,
      state: lead.state,
      niche: lead.niche,
      website: lead.website,
      notes: lead.notes,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingLead) return;
    try {
      await pb.collection("leads").update(editingLead.id, editForm);
      setLeads((prev) =>
        prev.map((l) => (l.id === editingLead.id ? { ...l, ...editForm } as Lead : l))
      );
      setEditingLead(null);
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const handleExport = () => {
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
    const csvData = filteredLeads.map((l) => ({
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
    a.download = `leads_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "answered": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "callback": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "voicemail": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "no_answer": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "not_interested": return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
      case "gatekeeper": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default: return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: "🔥 GOLD", class: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
    if (score >= 50) return { label: "SOLID", class: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    if (score >= 20) return { label: "WARM", class: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
    if (score > 0) return { label: "LOW", class: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" };
    return { label: "—", class: "bg-zinc-800 text-zinc-500 border-zinc-700" };
  };

  // Calculate stats
  const goldCount = leads.filter(l => l.verification_score >= 80).length;
  const calledCount = leads.filter(l => l.status !== "not_called").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-zinc-800" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-t-emerald-500 border-r-emerald-500 border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p className="text-sm text-zinc-500 font-medium">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header Bar */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-6">
          {/* Logo/Title Area */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <List className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight">Leads</h1>
              <p className="text-[11px] text-zinc-500">Manage your pipeline</p>
            </div>
          </div>

          <Separator orientation="vertical" className="h-6 bg-white/[0.06]" />

          {/* Stats Summary */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <Users className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-zinc-500">Total:</span>
              <span className="text-zinc-200 font-medium">{leads.length}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-zinc-500">Called:</span>
              <span className="text-emerald-400 font-medium">{calledCount}</span>
            </div>
            {goldCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <Flame className="h-3 w-3 text-amber-400" />
                <span className="text-amber-400 font-medium">{goldCount} Gold</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-9 px-4 bg-transparent border-white/[0.1] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200 hover:border-white/[0.15] font-medium text-sm rounded-lg transition-all duration-200"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => router.push("/discover")}
            className="h-9 px-4 bg-white text-black hover:bg-zinc-200 font-medium text-sm rounded-lg transition-all duration-200"
          >
            <Zap className="h-4 w-4 mr-2" />
            Discover
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d]">
        <div className="max-w-7xl mx-auto p-8 space-y-6">
          {/* Filters Card */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="px-6 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                  <Filter className="h-4 w-4 text-zinc-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white tracking-tight">Filters</h2>
                  <p className="text-[11px] text-zinc-500">{filteredLeads.length} leads match your criteria</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="Search by business, phone, or city..."
                    className="pl-10 bg-zinc-900/50 border-white/[0.08] text-zinc-200 placeholder:text-zinc-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
                  />
                </div>

                {/* Filter Dropdowns */}
                <div className="flex gap-3 flex-wrap">
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                      className="appearance-none px-4 py-2.5 bg-zinc-900/50 border border-white/[0.08] rounded-xl text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all cursor-pointer pr-10"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select
                      value={nicheFilter}
                      onChange={(e) => { setNicheFilter(e.target.value); setCurrentPage(1); }}
                      className="appearance-none px-4 py-2.5 bg-zinc-900/50 border border-white/[0.08] rounded-xl text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all cursor-pointer pr-10 min-w-[140px]"
                    >
                      <option value="all">All Niches</option>
                      {niches.map((niche) => (
                        <option key={niche} value={niche}>{niche}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select
                      value={scoreFilter}
                      onChange={(e) => { setScoreFilter(e.target.value); setCurrentPage(1); }}
                      className="appearance-none px-4 py-2.5 bg-zinc-900/50 border border-white/[0.08] rounded-xl text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all cursor-pointer pr-10 min-w-[140px]"
                    >
                      <option value="all">All Scores</option>
                      <option value="gold">🔥 Gold (80+)</option>
                      <option value="solid">✅ Solid (50-79)</option>
                      <option value="warm">💡 Warm (20-49)</option>
                      <option value="low">📉 Low (&lt;20)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Leads Grid */}
          <div className="space-y-2">
            {paginatedLeads.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-zinc-600" />
                </div>
                <p className="text-zinc-400 mb-1">No leads found</p>
                <p className="text-sm text-zinc-500 mb-6">Try adjusting your filters or discover new leads</p>
                <Link href="/discover">
                  <Button className="h-10 px-5 bg-white text-black hover:bg-zinc-200 font-medium rounded-lg transition-all duration-200">
                    <Zap className="h-4 w-4 mr-2" />
                    Discover New Leads
                  </Button>
                </Link>
              </div>
            ) : (
              paginatedLeads.map((lead) => {
                const scoreBadge = getScoreBadge(lead.verification_score);
                const isGoldMine = lead.verification_score >= 80;
                const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.not_called;

                return (
                  <div
                    key={lead.id}
                    className="group p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-medium text-zinc-200 truncate">{lead.business_name}</h3>
                          {isGoldMine && (
                            <Flame className="h-3.5 w-3.5 text-amber-400" />
                          )}
                          {lead.niche && (
                            <span className="text-[11px] text-zinc-500">{lead.niche}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-500 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            <span className="text-zinc-400">{lead.phone}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {lead.city}, {lead.state}
                          </span>
                          {lead.website && (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Website
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {lead.status !== "not_called" && (
                          <span className={cn(
                            "px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide border",
                            statusConfig.bgColor,
                            statusConfig.borderColor,
                            statusConfig.color
                          )}>
                            {statusConfig.label}
                          </span>
                        )}
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide border",
                          scoreBadge.class
                        )}>
                          {scoreBadge.label}
                        </span>
                        {lead.verified && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCall(lead)}
                          className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg"
                          title="Call this lead"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(lead)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-white/[0.05] rounded-lg"
                          title="Edit lead"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(lead)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                          title="Delete lead"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Notes Preview */}
                    {lead.notes && (
                      <div className="mt-3 pt-3 border-t border-white/[0.04]">
                        <p className="text-xs text-zinc-500 line-clamp-2">{lead.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-zinc-500">
                Showing <span className="text-zinc-300">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> - <span className="text-zinc-300">{Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads.length)}</span> of <span className="text-zinc-300">{filteredLeads.length}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-9 px-3 bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 hover:border-white/[0.1] rounded-lg transition-all duration-200 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </Button>
                <span className="text-sm text-zinc-400 px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 px-3 bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 hover:border-white/[0.1] rounded-lg transition-all duration-200 disabled:opacity-30"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {editingLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/[0.08] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Edit3 className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white tracking-tight">Edit Lead</h2>
                    <p className="text-[11px] text-zinc-500">Update lead information</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingLead(null)}
                  className="p-2 rounded-lg hover:bg-white/[0.05] text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">Business Name</label>
                  <Input
                    value={editForm.business_name || ""}
                    onChange={(e) => setEditForm(f => ({ ...f, business_name: e.target.value }))}
                    className="bg-zinc-950/50 border-white/[0.08] text-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">Contact Name</label>
                    <Input
                      value={editForm.contact_name || ""}
                      onChange={(e) => setEditForm(f => ({ ...f, contact_name: e.target.value }))}
                      className="bg-zinc-950/50 border-white/[0.08] text-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">Phone</label>
                    <Input
                      value={editForm.phone || ""}
                      onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      className="bg-zinc-950/50 border-white/[0.08] text-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">City</label>
                    <Input
                      value={editForm.city || ""}
                      onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))}
                      className="bg-zinc-950/50 border-white/[0.08] text-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">State</label>
                    <Input
                      value={editForm.state || ""}
                      onChange={(e) => setEditForm(f => ({ ...f, state: e.target.value }))}
                      className="bg-zinc-950/50 border-white/[0.08] text-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">Niche</label>
                  <Input
                    value={editForm.niche || ""}
                    onChange={(e) => setEditForm(f => ({ ...f, niche: e.target.value }))}
                    className="bg-zinc-950/50 border-white/[0.08] text-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">Website</label>
                  <Input
                    value={editForm.website || ""}
                    onChange={(e) => setEditForm(f => ({ ...f, website: e.target.value }))}
                    className="bg-zinc-950/50 border-white/[0.08] text-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">Notes</label>
                  <textarea
                    value={editForm.notes || ""}
                    onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-zinc-950/50 border border-white/[0.08] rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/[0.06]">
                <Button
                  variant="outline"
                  onClick={() => setEditingLead(null)}
                  className="h-10 px-4 bg-transparent border-white/[0.08] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200 hover:border-white/[0.12] rounded-lg transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="h-10 px-5 bg-white text-black hover:bg-zinc-200 font-medium rounded-lg transition-all duration-200"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
