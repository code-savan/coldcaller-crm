"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import countriesData from "@/lib/countries.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Phone,
  Star,
  Globe,
  Loader2,
  Check,
  X,
  Download,
  Sparkles,
  Filter,
  Database,
  Compass,
  Target,
  Flame,
  ChevronDown,
  ArrowRight,
  Zap,
  CheckCircle2,
  Trash2,
  Megaphone,
  Building2,
  AlertTriangle,
  Clock,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

const NICHES = [
  "Roofing",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Landscaping",
  "Pest Control",
  "Pressure Washing",
  "Pool Service",
  "Auto Detailing",
  "Tree Service",
  "Cleaning Services",
  "Garage Door",
];

const DISCOVERY_SOURCES = [
  {
    id: 'google_places',
    label: 'Google Places',
    icon: MapPin,
    description: 'Search Google Maps for local businesses',
    color: 'violet'
  },
  {
    id: 'meta_ads',
    label: 'Meta Ads Library',
    icon: Megaphone,
    description: 'Find businesses running Facebook/Instagram ads',
    color: 'blue'
  },
] as const;

const AD_RECENCY_OPTIONS = [
  { value: 7, label: 'Last 7 days - Fresh leads' },
  { value: 14, label: 'Last 14 days - Recent ads' },
  { value: 30, label: 'Last 30 days - Active advertisers' },
  { value: 60, label: 'Last 60 days - Still running' },
  { value: 90, label: 'Last 90 days - Extended reach' },
  { value: 180, label: 'Last 6 months - All advertisers' },
];

interface DiscoveredLead {
  business_name: string;
  phone: string;
  city: string;
  state: string;
  address: string;
  website: string;
  rating: number;
  review_count: number;
  place_id: string;
  niche: string;
  verification_score: number;
  verification_tier: string;
  verification_tier_label: string;
  verified: boolean;
  selected?: boolean;
  duplicate?: boolean;
  // Contact info
  contact_name?: string;
  notes?: string;
  verification_data?: any;
  // Source tracking
  source?: 'google_places' | 'meta_ads' | 'facebook_group' | 'linkedin' | 'manual';
  source_url?: string;
  source_id?: string;
  // Meta Ads specific
  discovery_context?: string;
  ad_start_date?: string;
  ad_spend_indicator?: 'low' | 'medium' | 'high';
  // AI scoring
  ai_recommended?: boolean;
  ai_reason?: string;
  ai_flags?: string[];
  review_status?: 'approved' | 'flagged' | 'rejected';
}

