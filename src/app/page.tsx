"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Bot, PhoneCall, MessageSquare, TrendingUp, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface Stats {
  phoneNumbers: number;
  agents: number;
  calls: number;
  conversations: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    phoneNumbers: 0,
    agents: 0,
    calls: 0,
    conversations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [phoneNumbersRes, agentsRes, callsRes, conversationsRes] = await Promise.all([
          fetch("/api/phone-numbers?limit=1"),
          fetch("/api/agents?limit=1"),
          fetch("/api/calls?limit=1"),
          fetch("/api/conversations?limit=1"),
        ]);

        const [phoneNumbers, agents, calls, conversations] = await Promise.all([
          phoneNumbersRes.json(),
          agentsRes.json(),
          callsRes.json(),
          conversationsRes.json(),
        ]);

        setStats({
          phoneNumbers: phoneNumbers.data?.length || 0,
          agents: agents.data?.length || 0,
          calls: calls.data?.length || 0,
          conversations: conversations.data?.length || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Phone Numbers",
      value: stats.phoneNumbers,
      description: "Active phone numbers",
      icon: Phone,
      color: "text-blue-500",
    },
    {
      title: "Agents",
      value: stats.agents,
      description: "AI voice agents",
      icon: Bot,
      color: "text-green-500",
    },
    {
      title: "Calls",
      value: stats.calls,
      description: "Total calls made",
      icon: PhoneCall,
      color: "text-purple-500",
    },
    {
      title: "Conversations",
      value: stats.conversations,
      description: "Conversation records",
      icon: MessageSquare,
      color: "text-orange-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your Retell AI voice platform
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : stat.value}
                </div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common tasks and operations
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <a
                href="/phone-numbers"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <Phone className="h-4 w-4 text-blue-500" />
                <span>Manage Phone Numbers</span>
              </a>
              <a
                href="/agents"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <Bot className="h-4 w-4 text-green-500" />
                <span>Configure AI Agents</span>
              </a>
              <a
                href="/calls"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <PhoneCall className="h-4 w-4 text-purple-500" />
                <span>Make a Call</span>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Retell AI integration settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">API Status</p>
                    <p className="text-sm text-muted-foreground">
                      {loading ? "Checking..." : "Connected"}
                    </p>
                  </div>
                  <div className={`h-3 w-3 rounded-full ${loading ? "bg-yellow-500" : "bg-green-500"}`} />
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-medium">Base URL</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    https://api.retellai.com
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
