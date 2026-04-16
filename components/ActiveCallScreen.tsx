"use client";

import { useEffect, useState, useCallback } from "react";
import { useCallStore, formatCallDuration, getDurationForNotes, CallStatus } from "@/lib/callState";
import { Lead, pb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Grid3X3,
  CheckCircle2,
  Calendar,
  X,
  User,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDevice } from "@/lib/twilioDevice";
import { logCall } from "@/lib/sessions";

// Outcome definitions matching LeadCard
const outcomes = [
  { id: "answered", label: "Answered", icon: CheckCircle2, color: "bg-emerald-500", borderColor: "border-emerald-500/30", textColor: "text-emerald-400" },
  { id: "voicemail", label: "Voicemail", icon: Phone, color: "bg-amber-500", borderColor: "border-amber-500/30", textColor: "text-amber-400" },
  { id: "no_answer", label: "No Answer", icon: PhoneOff, color: "bg-red-500", borderColor: "border-red-500/30", textColor: "text-red-400" },
  { id: "not_interested", label: "Not Interested", icon: Phone, color: "bg-zinc-500", borderColor: "border-zinc-500/30", textColor: "text-zinc-400" },
  { id: "callback", label: "Callback", icon: Calendar, color: "bg-blue-500", borderColor: "border-blue-500/30", textColor: "text-blue-400" },
  { id: "gatekeeper", label: "Gatekeeper", icon: User, color: "bg-violet-500", borderColor: "border-violet-500/30", textColor: "text-violet-400" },
];

// Keypad digits
const keypadDigits = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

interface ActiveCallScreenProps {
  onLeadUpdate?: (lead: Lead) => void;
  currentSession?: any; // Session data for logging
}

