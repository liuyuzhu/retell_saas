"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";

interface DashboardLayoutProps {
  children: React.ReactNode;
  locale: string;
}

export function DashboardLayout({ children, locale }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar locale={locale} />
      <main className="flex-1 overflow-auto bg-muted/30">
        <div className="container mx-auto p-6">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
