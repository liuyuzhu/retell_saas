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
    let mounted = true;

    const checkAuth = async () => {
      try {
        // Check localStorage first - if we just logged in
        if (typeof window !== 'undefined') {
          const cachedUser = localStorage.getItem('auth_user');
          const cachedTimestamp = localStorage.getItem('auth_timestamp');
          
          if (cachedUser && cachedTimestamp) {
            const timestamp = parseInt(cachedTimestamp, 10);
            const now = Date.now();
            if (now - timestamp < 30000) { // 30 seconds
              setUser(JSON.parse(cachedUser));
              setLoading(false);
            }
          }
        }

        // Try API check in background
        const res = await fetch("/api/auth/me", {
          credentials: 'include',
          cache: 'no-store',
        });
        
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.user) {
            setUser(data.user);
            setLoading(false);
            
            // Update cache
            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_user', JSON.stringify(data.user));
              localStorage.setItem('auth_timestamp', Date.now().toString());
            }
            return;
          }
        }

        // If failed and no user set, redirect
        if (mounted && !user) {
          router.push(`/${locale}/login`);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        // Check if we have cache
        if (typeof window !== 'undefined') {
          const cachedUser = localStorage.getItem('auth_user');
          const cachedTimestamp = localStorage.getItem('auth_timestamp');
          if (cachedUser && cachedTimestamp) {
            const timestamp = parseInt(cachedTimestamp, 10);
            const now = Date.now();
            if (now - timestamp < 60000) { // 1 minute
              setUser(JSON.parse(cachedUser));
              setLoading(false);
              return;
            }
          }
        }
        // Only redirect if we don't have user
        if (mounted && !user) {
          router.push(`/${locale}/login`);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [locale, router, user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
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
