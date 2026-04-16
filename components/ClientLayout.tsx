"use client";

import { usePathname } from "next/navigation";
import { SideNav } from "@/components/SideNav";
import { Header } from "@/components/Header";
import { ToastProvider } from "@/components/ToastProvider";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/";

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
      <div className="flex h-screen">
        <aside className="w-64 shrink-0">
          <SideNav />
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-auto bg-zinc-950">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
