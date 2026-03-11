"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PhoneCall, Plus, Trash2, RefreshCw, Phone, Video, ExternalLink, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Call, CreatePhoneCallRequest, CreateWebCallRequest } from "@/lib/retell-types";

interface CallsPageProps {
  params: Promise<{ locale: string }>;
}

export default function CallsPage({ params }: CallsPageProps) {
  const [locale, setLocale] = useState<string>("zh");
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [callType, setCallType] = useState<"phone" | "web">("phone");
  const [formData, setFormData] = useState({
    from_number: "",
    to_number: "",
    agent_id: "",
    metadata: {},
  });

  const t = useTranslations("calls");
  const tCommon = useTranslations("common");

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calls");
      const data = await res.json();
      setCalls(data.data || []);
    } catch (error) {
      console.error("Error fetching calls:", error);
      toast.error(tCommon("error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const handleCreateCall = async () => {
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          call_type: callType === "web" ? "web_call" : "phone_call",
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || tCommon("error"));
      }
      
      toast.success(tCommon("success"));
      setCreateDialogOpen(false);
      setFormData({ from_number: "", to_number: "", agent_id: "", metadata: {} });
      fetchCalls();
    } catch (error) {
      console.error("Error creating call:", error);
      toast.error(error instanceof Error ? error.message : tCommon("error"));
    }
  };

  const handleDeleteCall = async (callId: string) => {
    try {
      const res = await fetch(`/api/calls/${callId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || tCommon("error"));
      }
      
      toast.success(tCommon("success"));
      fetchCalls();
    } catch (error) {
      console.error("Error deleting call:", error);
      toast.error(error instanceof Error ? error.message : tCommon("error"));
    }
  };

  const getStatusBadge = (status?: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      registered: "secondary",
      ongoing: "default",
      ended: "outline",
      error: "destructive",
    };
    return <Badge variant={variants[status || "registered"]}>{status || "unknown"}</Badge>;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "N/A";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchCalls} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {tCommon("refresh")}
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("newCall")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("createCall")}</DialogTitle>
                  <DialogDescription>{t("createCallDesc")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Tabs value={callType} onValueChange={(v) => setCallType(v as "phone" | "web")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="phone">
                        <Phone className="h-4 w-4 mr-2" />
                        {t("phoneCall")}
                      </TabsTrigger>
                      <TabsTrigger value="web">
                        <Video className="h-4 w-4 mr-2" />
                        {t("webCall")}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="phone" className="space-y-4 mt-4">
                      <div className="grid gap-2">
                        <Label htmlFor="from_number">{t("fromNumber")} *</Label>
                        <Input
                          id="from_number"
                          placeholder="+1234567890"
                          value={formData.from_number}
                          onChange={(e) => setFormData({ ...formData, from_number: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="to_number">{t("toNumber")} *</Label>
                        <Input
                          id="to_number"
                          placeholder="+0987654321"
                          value={formData.to_number}
                          onChange={(e) => setFormData({ ...formData, to_number: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="agent_id_call">{tCommon("agentId")} *</Label>
                        <Input
                          id="agent_id_call"
                          placeholder="agent_xxx"
                          value={formData.agent_id}
                          onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="web" className="space-y-4 mt-4">
                      <div className="grid gap-2">
                        <Label htmlFor="agent_id_web">{tCommon("agentId")} *</Label>
                        <Input
                          id="agent_id_web"
                          placeholder="agent_xxx"
                          value={formData.agent_id}
                          onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">{t("webCallDesc")}</p>
                    </TabsContent>
                  </Tabs>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    {tCommon("cancel")}
                  </Button>
                  <Button onClick={handleCreateCall}>
                    {callType === "phone" ? t("startCall") : t("createWebCall")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("allCalls")}</CardTitle>
            <CardDescription>{t("allCallsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <PhoneCall className="h-12 w-12 mb-4" />
                <p>{tCommon("noData")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {calls.map((call) => (
                  <div
                    key={call.call_id}
                    className="flex items-start justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-start gap-4">
                      {call.call_type === "phone_call" ? (
                        <Phone className="h-5 w-5 text-muted-foreground mt-1" />
                      ) : (
                        <Video className="h-5 w-5 text-muted-foreground mt-1" />
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{call.call_id}</p>
                          {getStatusBadge(call.call_status)}
                          <Badge variant="outline">{call.call_direction || t("outbound")}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {call.from_number && <span>{t("fromNumber")}: {call.from_number}</span>}
                          {call.to_number && <span>{t("toNumber")}: {call.to_number}</span>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(call.started_at)}
                          </span>
                          <span>{t("duration")}: {formatDuration(call.duration_ms)}</span>
                        </div>
                        {call.agent_id && (
                          <Badge variant="secondary" className="mt-1">
                            Agent: {call.agent_id}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {call.recording_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={call.recording_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{tCommon("delete")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {tCommon("confirm")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCall(call.call_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {tCommon("delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
