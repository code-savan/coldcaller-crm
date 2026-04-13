"use client";

import { Lead } from "@/lib/pocketbase";
import { Phone, MessageCircle, Voicemail, XCircle, Clock, TrendingUp, Flame, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionStatsProps {
  leads: Lead[];
}

export function SessionStats({ leads }: SessionStatsProps) {
  const total = leads.length;
  const calls = leads.filter((l) => l.status !== "not_called").length;
  const answered = leads.filter((l) => l.status === "answered").length;
  const voicemails = leads.filter((l) => l.status === "voicemail").length;
  const noAnswers = leads.filter((l) => l.status === "no_answer").length;
  const notInterested = leads.filter((l) => l.status === "not_interested").length;
  const callbacks = leads.filter((l) => l.status === "callback").length;
  const gatekeepers = leads.filter((l) => l.status === "gatekeeper").length;

  const answerRate = calls > 0 ? Math.round((answered / calls) * 100) : 0;
  const remaining = total - calls;

//   const statCards = [
//     {
//       label: "Total Leads",
//       value: total,
//       icon: Phone,
//       gradient: "from-violet-500 to-purple-600",
//       textColor: "text-violet-400",
//     },
//     {
//       label: "Calls Made",
//       value: calls,
//       icon: TrendingUp,
//       gradient: "from-emerald-500 to-teal-600",
//       textColor: "text-emerald-400",
//     },
//     {
//       label: "Answered",
//       value: answered,
//       icon: MessageCircle,
//       gradient: "from-blue-500 to-cyan-600",
//       textColor: "text-blue-400",
//     },
//     {
//       label: "Answer Rate",
//       value: `${answerRate}%`,
//       icon: TrendingUp,
//       gradient: "from-amber-500 to-orange-600",
//       textColor: "text-amber-400",
//     },
//     {
//       label: "Callbacks",
//       value: callbacks,
//       icon: Clock,
//       gradient: "from-pink-500 to-rose-600",
//       textColor: "text-pink-400",
//     },
//     {
//       label: "Remaining",
//       value: remaining,
//       icon: XCircle,
//       gradient: "from-slate-500 to-slate-600",
//       textColor: "text-slate-400",
//     },
//   ];

  // Gold mine count
  const goldMines = leads.filter((l) => l.verification_score >= 80).length;

  const statCards = [
    {
      label: "Total Leads",
      value: total,
      icon: Target,
      bgColor: "bg-violet-500/10",
      iconColor: "text-violet-400",
      borderColor: "border-violet-500/20",
    },
    {
      label: "Calls Made",
      value: calls,
      icon: Phone,
      bgColor: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/20",
    },
    {
      label: "Answered",
      value: answered,
      icon: MessageCircle,
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/20",
    },
    {
      label: "Gold Mines",
      value: goldMines,
      icon: Flame,
      bgColor: "bg-amber-500/10",
      iconColor: "text-amber-400",
      borderColor: "border-amber-500/20",
    },
    {
      label: "Callbacks",
      value: callbacks,
      icon: Clock,
      bgColor: "bg-pink-500/10",
      iconColor: "text-pink-400",
      borderColor: "border-pink-500/20",
    },
    {
      label: "Remaining",
      value: remaining,
      icon: Zap,
      bgColor: "bg-zinc-500/10",
      iconColor: "text-zinc-400",
      borderColor: "border-zinc-500/20",
    },
  ];

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Performance Overview</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500">
            Progress: <span className="text-zinc-300 font-medium">{total > 0 ? Math.round((calls / total) * 100) : 0}%</span>
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="group relative p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border",
                  stat.bgColor,
                  stat.borderColor
                )}>
                  <Icon className={cn("h-4 w-4", stat.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-semibold text-white tabular-nums">
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mt-0.5">
                    {stat.label}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Progress Bar */}
      <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-400">Session Progress</span>
          <span className="text-xs font-medium text-white">{calls} / {total} leads called</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 via-emerald-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${total > 0 ? (calls / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Status Breakdown Pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { label: "Voicemail", value: voicemails, className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
          { label: "No Answer", value: noAnswers, className: "bg-red-500/10 text-red-400 border-red-500/20" },
          { label: "Not Interested", value: notInterested, className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
          { label: "Gatekeeper", value: gatekeepers, className: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
        ].map((item) => (
          item.value > 0 && (
            <span
              key={item.label}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide border",
                item.className
              )}
            >
              {item.label}: {item.value}
            </span>
          )
        ))}
      </div>
    </div>
  );
}