export default function DiscoverPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Discovery form state
  const [source, setSource] = useState<'google_places' | 'meta_ads'>('google_places');
  const [niche, setNiche] = useState("Roofing");
  const [city, setCity] = useState("");
  const [state, setState] = useState("TX");
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [targetCount, setTargetCount] = useState(50);
  const [adRecencyDays, setAdRecencyDays] = useState(14);

  // Results state
  const [leads, setLeads] = useState<DiscoveredLead[]>([]);
  const [existingPhones, setExistingPhones] = useState<Set<string>>(new Set());
  const [existingPlaceIds, setExistingPlaceIds] = useState<Set<string>>(new Set());
  const [apiCalls, setApiCalls] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState("0.00");
  const [duplicatesFiltered, setDuplicatesFiltered] = useState(0);
  const [highValueCount, setHighValueCount] = useState(0);

  // Progress state
  const [progressMessage, setProgressMessage] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);

  // Selection state
  const [selectedCount, setSelectedCount] = useState(0);

  // Selected leads set
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());

  // Abort controller for cancellation
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUsername(stored);
    loadExistingPhones(stored);
  }, [router]);

  const loadExistingPhones = async (user: string) => {
    try {
      const existing = await pb.collection("leads").getFullList({
        filter: `username = "${user}"`,
        fields: "phone,verification_data",
      });
      const phones = new Set(existing.map((l: any) => l.phone));
      const placeIds = new Set(
        existing
          .map((l: any) => l.verification_data?.place_id)
          .filter(Boolean)
      );
      setExistingPhones(phones);
      setExistingPlaceIds(placeIds);
    } catch (err) {
      console.error("Failed to load existing phones:", err);
    }
  };

  // Progress steps with estimated time for each
  const progressSteps = source === 'meta_ads' ? [
    { icon: Search, text: "Launching browser & loading Meta Ads Library...", duration: 5 },
    { icon: Database, text: "Searching for active advertisers...", duration: 10 },
    { icon: Filter, text: "Filtering by ad recency & business type...", duration: 8 },
    { icon: Phone, text: "Extracting phone numbers from pages...", duration: 15 },
    { icon: Sparkles, text: "AI scoring & generating warm openers...", duration: 5 },
    { icon: Check, text: "Finalizing lead list...", duration: 2 },
  ] : [
    { icon: Search, text: "Searching Google Maps...", duration: 3 },
    { icon: Database, text: "Scanning business directories...", duration: 5 },
    { icon: Phone, text: "Extracting contact information...", duration: 8 },
    { icon: Sparkles, text: "Prioritizing high-value leads...", duration: 4 },
    { icon: Check, text: "Finalizing results...", duration: 2 },
  ];

  const totalDuration = progressSteps.reduce((acc, step) => acc + step.duration, 0);

  const handleDiscover = async () => {
    if (source === 'google_places' && !state) {
      toast.error("Please select a state");
      return;
    }
    if (!niche) {
      toast.error("Please enter a niche");
      return;
    }

    setLoading(true);
    setLeads([]);
    setSelectedLeads(new Set());
    setProgressPercent(0);

    // Create new abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);

    // Start progress animation
    let currentStep = 0;
    let accumulatedTime = 0;
    let progressInterval: ReturnType<typeof setInterval> | null = null;

    progressInterval = setInterval(() => {
      accumulatedTime += 0.5;
      const currentStepInfo = progressSteps[currentStep];
      if (!currentStepInfo) {
        if (progressInterval) clearInterval(progressInterval);
        return;
      }
      const stepProgress = Math.min(accumulatedTime / currentStepInfo.duration, 1);

      // Calculate overall progress
      const completedStepsProgress = currentStep * (100 / progressSteps.length);
      const currentStepContribution = stepProgress * (100 / progressSteps.length);
      const totalProgress = Math.min(completedStepsProgress + currentStepContribution, 99);

      setProgressPercent(totalProgress);
      setProgressMessage(currentStepInfo.text);

      // Move to next step when current is done
      if (stepProgress >= 1) {
        accumulatedTime = 0;
        currentStep++;
        if (currentStep >= progressSteps.length) {
          if (progressInterval) clearInterval(progressInterval);
        }
      }
    }, 500);

    try {
      const endpoint = source === 'meta_ads' ? '/api/discover/meta' : '/api/discover';
      const body = source === 'meta_ads' ? {
        username,
        niche,
        target_count: targetCount,
        ad_recency_days: adRecencyDays,
      } : {
        username,
        niche,
        city,
        state,
        target_count: targetCount,
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Discovery failed");
      }

      setLeads(data.leads || []);
      setApiCalls(data.api_calls || 0);
      setProgressPercent(100);
      setProgressMessage(`Found ${data.leads?.length || 0} leads with phone numbers`);
      toast.success(`Discovery complete! Found ${data.leads?.length || 0} leads`);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.info("Discovery cancelled");
      } else {
        console.error("Discovery error:", err);
        toast.error("Discovery failed: " + err.message);
      }
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleCancelDiscovery = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setLoading(false);
    setProgressMessage("");
    setProgressPercent(0);
  };

  // Estimated time remaining
  const getEstimatedTime = () => {
    const remaining = Math.max(totalDuration - (progressPercent / 100) * totalDuration, 0);
    if (remaining < 60) return `${Math.ceil(remaining)}s`;
    return `${Math.ceil(remaining / 60)}m ${Math.ceil(remaining % 60)}s`;
  };

  const toggleLeadSelection = (index: number) => {
    setLeads((prev) => {
      const updated = [...prev];
      updated[index].selected = !updated[index].selected;
      setSelectedCount(updated.filter((l) => l.selected).length);
      return updated;
    });
  };

  const selectAll = () => {
    setLeads((prev) => {
      const updated = prev.map((l) => ({ ...l, selected: !l.duplicate }));
      setSelectedCount(updated.filter((l) => l.selected).length);
      return updated;
    });
  };

  const deselectAll = () => {
    setLeads((prev) => {
      const updated = prev.map((l) => ({ ...l, selected: false }));
      setSelectedCount(0);
      return updated;
    });
  };

  // Get US cities from countries.json
  const usCities = useMemo(() => {
    return (countriesData as Record<string, string[]>)["United States"] || [];
  }, []);

  // Filter cities based on input
  useEffect(() => {
    if (city.length >= 2) {
      const filtered = usCities
        .filter(c => c.toLowerCase().includes(city.toLowerCase()))
        .slice(0, 8);
      setCitySuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [city, usCities]);

  const selectCity = (selectedCity: string) => {
    setCity(selectedCity);
    setShowSuggestions(false);
  };

  const handleImport = async () => {
    const selectedLeads = leads.filter((l) => l.selected);
    if (selectedLeads.length === 0) {
      toast.error("No leads selected");
      return;
    }

    setImporting(true);
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches of 5
    const CONCURRENCY = 5;
    for (let i = 0; i < selectedLeads.length; i += CONCURRENCY) {
      const batch = selectedLeads.slice(i, i + CONCURRENCY);

      await Promise.all(
        batch.map(async (lead) => {
          try {
            const leadData: any = {
              username,
              business_name: lead.business_name,
              contact_name: lead.contact_name || "",
              phone: lead.phone || "",
              city: lead.city,
              state: lead.state,
              niche: lead.niche,
              website: lead.website || "",
              notes: lead.notes || `Address: ${lead.address || ''}`,
              status: "not_called",
              call_count: 0,
              verified: lead.verified || false,
              verification_score: lead.verification_score || 0,
              verification_data: lead.verification_data || {
                place_id: lead.place_id,
                rating: lead.rating,
                review_count: lead.review_count,
              },
              // Meta Ads fields
              source: lead.source || 'google_places',
              source_url: lead.source_url,
              source_id: lead.source_id,
              discovery_context: lead.discovery_context,
              ad_start_date: lead.ad_start_date,
              ad_spend_indicator: lead.ad_spend_indicator,
              ai_recommended: lead.ai_recommended,
              ai_reason: lead.ai_reason,
              ai_flags: lead.ai_flags,
              review_status: lead.review_status || 'approved',
            };

            await pb.collection("leads").create(leadData, { $autoCancel: false });
            imported++;
          } catch (err: any) {
            console.error("Failed to import:", lead.business_name, err);
            if (err?.status === 400 && err?.message?.includes("already exists")) {
              skipped++;
            } else {
              errors++;
            }
          }
        })
      );
    }

    setImporting(false);

    if (imported > 0) {
      toast.success(`Import complete! Imported: ${imported}, Skipped duplicates: ${skipped}`);
      setLeads([]);
      setSelectedLeads(new Set());
      setSelectedCount(0);
      router.push("/dashboard");
    } else if (skipped > 0) {
      toast.info(`All ${skipped} leads were already in your collection`);
    } else {
      toast.error("No leads were imported");
    }
  };

  const handleDiscard = () => {
    if (!confirm("Discard all discovered leads? They will not be saved to your collection.")) return;
    setLeads([]);
    setSelectedLeads(new Set());
    setSelectedCount(0);
    setProgressMessage("");
    toast.info("Leads discarded");
  };

  const getTierBadge = (lead: DiscoveredLead) => {
    const score = lead.verification_score;
    if (score >= 80) return { label: "🔥 GOLD", class: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
    if (score >= 50) return { label: "SOLID", class: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    if (score >= 20) return { label: "WARM", class: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
    if (score > 0) return { label: "LOW", class: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" };
    return { label: "SKIP", class: "bg-red-500/20 text-red-400 border-red-500/30" };
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header Bar */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-6">
          {/* Logo/Title Area */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Compass className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight">Discovery</h1>
              <p className="text-[11px] text-zinc-500">Find new leads</p>
            </div>
          </div>

          <Separator orientation="vertical" className="h-6 bg-white/[0.06]" />

          {/* Status Badge */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300",
            loading
              ? "bg-violet-500/[0.08] border-violet-500/20 text-violet-400"
              : leads.length > 0
              ? "bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400"
              : "bg-zinc-800/50 border-white/[0.06] text-zinc-400"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              loading ? "bg-violet-500 animate-pulse" : leads.length > 0 ? "bg-emerald-500" : "bg-zinc-500"
            )} />
            <span className="text-xs font-medium">
              {loading ? "Searching" : leads.length > 0 ? `${leads.length} Found` : "Ready"}
            </span>
          </div>
        </div>

        {/* Right Side Stats */}
        {leads.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-zinc-400">
                  <span className="text-zinc-200 font-medium">{selectedCount}</span> selected
                </span>
              </div>
              {highValueCount > 0 && (
                <>
                  <Separator orientation="vertical" className="h-4 bg-white/[0.06]" />
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs text-amber-400 font-medium">{highValueCount} Hot</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d]">
        <div className="max-w-6xl mx-auto p-8">
          {/* Search Form Card */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm mb-8">
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Search className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white tracking-tight">Search Parameters</h2>
                  <p className="text-[11px] text-zinc-500">Configure your lead discovery criteria</p>
                </div>
              </div>
            </div>

            {/* Source Selection */}
            <div className="p-6 border-b border-white/[0.06]">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-4 block">Lead Source</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DISCOVERY_SOURCES.map((src) => {
                  const Icon = src.icon;
                  const isActive = source === src.id;
                  return (
                    <button
                      key={src.id}
                      onClick={() => setSource(src.id as 'google_places' | 'meta_ads')}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 text-left",
                        isActive
                          ? src.id === 'meta_ads'
                            ? "bg-blue-500/10 border-blue-500/30"
                            : "bg-violet-500/10 border-violet-500/30"
                          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        isActive
                          ? src.id === 'meta_ads'
                            ? "bg-blue-500/20"
                            : "bg-violet-500/20"
                          : "bg-zinc-800/50"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          isActive
                            ? src.id === 'meta_ads'
                              ? "text-blue-400"
                              : "text-violet-400"
                            : "text-zinc-500"
                        )} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-medium",
                            isActive ? "text-white" : "text-zinc-300"
                          )}>
                            {src.label}
                          </span>
                          {src.id === 'meta_ads' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-medium">
                              HOT
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{src.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Fields */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Niche Select */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Niche</label>
                  <div className="relative">
                    <select
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      className="w-full appearance-none px-4 py-2.5 bg-zinc-900/50 border border-white/[0.08] rounded-xl text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/30 transition-all cursor-pointer"
                    >
                      {NICHES.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                  </div>
                </div>

                {/* City Input - Only for Google Places */}
                {source === 'google_places' && (
                  <div className="space-y-2 relative">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">City (Optional)</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Leave empty for state-wide..."
                        className="pl-10 bg-zinc-900/50 border-white/[0.08] text-zinc-200 placeholder:text-zinc-600 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/30 transition-all"
                        onFocus={() => city.length >= 2 && citySuggestions.length > 0 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      />
                    </div>
                    {/* Suggestions */}
                    {showSuggestions && (
                      <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-white/[0.08] rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                        {citySuggestions.map((suggestion, idx) => (
                          <button
                            key={`${suggestion}-${idx}`}
                            onClick={() => selectCity(suggestion)}
                            className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-white/[0.04] transition-colors first:rounded-t-xl last:rounded-b-xl"
                          >
                            <span className="font-medium">{suggestion}</span>
                            <span className="text-zinc-500 ml-2">{state}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* State Select - Only for Google Places */}
                {source === 'google_places' && (
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">State</label>
                    <div className="relative">
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full appearance-none px-4 py-2.5 bg-zinc-900/50 border border-white/[0.08] rounded-xl text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/30 transition-all cursor-pointer"
                      >
                        <option value="">Select state...</option>
                        {US_STATES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Meta Ads: US Location Badge */}
                {source === 'meta_ads' && (
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Location</label>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <Globe className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-blue-400 font-medium">United States</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">Meta Ads Library searches across all US regions</p>
                  </div>
                )}

                {/* Target Count */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Target: <span className="text-zinc-300">{targetCount}</span> leads
                  </label>
                  <div className="pt-2">
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="10"
                      value={targetCount}
                      onChange={(e) => setTargetCount(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-600">
                    <span>10</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Meta Ads: Ad Recency */}
                {source === 'meta_ads' && (
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                      <Clock className="inline h-3 w-3 mr-1" />
                      Ad Recency
                    </label>
                    <div className="relative">
                      <select
                        value={adRecencyDays}
                        onChange={(e) => setAdRecencyDays(parseInt(e.target.value))}
                        className="w-full appearance-none px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all cursor-pointer"
                      >
                        {AD_RECENCY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="mt-6 flex items-center justify-between pt-6 border-t border-white/[0.06]">
                <div className="flex items-center gap-4">
                  {source === 'google_places' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <Zap className="h-3.5 w-3.5 text-violet-400" />
                      <span className="text-xs text-zinc-400">
                        Est. cost: <span className="text-zinc-200 font-medium">${(targetCount * 0.034).toFixed(2)}</span>
                      </span>
                    </div>
                  )}
                  {source === 'meta_ads' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Shield className="h-3.5 w-3.5 text-blue-400" />
                      <span className="text-xs text-blue-400">
                        Free via Meta Ads Library API
                      </span>
                    </div>
                  )}
                  {apiCalls > 0 && (
                    <span className="text-xs text-zinc-500">
                      {apiCalls} API calls used
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleDiscover}
                    disabled={loading || (source === 'google_places' && !state) || !niche}
                    className="h-10 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Discovering...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        {source === 'meta_ads' ? 'Find Advertisers' : 'Start Discovery'}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Progress Indicator */}
              {loading && progressMessage && (
                <div className="mt-6 p-4 rounded-xl bg-violet-500/[0.03] border border-violet-500/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-200">{progressMessage}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-zinc-500">
                          Step {Math.floor((progressPercent / 100) * progressSteps.length) + 1} of {progressSteps.length}
                        </p>
                        <span className="text-zinc-600">|</span>
                        <p className="text-[11px] text-violet-400">
                          ~{getEstimatedTime()} remaining
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-violet-400">{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-3 text-[11px] text-zinc-500">
                    Finding leads with phone numbers. ETA: ~{Math.ceil(totalDuration / 60)} minutes max.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          {leads.length > 0 && (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white tracking-tight">
                    {leads.length} leads found
                    {city && <span className="text-zinc-500"> in {city}, {state}</span>}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    {duplicatesFiltered > 0 && (
                      <span className="text-[11px] text-amber-400">
                        {duplicatesFiltered} duplicates filtered
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    className="h-9 px-3 bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 hover:border-white/[0.1] rounded-lg transition-all duration-200"
                  >
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAll}
                    className="h-9 px-3 bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 hover:border-white/[0.1] rounded-lg transition-all duration-200"
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Deselect
                  </Button>
                </div>
              </div>

              {/* Leads Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                {leads.map((lead, index) => {
                  const tier = getTierBadge(lead);
                  const isGoldMine = lead.verification_score >= 80;

                  return (
                    <div
                      key={lead.place_id}
                      onClick={() => toggleLeadSelection(index)}
                      className={cn(
                        "group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer",
                        lead.selected
                          ? "bg-white/[0.04] border-white/[0.12] shadow-lg shadow-black/20"
                          : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08]"
                      )}
                    >
                      {/* Selection Indicator */}
                      <div className={cn(
                        "absolute top-4 right-4 w-5 h-5 rounded-md border transition-all duration-200 flex items-center justify-center",
                        lead.selected
                          ? "bg-emerald-500 border-emerald-500"
                          : "bg-transparent border-white/[0.12] group-hover:border-white/[0.2]"
                      )}>
                        {lead.selected && <Check className="h-3 w-3 text-white" />}
                      </div>

                      {/* Lead Content */}
                      <div className="space-y-3 pr-8">
                        {/* Header */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-zinc-200 truncate">
                              {lead.business_name}
                            </h3>
                            {isGoldMine && (
                              <Flame className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500">{lead.niche}</p>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <Phone className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="text-zinc-300">{lead.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{lead.city}, {lead.state}</span>
                          </div>
                        </div>

                        {/* Rating & Reviews */}
                        {lead.rating > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400/20" />
                            <span className="text-sm text-zinc-300 font-medium">{lead.rating}</span>
                            <span className="text-xs text-zinc-500">({lead.review_count} reviews)</span>
                          </div>
                        )}

                        {/* Website */}
                        {lead.website && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Globe className="h-3 w-3 text-zinc-500" />
                            <span className="text-violet-400 truncate">
                              {lead.website.replace(/^https?:\/\//, "")}
                            </span>
                          </div>
                        )}

                        {/* Score Badge */}
                        <div className="pt-2 border-t border-white/[0.04]">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide border",
                            tier.class
                          )}>
                            {isGoldMine && <Flame className="h-3 w-3" />}
                            {tier.label}
                            <span className="opacity-60">• {lead.verification_score}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Import Action Bar */}
              <div className="sticky bottom-6 flex justify-center">
                <div className="flex items-center gap-3 p-2 rounded-2xl bg-zinc-900/90 border border-white/[0.08] shadow-2xl shadow-black/50 backdrop-blur-xl">
                  <Button
                    onClick={handleDiscard}
                    disabled={importing}
                    variant="outline"
                    className="h-11 px-4 bg-transparent border-white/[0.08] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200 hover:border-white/[0.12] rounded-xl transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Discard
                  </Button>

                  <Separator orientation="vertical" className="h-6 bg-white/[0.08]" />

                  <Button
                    onClick={handleImport}
                    disabled={importing || selectedCount === 0}
                    className="h-11 px-6 bg-white text-black hover:bg-zinc-200 font-medium rounded-xl transition-all duration-200 disabled:opacity-40"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing {selectedCount}...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Import {selectedCount} Leads
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleDiscard}
                    disabled={importing}
                    variant="outline"
                    className="h-11 px-6 border-zinc-600 text-zinc-400 hover:bg-zinc-800 hover:text-white font-medium rounded-xl transition-all duration-200"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Discard
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