export function ActiveCallScreen({ onLeadUpdate, currentSession }: ActiveCallScreenProps) {
  const {
    activeCall,
    callStatus,
    activeLead,
    callDuration,
    incomingCall,
    setCallStatus,
    setCallDuration,
    acceptIncomingCall,
    rejectIncomingCall,
    endCall,
    clearCall,
    goToPostCall,
    callStartTime,
  } = useCallStore();

  const [muted, setMuted] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [callbackDate, setCallbackDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Duration timer effect
  useEffect(() => {
    if (callStatus === "connected" && callStartTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - callStartTime.getTime()) / 1000);
        setCallDuration(diff);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callStatus, callStartTime, setCallDuration]);

  // Handle call disconnect and transition to post-call
  useEffect(() => {
    if (!activeCall) return;

    const handleDisconnect = () => {
      // Transition to post-call state after 2 seconds
      setTimeout(() => {
        goToPostCall();
      }, 2000);
    };

    const handleAccept = () => {
      setCallStatus("connected");
    };

    const handleCancel = () => {
      // Call was rejected or not answered
      setTimeout(() => {
        goToPostCall();
      }, 500);
    };

    activeCall.on("disconnect", (call: any) => {
      console.log("Call disconnected:", {
        direction: call.direction,
        status: call.status,
        from: call.parameters?.From,
        to: call.parameters?.To,
        sid: call.parameters?.CallSid,
      });
      handleDisconnect();
    });
    activeCall.on("accept", (call: any) => {
      console.log("Call accepted:", {
        direction: call.direction,
        status: call.status,
        to: call.parameters?.To,
      });
      handleAccept();
    });
    activeCall.on("cancel", handleCancel);
    activeCall.on("reject", handleCancel);
    activeCall.on("error", (error: any) => {
      console.error("Call error:", {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      toast.error(`Call error: ${error.message || 'Unknown error'}`);
      clearCall();
    });
    activeCall.on("ringing", (hasEarlyMedia: boolean) => {
      console.log("Call ringing, early media:", hasEarlyMedia);
    });
    activeCall.on("muted", (isMuted: boolean) => {
      console.log("Call muted:", isMuted);
    });

    return () => {
      activeCall.off("disconnect", handleDisconnect);
      activeCall.off("accept", handleAccept);
      activeCall.off("cancel", handleCancel);
      activeCall.off("reject", handleCancel);
    };
  }, [activeCall, setCallStatus, goToPostCall, clearCall]);

  // Handle mute toggle
  const handleMute = useCallback(() => {
    if (activeCall) {
      const newMuteState = !muted;
      activeCall.mute(newMuteState);
      setMuted(newMuteState);
    }
  }, [activeCall, muted]);

  // Handle keypad digit
  const handleDigit = useCallback((digit: string) => {
    if (activeCall) {
      activeCall.sendDigits(digit);
    }
  }, [activeCall]);

  // Handle outcome save
  const handleSaveOutcome = async () => {
    if (!activeLead || !selectedOutcome) return;

    setSaving(true);
    try {
      const updateData: any = {
        status: selectedOutcome,
        call_count: (activeLead.call_count || 0) + 1,
        last_called: new Date().toISOString(),
      };

      // Add notes with duration
      const durationStr = getDurationForNotes(callDuration);
      const notesWithDuration = `[${durationStr} call] — ${notes}`.trim();
      updateData.notes = notesWithDuration;

      if (selectedOutcome === "callback" && callbackDate) {
        updateData.callback_datetime = callbackDate;
      }

      const updated = await pb.collection("leads").update(activeLead.id, updateData);
      const updatedLead = updated as unknown as Lead;

      // Log to session if available
      if (currentSession) {
        const callLog = {
          leadId: activeLead.id,
          businessName: activeLead.business_name,
          phone: activeLead.phone,
          status: selectedOutcome,
          timestamp: new Date().toISOString(),
          notes: notesWithDuration,
          duration: callDuration,
        };
        logCall(currentSession.id, callLog);
      }

      // Notify parent
      if (onLeadUpdate) {
        onLeadUpdate(updatedLead);
      }

      toast.success("Outcome saved");
      clearCall();
    } catch (err) {
      console.error("Failed to save outcome:", err);
      toast.error("Failed to save outcome");
    } finally {
      setSaving(false);
    }
  };

  // Handle end call
  const handleEndCall = () => {
    endCall();
  };

  // If no active call and not in post-call, don't render
  if (callStatus === "idle") {
    return null;
  }

  // Get call status label
  const getStatusLabel = () => {
    switch (callStatus) {
      case "calling":
        return "Calling...";
      case "connected":
        return "Connected";
      case "disconnecting":
        return "Ending...";
      case "post_call":
        return "Call Ended";
      case "incoming":
        return "Incoming Call";
      default:
        return "";
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl flex flex-col",
        "animate-in fade-in duration-200"
      )}
    >
      {/* Incoming Call State */}
      {callStatus === "incoming" && incomingCall && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-center mb-12">
            <p className="text-sm text-zinc-400 mb-2">Incoming Call</p>
            <h2 className="text-3xl font-bold text-white mb-2">
              {incomingCall.parameters?.From || "Unknown Caller"}
            </h2>
            <p className="text-zinc-500">{incomingCall.parameters?.To || ""}</p>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={rejectIncomingCall}
              className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center hover:bg-red-500/30 transition-all"
            >
              <PhoneOff className="h-8 w-8 text-red-400" />
            </button>
            <button
              onClick={acceptIncomingCall}
              className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/30 transition-all"
            >
              <Phone className="h-8 w-8 text-emerald-400" />
            </button>
          </div>
        </div>
      )}

      {/* Active Call State */}
      {(callStatus === "calling" || callStatus === "connected" || callStatus === "disconnecting") && activeLead && (
        <>
          {/* Header */}
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="text-center">
              {/* Business Name */}
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {activeLead.business_name}
              </h2>

              {/* Contact Name */}
              {activeLead.contact_name && (
                <p className="text-lg text-zinc-400 mb-1">{activeLead.contact_name}</p>
              )}

              {/* Phone Number */}
              <p className="text-zinc-500 font-mono">{activeLead.phone}</p>

              {/* Status & Timer */}
              <div className="mt-8 space-y-2">
                <p className={cn(
                  "text-sm uppercase tracking-wider",
                  callStatus === "connected" ? "text-emerald-400" : "text-amber-400"
                )}>
                  {getStatusLabel()}
                </p>
                {(callStatus === "connected" || callDuration > 0) && (
                  <p className="text-4xl sm:text-5xl font-bold text-white font-mono tracking-wider">
                    {formatCallDuration(callDuration)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Call Controls */}
          <div className="p-6 pb-12 space-y-4">
            {/* Keypad Overlay */}
            {showKeypad && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 mb-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-3 gap-2">
                  {keypadDigits.map((row, rowIdx) => (
                    <div key={rowIdx} className="contents">
                      {row.map((digit) => (
                        <button
                          key={digit}
                          onClick={() => handleDigit(digit)}
                          className="h-14 rounded-xl bg-zinc-800/50 text-white text-xl font-medium hover:bg-zinc-700/50 transition-colors"
                        >
                          {digit}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowKeypad(false)}
                  className="w-full mt-4 py-3 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Close Keypad
                </button>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleMute}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                  muted
                    ? "bg-amber-500/20 border-2 border-amber-500/30"
                    : "bg-white/[0.05] border-2 border-white/[0.1] hover:bg-white/[0.1]"
                )}
              >
                {muted ? (
                  <MicOff className="h-6 w-6 text-amber-400" />
                ) : (
                  <Mic className="h-6 w-6 text-zinc-300" />
                )}
              </button>

              <button
                onClick={() => setShowKeypad(!showKeypad)}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                  showKeypad
                    ? "bg-indigo-500/20 border-2 border-indigo-500/30"
                    : "bg-white/[0.05] border-2 border-white/[0.1] hover:bg-white/[0.1]"
                )}
              >
                <Grid3X3 className="h-6 w-6 text-zinc-300" />
              </button>

              <button
                onClick={handleEndCall}
                disabled={callStatus === "disconnecting"}
                className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center hover:bg-red-500/30 transition-all disabled:opacity-50"
              >
                <PhoneOff className="h-8 w-8 text-red-400" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Post-Call State */}
      {callStatus === "post_call" && activeLead && (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="max-w-md mx-auto w-full space-y-6">
            {/* Header */}
            <div className="text-center">
              <p className="text-sm text-zinc-400 mb-2">Call Completed</p>
              <h2 className="text-xl font-bold text-white">{activeLead.business_name}</h2>
              <p className="text-zinc-500">Duration: {formatCallDuration(callDuration)}</p>
            </div>

            {/* Outcome Selection */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">
                Select Outcome
              </p>
              <div className="grid grid-cols-3 gap-2">
                {outcomes.map((outcome) => {
                  const Icon = outcome.icon;
                  const isSelected = selectedOutcome === outcome.id;

                  return (
                    <button
                      key={outcome.id}
                      onClick={() => setSelectedOutcome(outcome.id)}
                      className={cn(
                        "h-auto py-3 px-2 flex flex-col items-center gap-2 rounded-xl border transition-all duration-200",
                        isSelected
                          ? `${outcome.color} ${outcome.borderColor} ${outcome.textColor} border shadow-lg shadow-black/20`
                          : "bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:bg-white/[0.04] hover:border-white/[0.1] hover:text-zinc-300"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", isSelected ? "text-white" : "")} />
                      <span className={cn(
                        "text-[10px] font-semibold uppercase tracking-wide text-center",
                        isSelected ? "text-white" : ""
                      )}>
                        {outcome.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Callback Scheduler */}
            {selectedOutcome === "callback" && (
              <div className="p-4 rounded-xl bg-blue-500/[0.03] border border-blue-500/20 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-blue-400" />
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

            {/* Notes */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">
                Notes
              </p>
              <textarea
                placeholder="What was discussed?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[100px] px-4 py-4 bg-zinc-900/30 border border-white/[0.06] rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={clearCall}
                className="flex-1 h-12 bg-transparent border-white/[0.1] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveOutcome}
                disabled={!selectedOutcome || saving}
                className="flex-1 h-12 bg-white text-black hover:bg-zinc-200 font-medium disabled:opacity-40"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
