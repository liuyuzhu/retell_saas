"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mic, RefreshCw, Volume2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Voice } from "@/lib/retell-types";

interface VoicesPageProps {
  params: Promise<{ locale: string }>;
}

export default function VoicesPage({ params }: VoicesPageProps) {
  const [locale, setLocale] = useState<string>("zh");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);

  const t = useTranslations("voices");
  const tCommon = useTranslations("common");

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const fetchVoices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/voices");
      const data = await res.json();
      setVoices(data.data || []);
    } catch (error) {
      console.error("Error fetching voices:", error);
      toast.error(tCommon("error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoices();
  }, []);

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <Button variant="outline" onClick={fetchVoices} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {tCommon("refresh")}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("availableVoices")}</CardTitle>
            <CardDescription>{t("availableVoicesDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : voices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Mic className="h-12 w-12 mb-4" />
                <p>{tCommon("noData")}</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {voices.map((voice) => (
                  <div
                    key={voice.voice_id}
                    className="rounded-lg border p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{voice.voice_name}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {voice.voice_id}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {voice.voice_description && (
                        <p className="text-sm text-muted-foreground">
                          {voice.voice_description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {voice.language && (
                          <Badge variant="outline">{voice.language}</Badge>
                        )}
                        {voice.gender && (
                          <Badge variant="secondary">{voice.gender}</Badge>
                        )}
                        {voice.accent && (
                          <Badge variant="secondary">{voice.accent}</Badge>
                        )}
                        {voice.provider && (
                          <Badge>{voice.provider}</Badge>
                        )}
                      </div>
                      {voice.sample_audio_url && (
                        <Button variant="outline" size="sm" className="mt-2" asChild>
                          <a
                            href={voice.sample_audio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Volume2 className="h-4 w-4 mr-2" />
                            {t("listenSample")}
                          </a>
                        </Button>
                      )}
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
