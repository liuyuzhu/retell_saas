"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
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

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar locale={locale} user={user} />
      <main className="flex-1 overflow-auto bg-muted/30">
        <div className="container mx-auto p-6">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
