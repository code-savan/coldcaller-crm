"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, CheckCircle2, Clock, TrendingUp, BarChart3 } from "lucide-react";

interface CallerStatsProps {
  calls: number;
  answered: number;
  answerRate: number;
  callbacks: number;
}

export function CallerStats({ calls, answered, answerRate, callbacks }: CallerStatsProps) {
  const stats = [
    {
      label: "Calls Today",
      value: calls,
      icon: Phone,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20",
    },
    {
      label: "Answered",
      value: answered,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    {
      label: "Answer Rate",
      value: `${answerRate}%`,
      icon: TrendingUp,
      color: answerRate >= 50 ? "text-emerald-400" : answerRate >= 30 ? "text-amber-400" : "text-zinc-400",
      bgColor: answerRate >= 50 ? "bg-emerald-500/10" : answerRate >= 30 ? "bg-amber-500/10" : "bg-zinc-500/10",
      borderColor: answerRate >= 50 ? "border-emerald-500/20" : answerRate >= 30 ? "border-amber-500/20" : "border-zinc-500/20",
    },
    {
      label: "Callbacks",
      value: callbacks,
      icon: Clock,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            className={`${stat.bgColor} ${stat.borderColor} border`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-zinc-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
