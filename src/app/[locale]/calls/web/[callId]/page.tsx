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

type CallStatus = "ready" | "connecting" | "connected" | "ended" | "error";
type AgentStatus = "idle" | "listening" | "speaking";

interface WebCallPageProps {
  params: Promise<{ locale: string; callId: string }>;
}

interface RetellWebClient {
  on(event: string, callback: (data?: unknown) => void): void;
  startCall(options: { accessToken: string; emitRawAudioSamples?: boolean }): Promise<void>;
  stopCall(): void;
  mute(): void;
  unmute(): void;
  startAudioPlayback?(): Promise<void>;
}

// Declare global types for SDK
declare global {
  interface Window {
    livekitClient?: {
      Room: new (options?: unknown) => unknown;
      RoomEvent: Record<string, string>;
      Track: { Kind: { Audio: string } };
      createAudioAnalyser: (track: unknown) => { analyser: AnalyserNode; cleanup: () => void };
    };
    eventemitter3?: new () => unknown;
    retellClientJsSdk?: {
      RetellWebClient: new () => RetellWebClient;
    };
  }
}

export default function WebCallPage({ params }: WebCallPageProps) {
  const [locale, setLocale] = useState<string>("zh");
  const [callId, setCallId] = useState<string>("");
  const [callStatus, setCallStatus] = useState<CallStatus>("ready");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  const clientRef = useRef<RetellWebClient | null>(null);
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

  // Load SDK dynamically via script injection
  useEffect(() => {
    if (!isClient || sdkLoaded) return;

    const loadScript = (src: string, globalName: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        const globalWindow = window as unknown as Record<string, unknown>;
        if (globalWindow[globalName]) {
          resolve();
          return;
        }
        
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    const loadSDK = async () => {
      try {
        console.log("Loading SDK dependencies...");
        
        // Load dependencies in order
        await loadScript(
          "https://cdn.jsdelivr.net/npm/livekit-client@2.5.2/dist/livekit-client.umd.js",
          "livekitClient"
        );
        console.log("LiveKit loaded");
        
        await loadScript(
          "https://cdn.jsdelivr.net/npm/eventemitter3@5.0.1/umd/eventemitter3.min.js",
          "eventemitter3"
        );
        console.log("EventEmitter3 loaded");
        
        await loadScript(
          "https://unpkg.com/retell-client-js-sdk@2.0.7/dist/index.umd.js",
          "retellClientJsSdk"
        );
        console.log("Retell SDK loaded");
        
        // Verify SDK is available
        if (window.retellClientJsSdk?.RetellWebClient) {
          console.log("RetellWebClient is available");
          setSdkLoaded(true);
        } else {
          throw new Error("RetellWebClient not found after loading SDK");
        }
      } catch (err) {
        console.error("Failed to load SDK:", err);
        setError("SDK 加载失败，请刷新页面重试");
        setCallStatus("error");
      }
    };

    loadSDK();
  }, [isClient, sdkLoaded]);

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

  // Request microphone permission and start call
  const handleStartCall = useCallback(async () => {
    if (!accessToken) {
      setError("缺少访问令牌");
      setCallStatus("error");
      return;
    }

    if (!sdkLoaded || !window.retellClientJsSdk?.RetellWebClient) {
      setError("SDK 未加载完成，请稍后重试");
      setCallStatus("error");
      return;
    }

    setCallStatus("connecting");
    setError(null);

    try {
      // Request microphone permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (permError) {
        console.error("Microphone permission denied:", permError);
        setError("麦克风权限被拒绝，请在浏览器设置中允许访问麦克风");
        setCallStatus("error");
        return;
      }

      // Create RetellWebClient instance
      const client = new window.retellClientJsSdk!.RetellWebClient();
      clientRef.current = client;

      // Set up event handlers
      client.on("call_started", () => {
        console.log("Call started");
        setCallStatus("connected");
        startDurationTimer();
        toast.success(t("connected"));
      });

      client.on("call_ready", () => {
        console.log("Call ready");
        client.startAudioPlayback?.();
      });

      client.on("call_ended", () => {
        console.log("Call ended");
        setCallStatus("ended");
        stopDurationTimer();
        clientRef.current = null;
      });

      client.on("error", (err: unknown) => {
        console.error("Call error:", err);
        const errorMsg = typeof err === 'string' ? err : "通话发生错误";
        setError(errorMsg);
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
      const errorMessage = err instanceof Error ? err.message : "初始化通话失败";
      setError(errorMessage);
      setCallStatus("error");
    }
  }, [accessToken, sdkLoaded, t]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stopCall();
        clientRef.current = null;
      }
      stopDurationTimer();
    };
  }, []);

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
      case "ready": return "text-blue-500";
      case "connecting": return "text-yellow-500";
      case "connected": return "text-green-500";
      case "ended": return "text-gray-500";
      case "error": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case "ready": return t("ready");
      case "connecting": return t("connecting");
      case "connected": return t("connected");
      case "ended": return t("ended");
      case "error": return t("error");
      default: return "";
    }
  };

  const getAgentStatusText = () => {
    switch (agentStatus) {
      case "idle": return t("agentIdle");
      case "listening": return t("agentListening");
      case "speaking": return t("agentSpeaking");
      default: return "";
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
                {(callStatus === "connecting" || !sdkLoaded) && (
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                )}
                {!sdkLoaded && callStatus === "ready" ? "Loading SDK..." : getStatusText()}
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
              {callStatus === "ready" && accessToken && sdkLoaded && (
                <Button size="lg" onClick={handleStartCall} className="px-8">
                  <Phone className="h-5 w-5 mr-2" />
                  {t("startCall")}
                </Button>
              )}

              {callStatus === "connected" && (
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    className={`rounded-full h-16 w-16 ${isMuted ? "bg-destructive/10" : ""}`}
                    onClick={handleMute}
                  >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
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
            {callStatus === "ready" && sdkLoaded && (
              <div className="text-sm text-muted-foreground text-center">
                {t("readyTip")}
              </div>
            )}
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
