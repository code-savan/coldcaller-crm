"use client";

import { Lead } from "@/lib/pocketbase";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo } from "react";
import { Upload, Search, LayoutDashboard, Filter, List, Phone } from "lucide-react";

interface SidebarProps {
  leads: Lead[];
  currentLeadId: string | null;
  onSelectLead: (lead: Lead) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  nicheFilter: string;
  onNicheFilterChange: (niche: string) => void;
}

const filters = [
  { id: "all", label: "All" },
  { id: "not_called", label: "Not Called" },
  { id: "callback", label: "Callbacks" },
  { id: "answered", label: "Answered" },
];

const statusColors: Record<string, string> = {
  not_called: "border-l-gray-400",
  answered: "border-l-green-500",
  voicemail: "border-l-orange-400",
  no_answer: "border-l-red-400",
  not_interested: "border-l-gray-500",
  callback: "border-l-blue-500",
  gatekeeper: "border-l-purple-500",
};

const statusLabels: Record<string, string> = {
  not_called: "Not Called",
  answered: "Answered",
  voicemail: "Voicemail",
  no_answer: "No Answer",
  not_interested: "Not Interested",
  callback: "Callback",
  gatekeeper: "Gatekeeper",
};

export function Sidebar({
  leads,
  currentLeadId,
  onSelectLead,
  filter,
  onFilterChange,
  nicheFilter,
  onNicheFilterChange,
}: SidebarProps) {
  // Get unique niches from leads
  const niches = useMemo(() => {
    const uniqueNiches = new Set(leads.map(l => l.niche).filter(Boolean));
    return ["all", ...Array.from(uniqueNiches).sort()];
  }, [leads]);

  const filteredLeads = leads.filter((lead) => {
    const statusMatch = filter === "all" || lead.status === filter;
    const nicheMatch = nicheFilter === "all" || lead.niche === nicheFilter;
    return statusMatch && nicheMatch;
  });

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden border-r border-zinc-800/50">
      {/* Header */}
      <div className="p-5 border-b border-zinc-800/50">
        <h1 className="text-xl font-bold gradient-text tracking-tight">CallFlow</h1>
        <p className="text-xs text-zinc-500 mt-1 font-medium uppercase tracking-wider">Lead Management</p>
      </div>

      {/* Navigation Links */}
      <div className="p-3 border-b border-zinc-800/50 bg-zinc-900/30">
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/leads"
            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-gradient-to-br from-violet-600/20 to-purple-600/20 hover:from-violet-600/30 hover:to-purple-600/30 border border-violet-500/20 transition-colors text-violet-400 hover:text-violet-300"
          >
            <List className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-wide">Leads</span>
          </Link>
          <Link
            href="/discover"
            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
          >
            <Search className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-wide">Discover</span>
          </Link>
          <Link
            href="/upload"
            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
          >
            <Upload className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-wide">Upload</span>
          </Link>
        </div>
        {/* Dialer - Coming Soon */}
        <div className="mt-2 p-2 rounded-lg bg-zinc-950/50 border border-zinc-800/50 opacity-60">
          <div className="flex items-center justify-center gap-2 text-zinc-500">
            <Phone className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wide">Dialer</span>
            <span className="text-[9px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">Soon</span>
          </div>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200",
              filter === f.id
                ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/20"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Niche Filter */}
      <div className="px-3 pb-3 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Niche</span>
        </div>
        <select
          value={nicheFilter}
          onChange={(e) => onNicheFilterChange(e.target.value)}
          className="w-full mt-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}
        >
          {niches.map((niche) => (
            <option key={niche} value={niche}>
              {niche === "all" ? "All Niches" : niche}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-zinc-600 mt-1">
          Showing {filteredLeads.length} leads
        </p>
      </div>

      {/* Lead List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-zinc-600">
            <p className="text-sm">No leads found</p>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => onSelectLead(lead)}
              className={cn(
                "w-full text-left p-3 rounded-xl border-l-4 transition-all duration-200 group",
                statusColors[lead.status] || "border-l-zinc-600",
                currentLeadId === lead.id
                  ? "bg-zinc-900 border-zinc-700 ring-1 ring-zinc-700"
                  : "bg-zinc-900/40 hover:bg-zinc-900 border-transparent hover:border-zinc-700"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-zinc-200 truncate group-hover:text-white transition-colors">
                    {lead.business_name}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {lead.city}, {lead.state}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {lead.verified && (
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                        lead.verification_score >= 80
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : lead.verification_score >= 50
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : lead.verification_score >= 20
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"
                      )}
                      title={lead.verification_score >= 80 ? "Gold Mine" : lead.verification_score >= 50 ? "Solid Lead" : lead.verification_score >= 20 ? "Lukewarm" : "Skip"}
                    >
                      {lead.verification_score >= 80 ? "🔥 GOLD" : lead.verification_score >= 50 ? "SOLID" : lead.verification_score >= 20 ? "WARM" : lead.verification_score > 0 ? "LOW" : "—"}
                    </span>
                  )}
                  {!lead.verified && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-zinc-800 text-zinc-500 border border-zinc-700" title="Not Verified">
                      ?
                    </span>
                  )}
                </div>
              </div>
              {lead.status !== "not_called" && (
                <span
                  className={cn(
                    "inline-block mt-2 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide",
                    lead.status === "answered" && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
                    lead.status === "callback" && "bg-blue-500/15 text-blue-400 border border-blue-500/20",
                    lead.status === "voicemail" && "bg-orange-500/15 text-orange-400 border border-orange-500/20",
                    lead.status === "no_answer" && "bg-red-500/15 text-red-400 border border-red-500/20",
                    lead.status === "not_interested" && "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20",
                    lead.status === "gatekeeper" && "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                  )}
                >
                  {statusLabels[lead.status]}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-zinc-800/50 bg-zinc-950/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500 font-medium">
            {leads.filter((l) => l.status !== "not_called").length} / {leads.length}
          </span>
          <span className="text-zinc-600">called</span>
        </div>
        <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${leads.length > 0 ? (leads.filter((l) => l.status !== "not_called").length / leads.length) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}
