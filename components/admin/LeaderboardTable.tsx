"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  username: string;
  callsToday: number;
  answered: number;
  answerRate: number;
  callbacks: number;
  goldMines: number;
}

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
}

export function LeaderboardTable({ data }: LeaderboardTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">No calling activity today</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="border-white/[0.06] hover:bg-transparent">
            <TableHead className="text-zinc-500 w-12 px-2">#</TableHead>
            <TableHead className="text-zinc-500 px-2">Caller</TableHead>
            <TableHead className="text-zinc-500 text-right w-14 px-2">Calls</TableHead>
            <TableHead className="text-zinc-500 text-right w-14 px-2">Ans</TableHead>
            <TableHead className="text-zinc-500 text-right w-12 px-2">%</TableHead>
            <TableHead className="text-zinc-500 text-right w-12 px-2">CB</TableHead>
            <TableHead className="text-zinc-500 text-right w-12 px-2">Gold</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entry, index) => (
            <TableRow
              key={entry.username}
              className={`border-white/[0.04] ${
                index === 0 ? "bg-amber-500/5" : "hover:bg-white/[0.02]"
              }`}
            >
              <TableCell className="py-2 px-2">
                {entry.rank === 1 ? (
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-amber-400" />
                    <span className="text-amber-400 font-bold text-sm">1</span>
                  </div>
                ) : entry.rank === 2 ? (
                  <span className="text-zinc-400 font-medium text-sm pl-1">2</span>
                ) : entry.rank === 3 ? (
                  <span className="text-zinc-500 font-medium text-sm pl-1">3</span>
                ) : (
                  <span className="text-zinc-600 text-sm pl-1">{entry.rank}</span>
                )}
              </TableCell>
              <TableCell className="py-2 px-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white text-sm truncate">{entry.username}</span>
                  {index === 0 && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1 py-0 shrink-0">
                      #1
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-2 px-2 text-right">
                <span className="text-white font-medium text-sm">{entry.callsToday}</span>
              </TableCell>
              <TableCell className="py-2 px-2 text-right">
                <span className="text-emerald-400 text-sm">{entry.answered}</span>
              </TableCell>
              <TableCell className="py-2 px-2 text-right">
                <span
                  className={`text-sm font-medium ${
                    entry.answerRate >= 50
                      ? "text-emerald-400"
                      : entry.answerRate >= 30
                      ? "text-amber-400"
                      : "text-zinc-400"
                  }`}
                >
                  {entry.answerRate}%
                </span>
              </TableCell>
              <TableCell className="py-2 px-2 text-right">
                <span className="text-blue-400 text-sm">{entry.callbacks}</span>
              </TableCell>
              <TableCell className="py-2 px-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  {entry.goldMines > 0 && <Flame className="h-3 w-3 text-amber-400" />}
                  <span className={entry.goldMines > 0 ? "text-amber-400 text-sm" : "text-zinc-500 text-sm"}>
                    {entry.goldMines}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
