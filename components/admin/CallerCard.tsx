"use client";

import { User } from "@/lib/pocketbase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle2, Clock, Calendar } from "lucide-react";

interface CallerCardProps {
  user: User;
  todayStats: {
    callsMade: number;
    answered: number;
    callbacks: number;
    answerRate: number;
  };
}

export function CallerCard({ user, todayStats }: CallerCardProps) {
  const isActive = user.session_active;

  // Format last active time
  const formatLastActive = (isoString?: string) => {
    if (!isoString) return "Never";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return "+1d ago";
  };

  return (
    <Card className="bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1] transition-all cursor-pointer group">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="relative shrink-0">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                isActive
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-zinc-800 border border-zinc-700"
              }`}
            >
              <Phone className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400" : "text-zinc-500"}`} />
            </div>
            {isActive && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0a0a0a]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white text-sm truncate">{user.username}</h3>
              <Badge
                variant="outline"
                className={`text-[9px] px-1 py-0 shrink-0 ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                {isActive ? "● Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {isActive ? "Calling now" : formatLastActive(user.last_active)}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.04]">
          <div>
            <p className="text-sm font-semibold text-white">{todayStats.callsMade}</p>
            <p className="text-[9px] text-zinc-500">Calls</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-400">{todayStats.answered}</p>
            <p className="text-[9px] text-zinc-500">Ans</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-400">{todayStats.callbacks}</p>
            <p className="text-[9px] text-zinc-500">CB</p>
          </div>
          <div className="ml-auto text-right">
            <p className={`text-sm font-semibold ${
              todayStats.answerRate >= 50 ? "text-emerald-400" : "text-zinc-400"
            }`}>
              {todayStats.answerRate}%
            </p>
            <p className="text-[9px] text-zinc-500">Rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
