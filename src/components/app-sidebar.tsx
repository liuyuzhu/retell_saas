"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  Phone,
  Bot,
  PhoneCall,
  Mic,
  MessageSquare,
  LayoutDashboard,
  Settings,
  Sparkles,
} from "lucide-react";

const sidebarNavItems = [
  {
    titleKey: "dashboard",
    href: "",
    icon: LayoutDashboard,
  },
  {
    titleKey: "phoneNumbers",
    href: "/phone-numbers",
    icon: Phone,
  },
  {
    titleKey: "agents",
    href: "/agents",
    icon: Bot,
  },
  {
    titleKey: "calls",
    href: "/calls",
    icon: PhoneCall,
  },
  {
    titleKey: "voices",
    href: "/voices",
    icon: Mic,
  },
  {
    titleKey: "conversations",
    href: "/conversations",
    icon: MessageSquare,
  },
];

interface AppSidebarProps {
  locale: string;
}

export function AppSidebar({ locale }: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const tCommon = useTranslations("common");

  const getHref = (href: string) => {
    return `/${locale}${href}`;
  };

  // Check if current path matches the nav item
  const isActive = (href: string) => {
    const fullPath = getHref(href);
    if (href === "") {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    return pathname.startsWith(fullPath);
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href={`/${locale}`} className="flex items-center space-x-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">{tCommon("appName")}</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="grid gap-1 px-2">
          {sidebarNavItems.map((item) => (
            <Link key={item.href} href={getHref(item.href)}>
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  isActive(item.href) && "bg-secondary"
                )}
              >
                <item.icon className="h-4 w-4" />
                {t(item.titleKey)}
              </Button>
            </Link>
          ))}
        </nav>
      </ScrollArea>
      <div className="p-4 space-y-2">
        <LanguageSwitcher />
        <Separator />
        <Link href={`/${locale}/settings`}>
          <Button variant="outline" className="w-full justify-start gap-2">
            <Settings className="h-4 w-4" />
            {t("settings")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
