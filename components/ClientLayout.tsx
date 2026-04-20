"use client";

import { usePathname } from "next/navigation";
import { SideNav } from "@/components/SideNav";
import { Header } from "@/components/Header";
import { MobileHeader } from "@/components/MobileHeader";
import { MobileNav } from "@/components/MobileNav";
import { ToastProvider } from "@/components/ToastProvider";
import { useEffect } from "react";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/";

  // Register service worker for PWA
  useEffect(() => {
    if ("serviceWorker" in navigator && typeof window !== "undefined") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration);
        })
        .catch((error) => {
          console.log("[PWA] Service Worker registration failed:", error);
        });
    }
  }, []);

  if (isLoginPage) {
    return (
      <>
        <ToastProvider />
        {children}
      </>
    );
  }

  return (
    <>
      <ToastProvider />
      <div className="flex h-screen overflow-hidden">
        {/* Desktop SideNav - hidden on mobile */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <SideNav />
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Desktop Header - hidden on mobile */}
          <div className="hidden lg:block">
            <Header />
          </div>

          {/* Mobile Header - visible only on mobile */}
          <MobileHeader />

          {/* Main content with mobile padding for bottom nav */}
          <main className="flex-1 overflow-auto bg-zinc-950 lg:pb-0 pb-24">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </>
  );
}
