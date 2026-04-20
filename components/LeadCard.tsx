"use client";

import { useState } from "react";
import { Lead } from "@/lib/pocketbase";
import { pb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { VerifyButton } from "./VerifyButton";
import { Separator } from "@/components/ui/separator";
import { useCallStore } from "@/lib/callState";
import { getDevice, initDevice, isDeviceReady } from "@/lib/twilioDevice";
import type { Call } from "@twilio/voice-sdk";
import { toast } from "sonner";
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
  Sparkles,
  Megaphone,
  MapPinned,
  AlertTriangle,
  Bot,
  ExternalLink,
  Copy
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

// Source badge config
const sourceConfig = {
  google_places: {
    icon: MapPinned,
    label: 'Google Places',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20'
  },
  meta_ads: {
    icon: Megaphone,
    label: 'Meta Ads',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  facebook_group: {
    icon: User,
    label: 'Facebook',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20'
  },
  linkedin: {
    icon: User,
    label: 'LinkedIn',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  manual: {
    icon: User,
    label: 'Manual',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/20'
  }
};

export function LeadCard({ lead, onUpdate, onNext, onPrev, hasNext, hasPrev }: LeadCardProps) {
  const [notes, setNotes] = useState(lead.notes || "");
  const [callbackDate, setCallbackDate] = useState(lead.callback_datetime || "");
  const [saving, setSaving] = useState(false);

  const handleCall = async () => {
    // Resume audio context (browser requires user gesture)
    try {
      const audioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (audioContext) {
        const ctx = new audioContext();
        if (ctx.state === "suspended") {
          await ctx.resume();
          console.log("[Call] AudioContext resumed");
        }
      }
    } catch (e) {
      console.log("[Call] AudioContext resume failed:", e);
    }

    // Update call count and last called
    const updated = await pb.collection("leads").update(lead.id, {
      call_count: (lead.call_count || 0) + 1,
      last_called: new Date().toISOString(),
    });
    onUpdate(updated as unknown as Lead);

    // Try Twilio calling
    const username = localStorage.getItem("username");
    if (!username) {
      // Fallback to tel: link
      window.location.href = `tel:${lead.phone.replace(/\D/g, "")}`;
      return;
    }

    let cleanedPhone = lead.phone.replace(/\D/g, "");
    // Ensure E.164 format (add + if not present for US numbers starting with 1)
    if (cleanedPhone.length === 10) {
      cleanedPhone = "+1" + cleanedPhone;
    } else if (cleanedPhone.length === 11 && cleanedPhone.startsWith("1")) {
      cleanedPhone = "+" + cleanedPhone;
    } else if (!cleanedPhone.startsWith("+")) {
      cleanedPhone = "+" + cleanedPhone;
    }
    console.log("[Call] Initiating call to:", cleanedPhone, "Original:", lead.phone);

    try {
      // Get or initialize device
      let device = getDevice();
      console.log("[Call] Device state:", device ? "exists" : "null", "Ready:", isDeviceReady());

      if (!device || !isDeviceReady()) {
        console.log("[Call] Initializing device for user:", username);
        device = await initDevice(username);
      }

      if (!device) {
        console.error("[Call] Failed to initialize Twilio device");
        toast.error("Web calling unavailable. Using phone dialer.");
        window.location.href = `tel:${cleanedPhone.replace(/^\+/, "")}`;
        return;
      }

      // Check device state before connecting
      const deviceState = (device as any).state;
      console.log("[Call] Device state before connect:", deviceState);

      if (deviceState !== "registered") {
        console.error("[Call] Device not registered, state:", deviceState);
        toast.error("Connection not ready. Using phone dialer.");
        window.location.href = `tel:${cleanedPhone.replace(/^\+/, "")}`;
        return;
      }

      console.log("[Call] Connecting to Twilio with params:", { To: cleanedPhone });

      // Initiate call with timeout
      const callPromise = device.connect({
        params: {
          To: cleanedPhone,
        },
      });

      // Add a timeout - if call doesn't connect in 10 seconds, fallback
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Call connection timeout")), 10000);
      });

      const call = (await Promise.race([callPromise, timeoutPromise])) as Call;

      console.log("[Call] Twilio call object created:", call);

      // Add event listeners for debugging
      call.on("accept", () => console.log("[Call] Call accepted"));
      call.on("disconnect", (reason) => {
        console.log("[Call] Call disconnected:", reason);
        // If disconnected immediately, show toast
        if (reason && reason.error) {
          toast.error("Call failed: " + (reason.error.message || "Connection error"));
        }
      });
      call.on("cancel", () => console.log("[Call] Call cancelled"));
      call.on("error", (error) => {
        console.error("[Call] Call error:", error);
        toast.error("Call error: " + (error.message || "Unknown error"));
      });
      call.on("ringing", (hasEarlyMedia) => console.log("[Call] Ringing, early media:", hasEarlyMedia));

      // Set active call in store
      const { setActiveCall } = useCallStore.getState();
      setActiveCall(call, lead);
    } catch (error) {
      console.error("[Call] Twilio call failed:", error);
      toast.error("Web call failed. Using phone dialer.");
      window.location.href = `tel:${cleanedPhone.replace(/^\+/, "")}`;
    }
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
  const source = lead.source || 'google_places';
  const sourceInfo = sourceConfig[source as keyof typeof sourceConfig] || sourceConfig.manual;
  const SourceIcon = sourceInfo.icon;

  // Check if flagged for review
  const isFlagged = lead.review_status === 'flagged';
  const aiConfidence = lead.ai_recommended ? 'high' : (lead.source_priority_score && lead.source_priority_score > 30 ? 'medium' : 'low');

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
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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
                    {/* Source Badge */}
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                      sourceInfo.bgColor,
                      sourceInfo.borderColor,
                      sourceInfo.color
                    )}>
                      <SourceIcon className="h-3 w-3" />
                      {sourceInfo.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <VerifyButton lead={lead} onVerified={onUpdate} />
          </div>

          {/* Verification Score & AI Badges */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {lead.verified && (
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
            )}

            {/* AI Confidence Badge (for Meta Ads) */}
            {source === 'meta_ads' && lead.ai_recommended !== undefined && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                aiConfidence === 'high'
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : aiConfidence === 'medium'
                  ? "bg-amber-500/5 border-amber-500/20"
                  : "bg-red-500/5 border-red-500/20"
              )}>
                <Bot className={cn(
                  "h-3.5 w-3.5",
                  aiConfidence === 'high'
                    ? "text-emerald-400"
                    : aiConfidence === 'medium'
                    ? "text-amber-400"
                    : "text-red-400"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  aiConfidence === 'high'
                    ? "text-emerald-400"
                    : aiConfidence === 'medium'
                    ? "text-amber-400"
                    : "text-red-400"
                )}>
                  AI: {aiConfidence === 'high' ? 'Recommended' : aiConfidence === 'medium' ? 'Uncertain' : 'Flagged'}
                </span>
              </div>
            )}

            {/* Flagged Warning */}
            {isFlagged && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/20">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs font-medium text-red-400">Needs Review</span>
              </div>
            )}
          </div>
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

        {/* Warm Opener (for Meta Ads) */}
        {lead.discovery_context && (
          <div className="p-6 border-b border-white/[0.06] bg-blue-500/[0.02]">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="h-4 w-4 text-blue-400" />
              <p className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">Warm Opener</p>
              {lead.ad_start_date && (
                <span className="text-[10px] text-zinc-500">
                  Ad started {Math.floor((Date.now() - new Date(lead.ad_start_date).getTime()) / (1000 * 60 * 60 * 24))} days ago
                </span>
              )}
            </div>
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <p className="text-sm text-zinc-300 italic">&ldquo;{lead.discovery_context}&rdquo;</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(lead.discovery_context || '');
                  toast.success('Copied to clipboard');
                }}
                className="mt-3 h-8 px-3 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy Opener
              </Button>
            </div>
            {lead.ai_reason && (
              <p className="mt-2 text-[11px] text-zinc-500 flex items-center gap-1">
                <Bot className="h-3 w-3" />
                {lead.ai_reason}
              </p>
            )}
            {lead.source_url && (
              <a
                href={lead.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-3 w-3" />
                View Ad Snapshot
              </a>
            )}
          </div>
        )}

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
