"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pb, User, Lead } from "@/lib/pocketbase";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminLeadsTable } from "@/components/admin/AdminLeadsTable";
import { ReassignModal } from "@/components/admin/ReassignModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { List, Search, Trash2, UserCircle, Download, Flame, Filter } from "lucide-react";
import { exportToCSV } from "@/lib/csvParser";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "not_called", label: "Not Called" },
  { value: "answered", label: "Answered" },
  { value: "voicemail", label: "Voicemail" },
  { value: "no_answer", label: "No Answer" },
  { value: "callback", label: "Callback" },
  { value: "not_interested", label: "Not Interested" },
  { value: "gatekeeper", label: "Gatekeeper" },
];

const TIER_OPTIONS = [
  { value: "all", label: "All Tiers" },
  { value: "gold", label: "Gold Mine" },
  { value: "solid", label: "Solid" },
  { value: "lukewarm", label: "Lukewarm" },
  { value: "skip", label: "Skip" },
  { value: "unverified", label: "Unverified" },
];

export default function AdminLeadsPage() {
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [callerFilter, setCallerFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const LEADS_PER_PAGE = 25;

  // Modals
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

  // Admin access check
  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
  }, [router]);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all leads
      const leadsResult = await pb.collection("leads").getFullList<Lead>({
        sort: "-created",
      });
      setLeads(leadsResult);

      // Load all users (callers only)
      const usersResult = await pb.collection("users").getFullList<User>();
      const callers = usersResult.filter((u) => !u.is_admin);
      setUsers(callers);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter leads
  useEffect(() => {
    let filtered = leads;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.business_name.toLowerCase().includes(query) ||
          lead.phone.includes(query) ||
          lead.city.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === statusFilter);
    }

    // Tier filter
    if (tierFilter !== "all") {
      filtered = filtered.filter((lead) => {
        const score = lead.verification_score;
        const verified = lead.verified;
        switch (tierFilter) {
          case "gold":
            return score >= 80;
          case "solid":
            return score >= 50 && score < 80;
          case "lukewarm":
            return score >= 20 && score < 50;
          case "skip":
            return score > 0 && score < 20;
          case "unverified":
            return !verified || score === 0;
          default:
            return true;
        }
      });
    }

    // Caller filter
    if (callerFilter !== "all") {
      filtered = filtered.filter((lead) => lead.username === callerFilter);
    }

    setFilteredLeads(filtered);
    setPage(1); // Reset to first page when filters change
  }, [leads, searchQuery, statusFilter, tierFilter, callerFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / LEADS_PER_PAGE);
  const paginatedLeads = filteredLeads.slice(
    (page - 1) * LEADS_PER_PAGE,
    page * LEADS_PER_PAGE
  );

  // Selection handlers
  const handleSelectLead = (leadId: string, selected: boolean) => {
    if (selected) {
      setSelectedLeads((prev) => [...prev, leadId]);
    } else {
      setSelectedLeads((prev) => prev.filter((id) => id !== leadId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedLeads(paginatedLeads.map((l) => l.id));
    } else {
      setSelectedLeads([]);
    }
  };

  // Edit handlers
  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setEditForm({
      business_name: lead.business_name,
      contact_name: lead.contact_name,
      phone: lead.phone,
      city: lead.city,
      state: lead.state,
      niche: lead.niche,
      website: lead.website,
      notes: lead.notes,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingLead) return;
    try {
      await pb.collection("leads").update(editingLead.id, editForm);
      setLeads((prev) =>
        prev.map((l) => (l.id === editingLead.id ? { ...l, ...editForm } as Lead : l))
      );
      setEditingLead(null);
    } catch (err) {
      console.error("Failed to update lead:", err);
      alert("Failed to update lead");
    }
  };

  // Delete handler
  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Delete ${lead.business_name}?`)) return;
    try {
      await pb.collection("leads").delete(lead.id);
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setSelectedLeads((prev) => prev.filter((id) => id !== lead.id));
    } catch (err) {
      console.error("Failed to delete lead:", err);
      alert("Failed to delete lead");
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedLeads.length} selected leads?`)) return;
    try {
      for (const leadId of selectedLeads) {
        await pb.collection("leads").delete(leadId);
      }
      setLeads((prev) => prev.filter((l) => !selectedLeads.includes(l.id)));
      setSelectedLeads([]);
    } catch (err) {
      console.error("Failed to delete leads:", err);
      alert("Failed to delete some leads");
    }
  };

  // Reassign handler
  const handleReassign = async (lead: Lead, newUsername: string) => {
    try {
      await pb.collection("leads").update(lead.id, { username: newUsername });
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, username: newUsername } : l))
      );
    } catch (err) {
      console.error("Failed to reassign lead:", err);
      alert("Failed to reassign lead");
    }
  };

  // Bulk reassign
  const handleBulkReassign = async (newUsername: string) => {
    try {
      for (const leadId of selectedLeads) {
        await pb.collection("leads").update(leadId, { username: newUsername });
      }
      setLeads((prev) =>
        prev.map((l) =>
          selectedLeads.includes(l.id) ? { ...l, username: newUsername } : l
        )
      );
      setSelectedLeads([]);
      setIsReassignModalOpen(false);
    } catch (err) {
      console.error("Failed to reassign leads:", err);
      alert("Failed to reassign some leads");
    }
  };

  // Export handlers
  const handleExportAll = () => {
    const headers = [
      "business_name",
      "contact_name",
      "phone",
      "city",
      "state",
      "niche",
      "website",
      "status",
      "notes",
      "call_count",
      "verification_score",
      "username",
    ];
    const csvData = filteredLeads.map((l) => ({
      business_name: l.business_name,
      contact_name: l.contact_name,
      phone: l.phone,
      city: l.city,
      state: l.state,
      niche: l.niche,
      website: l.website,
      status: l.status,
      notes: l.notes,
      call_count: l.call_count,
      verification_score: l.verification_score,
      username: l.username,
    }));
    const csv = exportToCSV(headers, csvData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all_leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSelected = () => {
    const selectedLeadsData = leads.filter((l) => selectedLeads.includes(l.id));
    const headers = [
      "business_name",
      "contact_name",
      "phone",
      "city",
      "state",
      "niche",
      "website",
      "status",
      "notes",
      "call_count",
      "verification_score",
      "username",
    ];
    const csvData = selectedLeadsData.map((l) => ({
      business_name: l.business_name,
      contact_name: l.contact_name,
      phone: l.phone,
      city: l.city,
      state: l.state,
      niche: l.niche,
      website: l.website,
      status: l.status,
      notes: l.notes,
      call_count: l.call_count,
      verification_score: l.verification_score,
      username: l.username,
    }));
    const csv = exportToCSV(headers, csvData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get unique niches for filter
  const niches = Array.from(new Set(leads.map((l) => l.niche).filter(Boolean))).sort();

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-zinc-800" />
                <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin" />
              </div>
              <p className="text-sm text-zinc-500 font-medium">Loading leads...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <List className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">All Leads</h1>
            <p className="text-sm text-zinc-500">
              {filteredLeads.length} leads across all callers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedLeads.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReassignModalOpen(true)}
                className="bg-transparent border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10"
              >
                <UserCircle className="h-4 w-4 mr-2" />
                Reassign ({selectedLeads.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSelected}
                className="bg-transparent border-white/[0.1] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Export ({selectedLeads.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedLeads.length})
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAll}
            className="bg-transparent border-white/[0.1] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white/[0.02] border-white/[0.06] mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by business, phone, or city..."
                className="pl-10 bg-zinc-900/50 border-white/[0.08] text-zinc-200 placeholder:text-zinc-600"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex gap-3 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-zinc-900/50 border-white/[0.08] text-zinc-300">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/[0.08]">
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-zinc-300 focus:bg-white/[0.05] focus:text-white"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-36 bg-zinc-900/50 border-white/[0.08] text-zinc-300">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/[0.08]">
                  {TIER_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-zinc-300 focus:bg-white/[0.05] focus:text-white"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={callerFilter} onValueChange={setCallerFilter}>
                <SelectTrigger className="w-40 bg-zinc-900/50 border-white/[0.08] text-zinc-300">
                  <SelectValue placeholder="Caller" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/[0.08]">
                  <SelectItem
                    value="all"
                    className="text-zinc-300 focus:bg-white/[0.05] focus:text-white"
                  >
                    All Callers
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem
                      key={user.id}
                      value={user.username}
                      className="text-zinc-300 focus:bg-white/[0.05] focus:text-white"
                    >
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardContent className="p-0">
          <AdminLeadsTable
            leads={paginatedLeads}
            users={users}
            selectedLeads={selectedLeads}
            onSelectLead={handleSelectLead}
            onSelectAll={handleSelectAll}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReassign={handleReassign}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingLead && (
        <Dialog open={!!editingLead} onOpenChange={() => setEditingLead(null)}>
          <DialogContent className="bg-zinc-900 border-white/[0.08] text-zinc-100 max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <List className="h-5 w-5 text-indigo-400" />
                Edit Lead
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-zinc-400 mb-1 block">
                  Business Name
                </label>
                <Input
                  value={editForm.business_name || ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, business_name: e.target.value }))
                  }
                  className="bg-zinc-950 border-zinc-800 text-zinc-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1 block">
                    Contact Name
                  </label>
                  <Input
                    value={editForm.contact_name || ""}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, contact_name: e.target.value }))
                    }
                    className="bg-zinc-950 border-zinc-800 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1 block">
                    Phone
                  </label>
                  <Input
                    value={editForm.phone || ""}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    className="bg-zinc-950 border-zinc-800 text-zinc-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1 block">
                    City
                  </label>
                  <Input
                    value={editForm.city || ""}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, city: e.target.value }))
                    }
                    className="bg-zinc-950 border-zinc-800 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1 block">
                    State
                  </label>
                  <Input
                    value={editForm.state || ""}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, state: e.target.value }))
                    }
                    className="bg-zinc-950 border-zinc-800 text-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-400 mb-1 block">
                  Niche
                </label>
                <Input
                  value={editForm.niche || ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, niche: e.target.value }))
                  }
                  className="bg-zinc-950 border-zinc-800 text-zinc-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-400 mb-1 block">
                  Website
                </label>
                <Input
                  value={editForm.website || ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, website: e.target.value }))
                  }
                  className="bg-zinc-950 border-zinc-800 text-zinc-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-400 mb-1 block">
                  Notes
                </label>
                <textarea
                  value={editForm.notes || ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingLead(null)}
                className="bg-transparent border-white/[0.1] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="bg-indigo-500 hover:bg-indigo-600 text-white"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reassign Modal */}
      <ReassignModal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        leadCount={selectedLeads.length}
        users={users}
        onConfirm={handleBulkReassign}
      />
      </div>
    </AdminLayout>
  );
}
