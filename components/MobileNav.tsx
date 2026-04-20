"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  List,
  Phone,
  PhoneCall,
  Search,
  History,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const mobileNavigation = [
  { name: "Dash", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: List },
  { name: "Ops", href: "/operations", icon: Phone },
  { name: "Dialer", href: "/dialer", icon: PhoneCall },
  { name: "More", href: "#", icon: Menu, isMenu: true },
];

const moreMenuItems = [
  { name: "Sessions", href: "/sessions", icon: History },
  { name: "Discover", href: "/discover", icon: Search },
  { name: "Upload", href: "/upload", icon: List },
];

export function MobileNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800/50 lg:hidden safe-area-pb">
        <div className="flex items-center justify-around h-16">
          {mobileNavigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;

            if (item.isMenu) {
              return (
                <button
                  key={item.name}
                  onClick={() => setIsMoreOpen(true)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all active:scale-95",
                    isMoreOpen
                      ? "text-violet-400"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all active:scale-95",
                  isActive
                    ? "text-violet-400"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* More Menu Modal */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl lg:hidden"
            >
              <div className="p-4 pb-24 safe-area-pb">
                {/* Handle bar */}
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-1 rounded-full bg-zinc-700" />
                </div>

                {/* Close button */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-white">More Options</h3>
                  <button
                    onClick={() => setIsMoreOpen(false)}
                    className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white active:scale-95 transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Menu items */}
                <div className="grid grid-cols-3 gap-3">
                  {moreMenuItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMoreOpen(false)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-4 rounded-2xl transition-all active:scale-95",
                          isActive
                            ? "bg-violet-600/20 text-violet-400"
                            : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        )}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="text-sm font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Quick Dial Button */}
                <Link
                  href="/dialer"
                  onClick={() => setIsMoreOpen(false)}
                  className="mt-4 flex items-center justify-center gap-2 w-full py-4 bg-violet-600 rounded-2xl text-white font-semibold active:scale-95 transition-all"
                >
                  <PhoneCall className="h-5 w-5" />
                  <span>Quick Dial</span>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Safe area spacer for iOS */}
      <div className="h-safe-area-inset-bottom lg:hidden" />
    </>
  );
}
