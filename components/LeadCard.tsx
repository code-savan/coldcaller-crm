"use client";

import { useState } from "react";
import { Lead } from "@/lib/pocketbase";
import { pb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { VerifyButton } from "./VerifyButton";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  MapPin,
  Globe,
  User,
  ChevronLeft,
  ChevronRight,
  Building2,
  Flame,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowUpRight,
  StickyNote,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
  onUpdate: (updated: Lead) => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

const outcomes = [
  { id: "answered", label: "Answered", icon: CheckCircle2, color: "bg-emerald-500", borderColor: "border-emerald-500/30", textColor: "text-emerald-400" },
  { id: "voicemail", label: "Voicemail", icon: Phone, color: "bg-amber-500", borderColor: "border-amber-500/30", textColor: "text-amber-400" },
  { id: "no_answer", label: "No Answer", icon: Phone, color: "bg-red-500", borderColor: "border-red-500/30", textColor: "text-red-400" },
  { id: "not_interested", label: "Not Interested", icon: Phone, color: "bg-zinc-500", borderColor: "border-zinc-500/30", textColor: "text-zinc-400" },
  { id: "callback", label: "Callback", icon: Calendar, color: "bg-blue-500", borderColor: "border-blue-500/30", textColor: "text-blue-400" },
  { id: "gatekeeper", label: "Gatekeeper", icon: User, color: "bg-violet-500", borderColor: "border-violet-500/30", textColor: "text-violet-400" },
];

export function LeadCard({ lead, onUpdate, onNext, onPrev, hasNext, hasPrev }: LeadCardProps) {
  const [notes, setNotes] = useState(lead.notes || "");
  const [callbackDate, setCallbackDate] = useState(lead.callback_datetime || "");
  const [saving, setSaving] = useState(false);

  const handleCall = async () => {
    // Update call count and last called
    const updated = await pb.collection("leads").update(lead.id, {
      call_count: (lead.call_count || 0) + 1,
      last_called: new Date().toISOString(),
    });
    onUpdate(updated as unknown as Lead);

    // Open phone dialer
    window.location.href = `tel:${lead.phone.replace(/\D/g, "")}`;
  };

  const handleOutcome = async (status: string) => {
    setSaving(true);
    try {
      const updateData: any = { status };

      if (status === "callback" && callbackDate) {
        updateData.callback_datetime = callbackDate;
      }

      const updated = await pb.collection("leads").update(lead.id, updateData);
      onUpdate(updated as unknown as Lead);
    } catch (err) {
      console.error("Failed to update:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleNotesChange = async (value: string) => {
    setNotes(value);
    // Debounced save
    setTimeout(async () => {
      try {
        const updated = await pb.collection("leads").update(lead.id, { notes: value });
        onUpdate(updated as unknown as Lead);
      } catch (err) {
        console.error("Failed to save notes:", err);
      }
    }, 500);
  };

  const isGoldMine = lead.verified && lead.verification_score >= 80;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Main Card Container */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Header Section */}
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Business Name & Verification */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-white truncate tracking-tight">
                      {lead.business_name}
                    </h2>
                    {isGoldMine && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <Flame className="h-3 w-3 text-amber-400" />
                        <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Gold Mine</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {lead.niche && (
                      <span className="text-sm text-zinc-400">{lead.niche}</span>
                    )}
                    {(lead.city || lead.state) && (
                      <>
                        <span className="text-zinc-600">•</span>
                        <span className="text-sm text-zinc-500">
                          {lead.city}{lead.city && lead.state ? ", " : ""}{lead.state}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <VerifyButton lead={lead} onVerified={onUpdate} />
          </div>

          {/* Verification Score Badge */}
          {lead.verified && (
            <div className="mt-4 flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                lead.verification_score >= 80
                  ? "bg-amber-500/5 border-amber-500/20"
                  : lead.verification_score >= 50
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-zinc-500/5 border-zinc-500/20"
              )}>
                <Sparkles className={cn(
                  "h-3.5 w-3.5",
                  lead.verification_score >= 80
                    ? "text-amber-400"
                    : lead.verification_score >= 50
                    ? "text-emerald-400"
                    : "text-zinc-400"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  lead.verification_score >= 80
                    ? "text-amber-400"
                    : lead.verification_score >= 50
                    ? "text-emerald-400"
                    : "text-zinc-400"
                )}>
                  {lead.verification_score}/100 Verified
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Contact Information Grid */}
        <div className="p-6 border-b border-white/[0.06]">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-4">Contact Information</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lead.contact_name && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                  <User className="h-4 w-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Contact</p>
                  <p className="text-sm font-medium text-zinc-200">{lead.contact_name}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Phone className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Phone</p>
                <p className="text-sm font-medium text-zinc-200">{lead.phone}</p>
              </div>
            </div>

            {(lead.city || lead.state) && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Location</p>
                  <p className="text-sm font-medium text-zinc-200">
                    {lead.city}{lead.city && lead.state ? ", " : ""}{lead.state}
                  </p>
                </div>
              </div>
            )}

            {lead.website && (
              <a
                href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Website</p>
                  <p className="text-sm font-medium text-violet-400 truncate flex items-center gap-1">
                    {lead.website}
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* Primary Action - Call Button */}
        <div className="p-6 border-b border-white/[0.06]">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-4">Actions</p>

          <Button
            onClick={handleCall}
            className="w-full h-14 text-base bg-white text-black hover:bg-zinc-200 font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-white/5 hover:shadow-xl hover:shadow-white/10"
          >
            <Phone className="h-5 w-5 mr-2" />
            Call {lead.phone}
          </Button>
        </div>

        {/* Call Outcomes */}
        <div className="p-6 border-b border-white/[0.06]">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-4">Call Outcome</p>

          <div className="grid grid-cols-3 gap-2">
            {outcomes.map((outcome) => {
              const Icon = outcome.icon;
              const isActive = lead.status === outcome.id;

              return (
                <button
                  key={outcome.id}
                  onClick={() => handleOutcome(outcome.id)}
                  disabled={saving}
                  className={cn(
                    "h-auto py-3 px-2 flex flex-col items-center gap-2 rounded-xl border transition-all duration-200",
                    isActive
                      ? `${outcome.color} ${outcome.borderColor} ${outcome.textColor} border shadow-lg shadow-black/20`
                      : "bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:bg-white/[0.04] hover:border-white/[0.1] hover:text-zinc-300"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4",
                    isActive ? "text-white" : ""
                  )} />
                  <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-wide",
                    isActive ? "text-white" : ""
                  )}>
                    {outcome.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Callback Scheduler */}
          {lead.status === "callback" && (
            <div className="mt-4 p-4 rounded-xl bg-blue-500/[0.03] border border-blue-500/20 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Schedule Callback</span>
              </div>
              <input
                type="datetime-local"
                value={callbackDate}
                onChange={(e) => setCallbackDate(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/[0.08] rounded-xl text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
              />
            </div>
          )}
        </div>

        {/* Call Notes */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <StickyNote className="h-4 w-4 text-zinc-500" />
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Call Notes</p>
          </div>

          <textarea
            placeholder="What did they say? Any important details to remember..."
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            className="w-full min-h-[140px] px-4 py-4 bg-zinc-900/30 border border-white/[0.06] rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="mt-4 flex items-center justify-between px-2">
        <Button
          onClick={onPrev}
          disabled={!hasPrev}
          variant="outline"
          className="h-10 px-4 bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 hover:border-white/[0.1] disabled:opacity-30 rounded-lg transition-all duration-200"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous Lead
        </Button>

        <span className="text-xs text-zinc-600">
          Use keyboard arrows to navigate
        </span>

        <Button
          onClick={onNext}
          disabled={!hasNext}
          className="h-10 px-4 bg-white text-black hover:bg-zinc-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-30"
        >
          Next Lead
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
