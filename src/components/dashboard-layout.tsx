"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-auto bg-muted/30">
        <div className="container mx-auto p-6">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
