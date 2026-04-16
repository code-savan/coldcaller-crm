"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { Lead } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  X,
  Bot,
  Megaphone,
  ExternalLink,
  Shield,
  Trash2,
  Eye,
  ArrowRight,
  AlertCircle,
  Filter,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReviewPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUsername(stored);
    loadFlaggedLeads(stored);
  }, [router]);

  const loadFlaggedLeads = async (user: string) => {
    setLoading(true);
    try {
      const records = await pb.collection("leads").getFullList({
        filter: `username = "${user}" && review_status = "flagged"`,
        sort: "-created",
      });
      setLeads(records as unknown as Lead[]);
    } catch (err) {
      console.error("Failed to load flagged leads:", err);
      toast.error("Failed to load review queue");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (lead: Lead) => {
    setActionLoading(lead.id);
    try {
      await pb.collection("leads").update(lead.id, {
        review_status: "approved",
        ai_reason: `${lead.ai_reason || ''} (Manually approved by user)`
      });
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      toast.success("Lead approved");
    } catch (err) {
      toast.error("Failed to approve lead");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (lead: Lead) => {
    setActionLoading(lead.id);
    try {
      await pb.collection("leads").update(lead.id, {
        review_status: "rejected",
        ai_reason: `${lead.ai_reason || ''} (Manually rejected by user)`
      });
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      toast.success("Lead rejected");
    } catch (err) {
      toast.error("Failed to reject lead");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm("Permanently delete this lead?")) return;
    setActionLoading(lead.id);
    try {
      await pb.collection("leads").delete(lead.id);
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      toast.success("Lead deleted");
    } catch (err) {
      toast.error("Failed to delete lead");
    } finally {
      setActionLoading(null);
    }
  };

  const getFlagReasons = (lead: Lead) => {
    const reasons = [];
    if (lead.ai_flags?.includes('agency_keywords_in_name')) {
      reasons.push('Agency keywords detected in page name');
    }
    if (lead.ai_flags?.includes('agency_speak_in_ad')) {
      reasons.push('Agency language in ad copy');
    }
    if (lead.ai_flags?.includes('manual_review_recommended')) {
      reasons.push('Low confidence - needs human review');
    }
    if (lead.ai_flags?.includes('low_confidence')) {
      reasons.push('AI uncertainty');
    }
    return reasons.length > 0 ? reasons : ['Flagged for manual review'];
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight">Review Queue</h1>
              <p className="text-[11px] text-zinc-500">AI-flagged leads needing review</p>
            </div>
          </div>

          <div className="h-6 w-px bg-white/[0.06]" />

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">
              {leads.length} pending
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadFlaggedLeads(username)}
          className="h-9 px-3 bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 text-zinc-600 animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">All Caught Up!</h3>
              <p className="text-sm text-zinc-500 max-w-md">
                No leads are currently flagged for review. New Meta Ads discoveries will appear here if the AI detects potential agencies or uncertain classifications.
              </p>
              <Button
                onClick={() => router.push("/discover")}
                className="mt-6 h-10 px-4 bg-white text-black hover:bg-zinc-200 font-medium rounded-lg"
              >
                Discover New Leads
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className={cn(
                    "bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden transition-all duration-200",
                    selectedLead?.id === lead.id && "border-amber-500/30 bg-amber-500/[0.02]"
                  )}
                >
                  {/* Lead Header */}
                  <div className="p-4 border-b border-white/[0.06]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white truncate">
                            {lead.business_name}
                          </h3>
                          <Badge
                            variant="outline"
                            className="bg-blue-500/10 border-blue-500/20 text-blue-400 text-[10px]"
                          >
                            <Megaphone className="h-3 w-3 mr-1" />
                            Meta Ads
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500">
                          {lead.niche} • {lead.city || 'Unknown location'}
                        </p>
                      </div>

                      {/* AI Confidence Score */}
                      <div className="flex-shrink-0 text-right">
                        <div className="text-2xl font-semibold text-zinc-300">
                          {lead.source_priority_score || 0}
                        </div>
                        <p className="text-[10px] text-zinc-500">AI Score</p>
                      </div>
                    </div>
                  </div>

                  {/* Flag Reasons */}
                  <div className="px-4 py-3 bg-amber-500/[0.03] border-b border-amber-500/10">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-amber-400 font-medium mb-1">Why was this flagged?</p>
                        <ul className="space-y-0.5">
                          {getFlagReasons(lead).map((reason, idx) => (
                            <li key={idx} className="text-[11px] text-zinc-500">
                              • {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Ad Preview */}
                  {lead.discovery_context && (
                    <div className="px-4 py-3 border-b border-white/[0.06]">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">
                        Suggested Opener
                      </p>
                      <p className="text-sm text-zinc-300 italic">
                        &ldquo;{lead.discovery_context}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="p-4 flex items-center gap-2">
                    <Button
                      onClick={() => handleApprove(lead)}
                      disabled={actionLoading === lead.id}
                      className="flex-1 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                    >
                      {actionLoading === lead.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => handleReject(lead)}
                      disabled={actionLoading === lead.id}
                      variant="outline"
                      className="flex-1 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>

                    <Button
                      onClick={() => handleDelete(lead)}
                      disabled={actionLoading === lead.id}
                      variant="outline"
                      className="h-10 w-10 p-0 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* View Details */}
                  {lead.source_url && (
                    <div className="px-4 pb-4">
                      <a
                        href={lead.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Ad Snapshot
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
