"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";
import { ScriptContent } from "./ScriptPanel";

export function Header() {
  const [showScripts, setShowScripts] = useState(false);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) setUsername(stored);
  }, []);

  return (
    <>
      <header className="h-16 bg-zinc-950 border-b border-zinc-800/50 flex items-center justify-between px-6 sticky top-0 z-40">
        {/* Left - Breadcrumb could go here */}
        <div className="flex items-center gap-4">
          {username && (
            <span className="text-sm text-zinc-500">
              Welcome, <span className="text-zinc-300 font-medium">{username}</span>
            </span>
          )}
        </div>

        {/* Right - Scripts Button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowScripts(true)}
            variant="outline"
            size="sm"
            className="bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:bg-violet-600/20 hover:border-violet-500/50 hover:text-violet-400"
          >
            <FileText className="h-4 w-4 mr-2" />
            Scripts
          </Button>
        </div>
      </header>

      {/* Scripts Slide-over Panel */}
      {showScripts && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowScripts(false)}
          />
          <div className="relative w-full max-w-lg bg-zinc-950 border-l border-zinc-800 h-full shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
              <h2 className="text-lg font-semibold text-white">Call Scripts</h2>
              <button
                onClick={() => setShowScripts(false)}
                className="p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100vh-80px)]">
              <ScriptContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
