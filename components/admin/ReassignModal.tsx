"use client";

import { useState } from "react";
import { User } from "@/lib/pocketbase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCircle } from "lucide-react";

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadCount: number;
  users: User[];
  onConfirm: (newUsername: string) => void;
}

export function ReassignModal({
  isOpen,
  onClose,
  leadCount,
  users,
  onConfirm,
}: ReassignModalProps) {
  const [selectedUser, setSelectedUser] = useState<string>("");

  const handleConfirm = () => {
    if (selectedUser) {
      onConfirm(selectedUser);
      setSelectedUser("");
    }
  };

  const handleClose = () => {
    setSelectedUser("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-white/[0.08] text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-indigo-400" />
            Reassign Leads
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {leadCount === 1
              ? "Select a caller to assign this lead to."
              : `Select a caller to assign these ${leadCount} leads to.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium text-zinc-300 mb-2 block">
            Select Caller
          </label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200">
              <SelectValue placeholder="Choose a caller..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {users.map((user) => (
                <SelectItem
                  key={user.id}
                  value={user.username}
                  className="text-zinc-300 focus:bg-white/[0.05] focus:text-white"
                >
                  {user.username}
                  {user.name && (
                    <span className="text-zinc-500 ml-2">({user.name})</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="bg-transparent border-white/[0.1] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedUser}
            className="bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50"
          >
            Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
