"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";

type CallStatus = "connecting" | "connected" | "ended" | "error";
type AgentStatus = "idle" | "listening" | "speaking";

interface WebCallPageProps {
  params: Promise<{ locale: string; callId: string }>;
}

export default function WebCallPage({ params }: WebCallPageProps) {
  const [locale, setLocale] = useState<string>("zh");
  const [callId, setCallId] = useState<string>("");
  const [callStatus, setCallStatus] = useState<CallStatus>("connecting");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const t = useTranslations("webCall");
  const tCommon = useTranslations("common");

  // Mark as client-side and get params
  useEffect(() => {
    setIsClient(true);
    params.then((p) => {
      setLocale(p.locale);
      setCallId(p.callId);
    });
  }, [params]);

  // Get access token from URL params
  useEffect(() => {
    if (!isClient) return;
    
    const token = searchParams.get("token");
    if (token) {
      setAccessToken(token);
    } else {
      setError("缺少访问令牌，请从通话管理页面重新发起");
      setCallStatus("error");
    }
  }, [searchParams, isClient]);

  // Initialize Retell client when we have a token
  const initCall = useCallback(async () => {
    if (!accessToken || !isClient) return;

    try {
      // Dynamic import for browser-only SDK
      const { RetellWebClient } = await import("retell-client-js-sdk");
      const client = new RetellWebClient();
      clientRef.current = client;

      // Set up event handlers
      client.on("call_started", () => {
        console.log("Call started");
        setCallStatus("connected");
        startDurationTimer();
      });

      client.on("call_ready", () => {
        console.log("Call ready - agent audio prepared");
        // Start audio playback for browsers that require user interaction
        client.startAudioPlayback?.();
      });

      client.on("call_ended", () => {
        console.log("Call ended");
        setCallStatus("ended");
        stopDurationTimer();
      });

      client.on("error", (err: string) => {
        console.error("Call error:", err);
        setError(err || "通话发生错误");
        setCallStatus("error");
        stopDurationTimer();
      });

      client.on("agent_start_talking", () => {
        setAgentStatus("speaking");
      });

      client.on("agent_stop_talking", () => {
        setAgentStatus("listening");
      });

      client.on("update", (update: unknown) => {
        console.log("Update:", update);
      });

      // Start the call
      await client.startCall({
        accessToken,
        emitRawAudioSamples: false,
      });

    } catch (err) {
      console.error("Error initializing call:", err);
      setError("初始化通话失败，请检查网络连接和麦克风权限");
      setCallStatus("error");
    }
  }, [accessToken, isClient]);

  useEffect(() => {
    if (accessToken && isClient) {
      initCall();
    }

    return () => {
      // Cleanup on unmount
      if (clientRef.current) {
        clientRef.current.stopCall();
        clientRef.current = null;
      }
      stopDurationTimer();
    };
  }, [accessToken, isClient, initCall]);

  const startDurationTimer = () => {
    if (durationIntervalRef.current) return;
    durationIntervalRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const handleMute = () => {
    if (!clientRef.current) return;
    if (isMuted) {
      clientRef.current.unmute();
      setIsMuted(false);
    } else {
      clientRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleEndCall = () => {
    if (clientRef.current) {
      clientRef.current.stopCall();
      clientRef.current = null;
    }
    stopDurationTimer();
    setCallStatus("ended");
  };

  const handleBack = () => {
    router.push(`/${locale}/calls`);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case "connecting":
        return "text-yellow-500";
      case "connected":
        return "text-green-500";
      case "ended":
        return "text-gray-500";
      case "error":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case "connecting":
        return t("connecting");
      case "connected":
        return t("connected");
      case "ended":
        return t("ended");
      case "error":
        return t("error");
      default:
        return "";
    }
  };

  const getAgentStatusText = () => {
    switch (agentStatus) {
      case "idle":
        return t("agentIdle");
      case "listening":
        return t("agentListening");
      case "speaking":
        return t("agentSpeaking");
      default:
        return "";
    }
  };

  return (
    <DashboardLayout locale={locale}>
      <div className="min-h-[80vh] flex items-center justify-center">
        <Card className="w-full max-w-md p-8 shadow-xl">
          <div className="flex flex-col items-center space-y-8">
            {/* Status */}
            <div className="text-center space-y-2">
              <div className={`text-lg font-medium ${getStatusColor()}`}>
                {callStatus === "connecting" && (
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                )}
                {getStatusText()}
              </div>
              {callStatus === "connected" && (
                <div className="text-4xl font-mono font-bold text-foreground">
                  {formatDuration(duration)}
                </div>
              )}
            </div>

            {/* Agent Avatar */}
            <div className="relative">
              <div
                className={`w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center transition-all duration-300 ${
                  agentStatus === "speaking"
                    ? "ring-4 ring-primary/30 scale-105"
                    : agentStatus === "listening"
                    ? "ring-2 ring-primary/20"
                    : ""
                }`}
              >
                <Volume2
                  className={`h-12 w-12 text-primary ${
                    agentStatus === "speaking" ? "animate-pulse" : ""
                  }`}
                />
              </div>
              {callStatus === "connected" && (
                <Badge
                  variant={agentStatus === "speaking" ? "default" : "secondary"}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                >
                  {getAgentStatusText()}
                </Badge>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-lg w-full">
                {error}
              </div>
            )}

            {/* Call ID */}
            <div className="text-xs text-muted-foreground font-mono">
              {t("callId")}: {callId.slice(0, 20)}...
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6">
              {callStatus === "connected" && (
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    className={`rounded-full h-16 w-16 ${
                      isMuted ? "bg-destructive/10" : ""
                    }`}
                    onClick={handleMute}
                  >
                    {isMuted ? (
                      <MicOff className="h-6 w-6" />
                    ) : (
                      <Mic className="h-6 w-6" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="rounded-full h-16 w-16"
                    onClick={handleEndCall}
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                </>
              )}
              {(callStatus === "ended" || callStatus === "error") && (
                <Button onClick={handleBack}>
                  <Phone className="h-4 w-4 mr-2" />
                  {t("backToCalls")}
                </Button>
              )}
            </div>

            {/* Mute Status */}
            {callStatus === "connected" && isMuted && (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <MicOff className="h-4 w-4" />
                {t("muted")}
              </div>
            )}

            {/* Tips */}
            {callStatus === "connecting" && (
              <div className="text-sm text-muted-foreground text-center">
                {t("connectingTip")}
              </div>
            )}
            {callStatus === "connected" && (
              <div className="text-sm text-muted-foreground text-center">
                {t("connectedTip")}
              </div>
            )}
            {callStatus === "ended" && (
              <div className="text-sm text-muted-foreground text-center">
                {t("endedTip", { duration: formatDuration(duration) })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
