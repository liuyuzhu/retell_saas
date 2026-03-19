"use client";
import { apiFetch } from "@/lib/api-fetch";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MessageSquare, RefreshCw, Trash2, Clock, User, Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Conversation, TranscriptSegment } from "@/lib/retell-types";

interface ConversationsPageProps {
  params: Promise<{ locale: string }>;
}

export default function ConversationsPage({ params }: ConversationsPageProps) {
  const [locale, setLocale] = useState<string>("zh");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const t = useTranslations("conversations");
  const tCommon = useTranslations("common");

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/conversations");
      const data = await res.json();
      setConversations(data.data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error(tCommon("error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || tCommon("error"));
      }
      
      toast.success(tCommon("success"));
      fetchConversations();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error(error instanceof Error ? error.message : tCommon("error"));
    }
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

  const getSentimentBadge = (sentiment?: string) => {
    if (!sentiment) return null;
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      positive: "default",
      neutral: "secondary",
      negative: "destructive",
    };
    return <Badge variant={variants[sentiment] || "outline"}>{t(sentiment)}</Badge>;
  };

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <Button variant="outline" onClick={fetchConversations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {tCommon("refresh")}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Conversation List */}
          <Card>
            <CardHeader>
              <CardTitle>{t("allConversations")}</CardTitle>
              <CardDescription>{t("allConversationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4" />
                  <p>{tCommon("noData")}</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.conversation_id}
                        className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                          selectedConversation?.conversation_id === conversation.conversation_id
                            ? "border-primary bg-muted"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedConversation(conversation)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{conversation.conversation_id}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDate(conversation.started_at)}
                            </div>
                            <div className="flex items-center gap-2">
                              {conversation.agent_id && (
                                <Badge variant="outline">{conversation.agent_id}</Badge>
                              )}
                              {getSentimentBadge(conversation.sentiment)}
                            </div>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("deleteConfirmDesc")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteConversation(conversation.conversation_id)
                                  }
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {tCommon("delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        {conversation.call_analysis?.call_summary && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {conversation.call_analysis.call_summary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Conversation Detail */}
          <Card>
            <CardHeader>
              <CardTitle>{t("conversationDetails")}</CardTitle>
              <CardDescription>{t("conversationDetailsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedConversation ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">{t("duration")}</p>
                      <p className="font-medium">
                        {formatDuration(selectedConversation.duration_ms)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">{t("sentiment")}</p>
                      <p className="font-medium">
                        {getSentimentBadge(selectedConversation.sentiment) || "N/A"}
                      </p>
                    </div>
                  </div>

                  {selectedConversation.call_analysis?.call_summary && (
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground mb-2">{t("summary")}</p>
                      <p className="text-sm">{selectedConversation.call_analysis.call_summary}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t("transcript")}</p>
                    <ScrollArea className="h-[400px] rounded-lg border p-4">
                      {selectedConversation.transcript && selectedConversation.transcript.length > 0 ? (
                        <div className="space-y-3">
                          {selectedConversation.transcript.map((segment, index) => (
                            <TranscriptMessage key={index} segment={segment} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">{t("noTranscript")}</p>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4" />
                  <p>{t("selectConversation")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Transcript Message Component
function TranscriptMessage({ segment }: { segment: TranscriptSegment }) {
  const isAgent = segment.role === "agent";
  
  return (
    <div className={`flex gap-3 ${isAgent ? "flex-row" : "flex-row-reverse"}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isAgent ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
        }`}
      >
        {isAgent ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className={`flex-1 ${isAgent ? "text-left" : "text-right"}`}>
        <div className={`inline-block rounded-lg p-3 ${isAgent ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
          <p className="text-sm">{segment.content}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(segment.timestamp_ms).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
