"use client";

import { useState } from "react";
import { Lead, User } from "@/lib/pocketbase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, MapPin, Edit2, Trash2, UserCircle, Flame } from "lucide-react";

interface AdminLeadsTableProps {
  leads: Lead[];
  users: User[];
  selectedLeads: string[];
  onSelectLead: (leadId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onReassign: (lead: Lead, newUsername: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  not_called: "bg-zinc-800 text-zinc-400 border-zinc-700",
  answered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  voicemail: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  no_answer: "bg-red-500/10 text-red-400 border-red-500/20",
  not_interested: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  callback: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  gatekeeper: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

const TIER_COLORS: Record<string, string> = {
  gold: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  solid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  lukewarm: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  skip: "bg-zinc-800 text-zinc-500 border-zinc-700",
  unverified: "bg-zinc-800 text-zinc-500 border-zinc-700",
};

export function AdminLeadsTable({
  leads,
  users,
  selectedLeads,
  onSelectLead,
  onSelectAll,
  onEdit,
  onDelete,
  onReassign,
  page,
  totalPages,
  onPageChange,
}: AdminLeadsTableProps) {
  const [reassigningLead, setReassigningLead] = useState<string | null>(null);

  const getTier = (score: number, verified: boolean): string => {
    if (!verified || score === 0) return "unverified";
    if (score >= 80) return "gold";
    if (score >= 50) return "solid";
    if (score >= 20) return "lukewarm";
    return "skip";
  };

  const allSelected = leads.length > 0 && leads.every((l) => selectedLeads.includes(l.id));
  const someSelected = selectedLeads.length > 0 && !allSelected;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/[0.06]">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] bg-white/[0.02] hover:bg-transparent">
              <TableHead className="w-10 px-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/20"
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </TableHead>
              <TableHead className="text-zinc-400 px-2">Business</TableHead>
              <TableHead className="text-zinc-400 px-2">Contact & Status</TableHead>
              <TableHead className="text-zinc-400 px-2 w-16">Score</TableHead>
              <TableHead className="text-zinc-400 px-2">Caller</TableHead>
              <TableHead className="text-zinc-400 text-right px-2 w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const tier = getTier(lead.verification_score, lead.verified);
              const isSelected = selectedLeads.includes(lead.id);

              return (
                <TableRow
                  key={lead.id}
                  className={`border-white/[0.04] hover:bg-white/[0.02] ${
                    isSelected ? "bg-indigo-500/5" : ""
                  }`}
                >
                  <TableCell className="py-2 px-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/20"
                      onChange={(e) => onSelectLead(lead.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm">
                          {lead.business_name}
                        </span>
                        {lead.verification_score >= 80 && (
                          <Flame className="h-3 w-3 text-amber-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <MapPin className="h-3 w-3" />
                        {lead.city}, {lead.state}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <div className="text-sm text-zinc-300">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-zinc-500" />
                        {lead.phone}
                      </div>
                      <Badge
                        className={`text-[10px] mt-1 ${
                          STATUS_COLORS[lead.status] || STATUS_COLORS.not_called
                        }`}
                      >
                        {lead.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <div className="flex flex-col">
                      <span
                        className={`text-sm font-medium ${
                          lead.verification_score >= 80
                            ? "text-amber-400"
                            : lead.verification_score >= 50
                            ? "text-emerald-400"
                            : lead.verification_score >= 20
                            ? "text-blue-400"
                            : "text-zinc-500"
                        }`}
                      >
                        {lead.verification_score || "—"}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {tier === "gold" ? "Gold" : tier === "solid" ? "Solid" : tier === "lukewarm" ? "Warm" : tier === "skip" ? "Skip" : "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    {reassigningLead === lead.id ? (
                      <Select
                        onValueChange={(value) => {
                          onReassign(lead, value);
                          setReassigningLead(null);
                        }}
                        defaultValue={lead.username}
                      >
                        <SelectTrigger className="w-28 h-7 bg-zinc-900 border-zinc-700 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {users.map((user) => (
                            <SelectItem
                              key={user.id}
                              value={user.username}
                              className="text-xs"
                            >
                              {user.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div>
                        <div className="flex items-center gap-1 text-sm text-zinc-300">
                          <UserCircle className="h-3 w-3 text-zinc-500" />
                          {lead.username}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {lead.call_count || 0} calls
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-2 px-2 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(lead)}
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReassigningLead(reassigningLead === lead.id ? null : lead.id)}
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10"
                        title="Reassign"
                      >
                        <UserCircle className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(lead)}
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Showing {leads.length} leads • Page {page} of {totalPages}
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
