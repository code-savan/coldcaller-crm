"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  List,
  Search,
  Upload,
  Phone,
  Settings,
  LogOut,
  History,
  Shield,
  Users,
  BarChart3,
  AlertTriangle,
  PhoneCall,
} from "lucide-react";
import Image from "next/image";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: List },
  { name: "Operations", href: "/operations", icon: Phone },
  { name: "Dialer", href: "/dialer", icon: PhoneCall },
  { name: "Sessions", href: "/sessions", icon: History },
  { name: "Discover", href: "/discover", icon: Search, showStatus: true },
  { name: "Upload", href: "/upload", icon: Upload },
  { name: "Review Queue", href: "/review", icon: AlertTriangle },
];

export function SideNav() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Get username and admin status on mount
  useEffect(() => {
    const user = localStorage.getItem("username");
    const admin = localStorage.getItem("isAdmin") === "true";
    if (user) setUsername(user);
    setIsAdmin(admin);
  }, []);

  return (
    <div className="flex h-full flex-col bg-zinc-950 border-r border-zinc-800/50">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-2 px-6 border-b border-zinc-800/50">
        {/* <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
          <Phone className="h-4 w-4 text-white" />
        </div> */}
        <Image src="/logo.png" alt="CallFlow" width={32} height={32} />
        <span className="font-bold text-white text-lg tracking-tight">CallFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item: any) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-violet-600/10 text-violet-400 border border-violet-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-violet-400" : "text-zinc-500")} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Admin Section - Only visible to admins */}
        {isAdmin && (
          <>
            <div className="pt-4 mt-4 border-t border-zinc-800/50">
              <p className="px-4 text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                Admin
              </p>
            </div>

            {/* Admin Overview */}
            <Link
              href="/admin/overview"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                pathname === "/admin" || pathname === "/admin/overview"
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              )}
            >
              <BarChart3 className={cn("h-5 w-5", pathname === "/admin" || pathname === "/admin/overview" ? "text-indigo-400" : "text-zinc-500")} />
              <span>Overview</span>
            </Link>

            {/* Admin Leads */}
            <Link
              href="/admin/leads"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                pathname?.startsWith("/admin/leads")
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              )}
            >
              <List className={cn("h-5 w-5", pathname?.startsWith("/admin/leads") ? "text-indigo-400" : "text-zinc-500")} />
              <span>All Leads</span>
            </Link>

            {/* Admin Callers */}
            <Link
              href="/admin/callers"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                pathname?.startsWith("/admin/callers")
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              )}
            >
              <Users className={cn("h-5 w-5", pathname?.startsWith("/admin/callers") ? "text-indigo-400" : "text-zinc-500")} />
              <span>Callers</span>
            </Link>
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-zinc-800/50 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
        >
          <Settings className="h-5 w-5 text-zinc-500" />
          Settings
        </Link>
        <button
          onClick={() => {
            localStorage.removeItem("username");
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="h-5 w-5 text-zinc-500" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
