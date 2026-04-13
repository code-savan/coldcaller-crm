"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lead } from "@/lib/pocketbase";
import { pb } from "@/lib/pocketbase";
import { Loader2, Search, Building, Award, CheckCircle } from "lucide-react";

interface VerifyButtonProps {
  lead: Lead;
  onVerified: (updated: Lead) => void;
}

const tierConfig: Record<string, { label: string; emoji: string; color: string }> = {
  gold: { label: "Gold Mine", emoji: "🔥", color: "bg-amber-500" },
  solid: { label: "Solid Lead", emoji: "✅", color: "bg-green-500" },
  lukewarm: { label: "Lukewarm", emoji: "🌤", color: "bg-yellow-500" },
  skip: { label: "Skip", emoji: "❌", color: "bg-gray-500" },
};

export function VerifyButton({ lead, onVerified }: VerifyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<string>("");

  if (lead.verified) {
    const tier = lead.verification_score >= 80 ? "gold" :
                 lead.verification_score >= 50 ? "solid" :
                 lead.verification_score >= 20 ? "lukewarm" : "skip";
    const config = tierConfig[tier];

    return (
      <div className="flex items-center gap-2">
        <Badge className={`${config.color} text-white`}>
          {config.emoji} {config.label} ({lead.verification_score})
        </Badge>
      </div>
    );
  }

  const handleVerify = async () => {
    setLoading(true);
    setStep("Searching Google Places...");

    try {
      // Step 1: Search
      setStep("🔍 Searching Google Places...");
      await new Promise(r => setTimeout(r, 300)); // Visual delay

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: lead.business_name,
          city: lead.city,
          lead_id: lead.id,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || `API Error: ${res.status}`);
      }

      // Step 2: Analyzing
      if (result.found) {
        setStep("📊 Analyzing business data...");
        await new Promise(r => setTimeout(r, 400));

        setStep("🏆 Calculating lead score...");
        await new Promise(r => setTimeout(r, 300));
      } else {
        const errorMsg = result.errorMessage || result.error || "No Google listing found";
        setStep(`❌ ${errorMsg}`);
        await new Promise(r => setTimeout(r, 1500));
      }

      // Step 3: Saving (even for not-found to prevent re-checks)
      setStep("💾 Saving verification...");
      const updated = await pb.collection("leads").update(lead.id, {
        verified: true,
        verification_score: result.found ? result.score : 0,
        verification_data: result.found ? result.data : { error: result.error, errorMessage: result.errorMessage, searched: `${lead.business_name} ${lead.city}` },
      }, { $autoCancel: false });

      setStep("✅ Complete!");
      await new Promise(r => setTimeout(r, 200));

      onVerified(updated as unknown as Lead);
    } catch (err: any) {
      console.error("Verification error:", err);
      setStep(`❌ Error: ${err.message || "Unknown error"}`);
      await new Promise(r => setTimeout(r, 2000));
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        <span className="text-sm text-gray-600">{step}</span>
      </div>
    );
  }

  return (
    <Button
      onClick={handleVerify}
      variant="outline"
      size="sm"
    >
      <Search className="h-4 w-4 mr-2" />
      Verify Lead
    </Button>
  );
}
