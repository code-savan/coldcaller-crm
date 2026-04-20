"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileHeader() {
  const [username, setUsername] = useState<string>("");
  const pathname = usePathname();

  useEffect(() => {
    const user = localStorage.getItem("username");
    if (user) setUsername(user);
  }, []);

  // Get page title from pathname
  const getPageTitle = () => {
    const path = pathname.split("/")[1] || "dashboard";
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-800/50 safe-area-pt">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Page Title */}
        <h1 className="text-lg font-semibold text-white">
          {getPageTitle()}
        </h1>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all">
            <Bell className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50">
            <User className="h-4 w-4 text-zinc-400" />
            <span className="text-sm text-zinc-300 max-w-[80px] truncate">
              {username || "User"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
