"use client";

import { usePathname } from "next/navigation";
import "./globals.css";
import { SideNav } from "@/components/SideNav";
import { Header } from "@/components/Header";
import { ToastProvider } from "@/components/ToastProvider";

// Metadata must be in a separate file for client components
// See: metadata.ts in same folder

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/";

  if (isLoginPage) {
    return (
      <html lang="en">
        <body className="antialiased bg-zinc-950 text-white min-h-screen">
          <ToastProvider />
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className="antialiased bg-zinc-950 text-white min-h-screen">
        <ToastProvider />
        <div className="flex h-screen">
          {/* Side Navigation */}
          <aside className="w-64 shrink-0">
            <SideNav />
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 overflow-auto bg-zinc-950">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
