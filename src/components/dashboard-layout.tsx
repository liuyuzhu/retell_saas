"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  locale: string;
}

export function DashboardLayout({ children, locale }: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          // Not authenticated, redirect to login
          router.push(`/${locale}/login`);
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch (error) {
        console.error("Auth check error:", error);
        router.push(`/${locale}/login`);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [locale, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <AppSidebar locale={locale} user={user} />
      </div>

      {/* Mobile Header - shown only on mobile */}
      <MobileNav locale={locale} user={user} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-muted/30">
        {/* Add padding for mobile header and bottom nav */}
        <div className="container mx-auto p-4 md:p-6 pt-[4.5rem] md:pt-6 pb-20 md:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation - shown only on mobile */}
      <MobileBottomNav locale={locale} isAdmin={isAdmin} />

      <Toaster />
    </div>
  );
}
