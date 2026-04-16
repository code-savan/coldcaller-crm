import { create } from "zustand";
import { Lead } from "@/lib/pocketbase";

export type CallStatus = "idle" | "calling" | "connected" | "incoming" | "post_call" | "disconnecting";

interface CallState {
  // State
  activeCall: any | null; // Twilio Call object
  callStatus: CallStatus;
  activeLead: Lead | null;
  callStartTime: Date | null;
  callDuration: number; // seconds
  incomingCall: any | null; // For incoming call storage
  
  // Actions
  setActiveCall: (call: any, lead: Lead) => void;
  setIncomingCall: (call: any) => void;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  setCallStatus: (status: CallStatus) => void;
  setCallDuration: (duration: number) => void;
  incrementCallDuration: () => void;
  endCall: () => void;
  clearCall: () => void;
  goToPostCall: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  // Initial state
  activeCall: null,
  callStatus: "idle",
  activeLead: null,
  callStartTime: null,
  callDuration: 0,
  incomingCall: null,

  // Actions
  setActiveCall: (call, lead) => {
    set({
      activeCall: call,
      activeLead: lead,
      callStatus: "calling",
      callStartTime: null,
      callDuration: 0,
      incomingCall: null,
    });
  },

  setIncomingCall: (call) => {
    set({
      incomingCall: call,
      callStatus: "incoming",
      activeLead: null,
      callStartTime: null,
      callDuration: 0,
    });
  },

  acceptIncomingCall: () => {
    const { incomingCall } = get();
    if (incomingCall) {
      incomingCall.accept();
      set({
        activeCall: incomingCall,
        incomingCall: null,
        callStatus: "connected",
        callStartTime: new Date(),
      });
    }
  },

  rejectIncomingCall: () => {
    const { incomingCall } = get();
    if (incomingCall) {
      incomingCall.reject();
      set({
        incomingCall: null,
        callStatus: "idle",
      });
    }
  },

  setCallStatus: (status) => set({ callStatus: status }),

  setCallDuration: (duration) => set({ callDuration: duration }),

  incrementCallDuration: () => {
    set((state) => ({ callDuration: state.callDuration + 1 }));
  },

  endCall: () => {
    const { activeCall } = get();
    if (activeCall) {
      activeCall.disconnect();
    }
    set({ callStatus: "disconnecting" });
  },

  goToPostCall: () => {
    set({ callStatus: "post_call" });
  },

  clearCall: () => {
    set({
      activeCall: null,
      callStatus: "idle",
      activeLead: null,
      callStartTime: null,
      callDuration: 0,
      incomingCall: null,
    });
  },
}));

// Call duration timer hook
export function useCallDuration() {
  const { callStatus, incrementCallDuration, callStartTime, setCallDuration } = useCallStore();

  // Start timer when call is connected
  if (callStatus === "connected" && callStartTime) {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - callStartTime.getTime()) / 1000);
      setCallDuration(diff);
    }, 1000);

    return () => clearInterval(interval);
  }

  return undefined;
}

// Format duration as mm:ss
export function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Get duration string for notes
export function getDurationForNotes(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}
