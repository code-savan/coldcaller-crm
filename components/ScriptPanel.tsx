"use client";

import { Lead } from "@/lib/pocketbase";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface ScriptPanelProps {
  lead?: Lead | null;
}

// Content-only version for use inside custom panels
export function ScriptContent({ lead }: ScriptPanelProps) {
  const businessName = lead?.business_name || "[Business]";
  const city = lead?.city || "[City]";
  const niche = lead?.niche || "[Niche]";

  return (
    <Tabs defaultValue="script" className="mt-4">
      <TabsList className="grid w-full grid-cols-3 bg-zinc-900">
        <TabsTrigger value="script" className="text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-white">The Script</TabsTrigger>
        <TabsTrigger value="objections" className="text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Objections</TabsTrigger>
        <TabsTrigger value="niches" className="text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Niches</TabsTrigger>
      </TabsList>

      <TabsContent value="script" className="space-y-4 mt-4 overflow-y-auto max-h-[calc(100vh-200px)]">
        <ScriptSection title="Step 1 — Opener (Pattern Interrupt)">
          <p className="text-zinc-300 italic">
            "Hi, is this <strong className="text-white">{businessName}</strong>?"
          </p>
          <p className="text-zinc-500 text-xs mt-2">[They say yes]</p>
          <p className="text-zinc-300 italic mt-3">
            "Hey, my name is [Name], I'm calling from Codesavan — quick question for you: do you currently have a website for the business?"
          </p>
          <Note>Don't introduce yourself fully upfront — a question disarms gatekeeping. Keep tone casual, not corporate.</Note>
        </ScriptSection>

        <ScriptSection title="Step 2 — The Hook (The Demo Reveal)">
          <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">If NO website:</p>
          <p className="text-zinc-300 italic">
            "Perfect — so here's the reason I'm calling. My team actually went ahead and built a free demo website specifically for <strong className="text-white">{niche}</strong> businesses in <strong className="text-white">{city}</strong>. I built it to show you what your business could look like online — no charge, no obligation, nothing to sign. I just need about 10 minutes to walk you through it and get your thoughts."
          </p>

          <p className="text-zinc-500 text-xs uppercase tracking-wide mt-4 mb-2">If they HAVE a website:</p>
          <p className="text-zinc-300 italic">
            "Got it — I actually still built one for you because I wanted to show you what a modern, mobile-optimized version could look like versus what most <strong className="text-white">{niche}</strong> businesses are running right now. It takes 10 minutes — worth a look?"
          </p>
          <Note>Key phrase: "I already built it" — shifts dynamic from selling to showing. They feel obligated to look.</Note>
        </ScriptSection>

        <ScriptSection title="Step 3 — Book the Demo (The Ask)">
          <p className="text-zinc-300 italic">
            "I can jump on a quick Zoom with you today around [time] or tomorrow morning — which works better for you?"
          </p>
          <Note>Always give two options. Never ask "are you free?" — invites a no. Force a choice between two yeses.</Note>
        </ScriptSection>

        <ScriptSection title="Step 4 — Confirm The Booking">
          <p className="text-zinc-300 italic">
            "Perfect. So I have you down for [Day] at [Time] — I'll send a calendar invite to your email right now. What's the best address?"
          </p>
          <p className="text-zinc-500 text-xs mt-2">[Get email]</p>
          <p className="text-zinc-300 italic mt-3">
            "Got it. You'll get an invite in the next 2 minutes with the Zoom link. Looking forward to showing you what we put together — I think you'll really like it. Have a great rest of your day."
          </p>
          <Note>Always confirm day + time + email. Send invite IMMEDIATELY while on line. No invite = no show.</Note>
        </ScriptSection>
      </TabsContent>

      <TabsContent value="objections" className="space-y-4 mt-4 overflow-y-auto max-h-[calc(100vh-200px)]">
        <ObjectionCard
          question="Just send me the link."
          answer="I totally can — and I will. But honestly, the demo looks 10x better when I walk you through it and explain what we built specific to your business. It takes 10 minutes and I think you'll actually enjoy it. Does today at [time] work, or is tomorrow better?"
        />
        <ObjectionCard
          question="I'm really busy right now."
          answer="No worries at all — that's exactly why I want to schedule a proper time instead of keeping you now. What's your calendar like tomorrow morning? I'll send you a link and we'll keep it to 10 minutes flat."
        />
        <ObjectionCard
          question="Not interested."
          answer="I get that — you haven't seen it yet, so I wouldn't expect you to be. All I'm asking is 10 minutes to show you something I already built for free. If you look at it and don't like it, no problem at all. Fair enough?"
        />
        <ObjectionCard
          question="How much does it cost?"
          answer="That's a great question — and I'll be completely transparent about pricing on the call. But honestly, I don't want to throw out a number before you've even seen what we built. If you look at it and hate it, the price doesn't matter. If you love it, we'll talk numbers — and I think you'll be surprised at how affordable it is. Can we do tomorrow at [time]?"
        />
        <ObjectionCard
          question="I already have someone handling my website."
          answer="Totally fair — I'm not asking you to fire anyone. I built this as a comparison, just so you can see what's possible. A lot of our clients had someone before us too. Takes 10 minutes — worth knowing your options, right?"
        />
        <ObjectionCard
          question="Is this a sales call?"
          answer="Honestly? There's an offer at the end — I won't lie to you. But your only job today is to show up and look at a free demo we built. No pressure, no pitch deck, no contracts. If you like it, we talk. If you don't, no hard feelings."
        />
      </TabsContent>

      <TabsContent value="niches" className="space-y-4 mt-4 overflow-y-auto max-h-[calc(100vh-200px)]">
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-sm text-zinc-400 mb-4">
            Target niches ranked by urgency and deal tolerance. 🔥 = HOT (very high urgency), 🔶 = WARM (medium urgency)
          </p>
          <div className="space-y-3">
            <NicheRow name="Roofers" badge="🔥 HOT" deal="$1K–$2K" urgency="VERY HIGH" desc="Storm-chasing, seasonal. $10K-$30K avg job. Many zero web presence." />
            <NicheRow name="HVAC" badge="🔥 HOT" deal="$1K–$1.5K" urgency="HIGH" desc="Year-round demand. Owners cash-rich, time-poor." />
            <NicheRow name="Plumbers" badge="🔥 HOT" deal="$800–$1.5K" urgency="HIGH" desc="Emergency-call business. Google = everything. Outdated sites." />
            <NicheRow name="Pest Control" badge="🔥 HOT" deal="$1K–$1.5K" urgency="HIGH" desc="Recurring revenue. Need steady leads. Perfect for SEO upsell." />
            <NicheRow name="Pressure Washing" badge="🔥 HOT" deal="$700–$1K" urgency="HIGH" desc="Low barrier entry. Solo operators. Easy demo wins." />
            <NicheRow name="Tree Service" badge="🔥 HOT" deal="$1K–$1.5K" urgency="HIGH" desc="High job value ($500-$5K). Storm season urgency." />
            <NicheRow name="Garage Door Repair" badge="🔥 HOT" deal="$1K–$1.5K" urgency="VERY HIGH" desc="Emergency niche. Google = everything. Fast closers." />
            <NicheRow name="Electricians" badge="🔶 WARM" deal="$800–$1.2K" urgency="MEDIUM" desc="Licensed pros. High job values. Skeptical but loyal." />
            <NicheRow name="Landscapers" badge="🔶 WARM" deal="$800–$1.2K" urgency="MEDIUM-HIGH" desc="Seasonal rush. Visual buyers. Quick in-season." />
            <NicheRow name="Pool Service" badge="🔶 WARM" deal="$1K–$1.5K" urgency="MEDIUM" desc="High LTV clients. Summer rush. Repeat buyer mindset." />
            <NicheRow name="Auto Detailers" badge="🔶 WARM" deal="$700–$1K" urgency="MEDIUM" desc="Mobile segment. Instagram-first, no websites." />
            <NicheRow name="Cleaning Services" badge="🔶 WARM" deal="$700–$1K" urgency="MEDIUM" desc="Recurring clients. Trust-focused. Women-owned mostly." />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// Full Sheet version with trigger button
export function ScriptPanel({ lead }: ScriptPanelProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 bg-zinc-950/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white">
          <FileText className="h-4 w-4" />
          Scripts
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl bg-zinc-950 border-zinc-800">
        <SheetHeader>
          <SheetTitle className="text-white">Cold Call Scripts</SheetTitle>
        </SheetHeader>
        <ScriptContent lead={lead} />
      </SheetContent>
    </Sheet>
  );
}

function ScriptSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
      <h4 className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-3">
        {title}
      </h4>
      <div className="text-sm leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-xs text-zinc-500 font-mono border-l-2 border-zinc-700 pl-3">
      // {children}
    </p>
  );
}

function ObjectionCard({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
      <div className="p-4 border-b border-zinc-800/50 bg-red-500/5">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Prospect Says</p>
        <p className="text-red-400 font-medium italic">"{question}"</p>
      </div>
      <div className="p-4 bg-emerald-500/5">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">You Say</p>
        <p className="text-emerald-400/90 italic leading-relaxed">"{answer}"</p>
      </div>
    </div>
  );
}

function NicheRow({ name, badge, deal, urgency, desc }: { name: string; badge: string; deal: string; urgency: string; desc: string }) {
  const isHot = badge.includes("🔥");
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/30">
      <div className={`px-2 py-1 rounded text-xs font-bold ${isHot ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
        {badge}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-zinc-200">{name}</span>
          <span className="text-xs text-zinc-500">{deal}</span>
        </div>
        <p className="text-xs text-zinc-500">{desc}</p>
      </div>
    </div>
  );
}
