"use client";

import { useState } from "react";
import { SessionData } from "@/lib/sessions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Calendar, Clock, Phone } from "lucide-react";

interface SessionTableProps {
  sessions: SessionData[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function SessionTable({
  sessions,
  page,
  totalPages,
  onPageChange,
}: SessionTableProps) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const calculateAnswerRate = (session: SessionData) => {
    if (session.totalCalls === 0) return 0;
    return Math.round((session.answered / session.totalCalls) * 100);
  };

  const toggleExpand = (sessionId: string) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/[0.06]">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] bg-white/[0.02] hover:bg-transparent">
              <TableHead className="w-8 px-2"></TableHead>
              <TableHead className="text-zinc-400 px-2">Date</TableHead>
              <TableHead className="text-zinc-400 px-2">Duration</TableHead>
              <TableHead className="text-zinc-400 text-right w-12 px-2">Calls</TableHead>
              <TableHead className="text-zinc-400 text-right w-12 px-2">Ans</TableHead>
              <TableHead className="text-zinc-400 text-right w-12 px-2">CB</TableHead>
              <TableHead className="text-zinc-400 text-right w-14 px-2">Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => {
              const isExpanded = expandedSession === session.id;
              const answerRate = calculateAnswerRate(session);

              return (
                <>
                  <TableRow
                    key={session.id}
                    className="border-white/[0.04] hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => toggleExpand(session.id)}
                  >
                    <TableCell className="py-2 px-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-zinc-500 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(session.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <span className="text-zinc-300 text-sm">
                        {formatDateTime(session.startTime)}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <span className="text-zinc-300 text-sm">
                        {formatDuration(session.endTime ? new Date(session.endTime).getTime() - new Date(session.startTime).getTime() - session.totalPausedTimeMs : 0)}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-right">
                      <span className="text-white font-medium text-sm">{session.totalCalls}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-right">
                      <span className="text-emerald-400 text-sm">{session.answered}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-right">
                      <span className="text-blue-400 text-sm">{session.callbacks}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-right">
                      <span className={`text-sm font-medium ${
                        answerRate >= 50
                          ? "text-emerald-400"
                          : answerRate >= 30
                          ? "text-amber-400"
                          : "text-zinc-400"
                      }`}>
                        {answerRate}%
                      </span>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Detail Row */}
                  {isExpanded && (
                    <TableRow className="bg-zinc-900/30 border-white/[0.04]">
                      <TableCell colSpan={7} className="p-0">
                        <div className="p-4">
                          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                            Call Details
                          </h4>
                          {session.calls.length === 0 ? (
                            <p className="text-sm text-zinc-500">No calls recorded</p>
                          ) : (
                            <div className="space-y-2">
                              {session.calls.map((call, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                                >
                                  <div className="flex items-center gap-3">
                                    <Phone className="h-3.5 w-3.5 text-zinc-500" />
                                    <div>
                                      <p className="text-sm text-zinc-300">
                                        {call.businessName}
                                      </p>
                                      <p className="text-xs text-zinc-500">{call.phone}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge
                                      className={`text-[10px] ${
                                        call.status === "answered"
                                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                          : call.status === "voicemail"
                                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                          : call.status === "no_answer"
                                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                                          : call.status === "callback"
                                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                          : "bg-zinc-800 text-zinc-400 border-zinc-700"
                                      }`}
                                    >
                                      {call.status.replace("_", " ")}
                                    </Badge>
                                    <span className="text-xs text-zinc-500">
                                      {new Date(call.timestamp).toLocaleTimeString("en-US", {
                                        hour: "numeric",
                                        minute: "2-digit",
                                        hour12: true,
                                      })}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="bg-transparent border-white/[0.1] text-zinc-400 hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="bg-transparent border-white/[0.1] text-zinc-400 hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
