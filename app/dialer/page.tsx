"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { initDevice, getDevice, isDeviceReady, destroyDevice } from "@/lib/twilioDevice";
import { useCallStore } from "@/lib/callState";
import { ActiveCallScreen } from "@/components/ActiveCallScreen";
import { toast } from "sonner";
import {
  Phone,
  PhoneOff,
  Delete,
  ArrowLeft,
  Grid3X3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const keypadDigits = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

export default function DialerPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [username, setUsername] = useState<string>("");

  const { callStatus, activeCall } = useCallStore();

  // Auth check
  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUsername(stored);

    // Initialize Twilio device
    initDevice(stored).catch(console.error);

    return () => {
      destroyDevice().catch(console.error);
    };
  }, [router]);

  const handleDigit = useCallback((digit: string) => {
    setPhoneNumber((prev) => {
      if (prev.length >= 15) return prev;
      return prev + digit;
    });
  }, []);

  const handleDelete = useCallback(() => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPhoneNumber("");
  }, []);

  const formatPhoneNumber = (number: string) => {
    const cleaned = number.replace(/\D/g, "");
    if (cleaned.length === 0) return "";
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    if (cleaned.length <= 10) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handleCall = async () => {
    const cleanedNumber = phoneNumber.replace(/\D/g, "");
    if (cleanedNumber.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsCalling(true);

    try {
      // Get or initialize device
      let device = getDevice();
      if (!device || !isDeviceReady()) {
        device = await initDevice(username);
      }

      if (!device) {
        toast.error("Failed to initialize calling device");
        return;
      }

      // Create a mock lead for the call screen
      const mockLead = {
        id: "manual-dial",
        business_name: "Manual Dial",
        phone: cleanedNumber,
        contact_name: "",
        city: "",
        state: "",
      };

      // Initiate call
      const call = await device.connect({
        params: {
          To: cleanedNumber,
        },
      });

      // Set active call in store
      const { setActiveCall } = useCallStore.getState();
      setActiveCall(call, mockLead as any);

      toast.success("Calling...");
    } catch (error) {
      console.error("Call failed:", error);
      toast.error("Failed to place call");
    } finally {
      setIsCalling(false);
    }
  };

  const isActiveCall = callStatus !== "idle";

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Active Call Overlay */}
      <ActiveCallScreen currentSession={null} />

      {/* Header */}
      <header className="h-14 px-4 flex items-center gap-4 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/operations")}
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-sm font-semibold text-white">Manual Dialer</h1>
      </header>

      {/* Main Dialer Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Phone Number Display */}
        <div className="w-full max-w-sm mb-8">
          <div className="relative">
            <input
              type="tel"
              value={formatPhoneNumber(phoneNumber)}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter number..."
              className="w-full bg-transparent text-4xl text-white text-center font-light tracking-wider placeholder:text-zinc-700 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && phoneNumber.length >= 10) {
                  handleCall();
                }
                if (e.key === "Backspace") {
                  handleDelete();
                }
              }}
              disabled={isActiveCall}
            />
            {phoneNumber.length > 0 && !isActiveCall && (
              <button
                onClick={handleClear}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Delete className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Keypad */}
        <div className="w-full max-w-sm">
          <div className="grid grid-cols-3 gap-3 mb-6">
            {keypadDigits.map((row, rowIdx) => (
              <div key={rowIdx} className="contents">
                {row.map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handleDigit(digit)}
                    disabled={isActiveCall}
                    className={cn(
                      "h-16 rounded-2xl text-2xl font-light transition-all duration-150",
                      isActiveCall
                        ? "bg-zinc-800/30 text-zinc-600 cursor-not-allowed"
                        : "bg-white/[0.05] text-white hover:bg-white/[0.1] active:scale-95"
                    )}
                  >
                    {digit}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom Row - Call Button */}
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={isActiveCall || phoneNumber.length === 0}
              className={cn(
                "flex-1 h-16 rounded-2xl flex items-center justify-center transition-all duration-150",
                isActiveCall || phoneNumber.length === 0
                  ? "bg-zinc-800/30 text-zinc-600 cursor-not-allowed"
                  : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1] hover:text-white active:scale-95"
              )}
            >
              <Delete className="h-6 w-6" />
            </button>

            <button
              onClick={handleCall}
              disabled={isCalling || isActiveCall || phoneNumber.length < 10}
              className={cn(
                "flex-[2] h-16 rounded-2xl flex items-center justify-center gap-2 transition-all duration-150",
                isCalling || isActiveCall || phoneNumber.length < 10
                  ? "bg-emerald-500/30 text-emerald-400/50 cursor-not-allowed"
                  : "bg-emerald-500 hover:bg-emerald-400 text-white active:scale-95 shadow-lg shadow-emerald-500/20"
              )}
            >
              {isCalling ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
              <span className="text-lg font-medium">
                {isCalling ? "Calling..." : "Call"}
              </span>
            </button>
          </div>
        </div>

        {/* Instructions */}
        <p className="mt-8 text-sm text-zinc-500 text-center max-w-xs">
          Enter a 10-digit US phone number and press Call to dial directly.
        </p>
      </div>
    </div>
  );
}
