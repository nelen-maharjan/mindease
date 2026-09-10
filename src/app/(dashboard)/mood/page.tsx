"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ACTIVE_MOODS, ACTIVE_MOOD_CONFIG, MOOD_CONFIG } from "@/lib/utils";
import type { ActiveMoodType, MoodType } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/index";
import { useToast } from "@/components/ui/toaster";
import { Sparkles, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2 } from "lucide-react";

const ALL_TAGS = [
  "work", "family", "health", "social", "sleep",
  "exercise", "nature", "food", "travel", "creativity"
];

export default function MoodPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedMood, setSelectedMood] = useState<ActiveMoodType>("GOOD");
  const [intensity, setIntensity] = useState(7);
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mlPrediction, setMlPrediction] = useState<{
    label: string;
    confidence: number;
    mappedMood: ActiveMoodType;
  } | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);

  // 1. Fetch recent mood logs
  const { data: logsData, isLoading: isLogsLoading } = useQuery({
    queryKey: ["moodLogs"],
    queryFn: async () => {
      const r = await fetch("/api/mood?limit=20&days=30");
      return r.json();
    },
  });

  // 2. Fetch ML mood trends & anomaly analysis
  const { data: trendData } = useQuery({
    queryKey: ["moodTrends"],
    queryFn: async () => {
      const r = await fetch("/api/mood/trends?days=30");
      return r.json();
    },
  });

  // 3. Log mood mutation
  const mutation = useMutation({
    mutationFn: async (payload: object) => {
      const r = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Failed to log mood");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moodLogs"] });
      qc.invalidateQueries({ queryKey: ["moodTrends"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      toast({ title: "Mood logged successfully!", type: "success" });
      setNotes("");
      setSelectedTags([]);
      setMlPrediction(null);
    },
    onError: () => toast({ title: "Failed to log mood", type: "error" }),
  });

  const logs = logsData?.data || [];
  const trends = trendData?.data;
  const cfg = ACTIVE_MOOD_CONFIG[selectedMood] || MOOD_CONFIG[selectedMood as MoodType];

  const handleMoodSelect = (mood: ActiveMoodType) => {
    setSelectedMood(mood);
    setIntensity(ACTIVE_MOOD_CONFIG[mood].defaultIntensity);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // ML Live Classification from user notes
  const handleAnalyzeNotes = async () => {
    if (!notes.trim()) {
      toast({ title: "Please type some notes first", type: "info" });
      return;
    }

    setIsClassifying(true);
    try {
      const res = await fetch("/api/mood/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.data) {
        throw new Error(data.error || "Failed to analyze mood");
      }
      setMlPrediction(data.data);
      toast({
        title: `ML detected: ${data.data.label} (${Math.round(data.data.confidence * 100)}% confidence)`,
        type: "info",
      });
    } catch {
      toast({ title: "Could not connect to ML service", type: "error" });
    } finally {
      setIsClassifying(false);
    }
  };

  const applyPrediction = () => {
    if (!mlPrediction) return;
    handleMoodSelect(mlPrediction.mappedMood);
    toast({
      title: `Applied ${ACTIVE_MOOD_CONFIG[mlPrediction.mappedMood].label} mood from ML analysis!`,
      type: "success",
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mood tracker</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Check in with yourself and track emotional patterns over time
        </p>
      </div>

      {/* ML Trend & Anomaly Alerts Banner */}
      {trends?.hasEnoughData && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-card to-background">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  {trends.trend_direction === "improving" ? (
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  ) : trends.trend_direction === "declining" ? (
                    <TrendingDown className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Minus className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      ML Mood Trend:{" "}
                      <span className="capitalize">{trends.trend_direction}</span>
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {trends.change_percent > 0 ? `+${trends.change_percent}%` : `${trends.change_percent}%`}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Weekly average: <span className="font-medium">{trends.weekly_average}/10</span> · Dominant emotion:{" "}
                    <span className="capitalize font-medium">{trends.dominant_mood}</span>
                  </p>
                </div>
              </div>

              {trends.anomalies?.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/40">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Unusual mood pattern flagged on {trends.anomalies[0]}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mood Entry Form */}
      <Card>
        <CardContent className="pt-5 space-y-6">
          {/* 4 Core Mood Options */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">How are you feeling right now?</p>
              <span className="text-xs text-muted-foreground">Select one of 4 core emotions</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ACTIVE_MOODS.map((key) => {
                const item = ACTIVE_MOOD_CONFIG[key];
                const isSelected = selectedMood === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleMoodSelect(key)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer text-center ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm scale-[1.02]"
                        : "border-transparent bg-muted/40 hover:bg-muted/70 hover:scale-[1.01]"
                    }`}
                  >
                    <span className="text-3xl mb-1.5">{item.emoji}</span>
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intensity Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Intensity</p>
              <span className="text-sm font-bold text-primary">{intensity}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-primary h-2 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Mild</span>
              <span>Moderate</span>
              <span>Intense</span>
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-sm font-medium mb-2">Context tags</p>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    selectedTags.includes(tag)
                      ? "bg-primary/15 text-primary border-primary/40 font-semibold"
                      : "bg-muted/40 text-muted-foreground border-transparent hover:border-border"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Notes with ML Prediction Integration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Notes & reflections (optional)</p>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleAnalyzeNotes}
                isLoading={isClassifying}
                disabled={!notes.trim()}
                className="text-xs"
              >
                <Sparkles className="h-3 w-3 mr-1 text-primary" />
                AI Mood Detect
              </Button>
            </div>
            <Textarea
              placeholder="What's on your mind? Describe your day, thoughts, or feelings..."
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (mlPrediction) setMlPrediction(null);
              }}
              rows={3}
            />

            {/* ML Prediction Badge / Quick Apply */}
            {mlPrediction && (
              <div className="mt-2 p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    ML Logistic Regression detected:{" "}
                    <strong className="capitalize text-primary">{mlPrediction.label}</strong> (
                    {Math.round(mlPrediction.confidence * 100)}% confidence)
                  </span>
                </div>
                <Button
                  type="button"
                  size="xs"
                  variant="default"
                  onClick={applyPrediction}
                  className="shrink-0 text-xs"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Apply {ACTIVE_MOOD_CONFIG[mlPrediction.mappedMood]?.label}
                </Button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            className="w-full text-sm font-medium"
            onClick={() =>
              mutation.mutate({
                mood: selectedMood,
                intensity,
                notes: notes.trim() || undefined,
                tags: selectedTags,
              })
            }
            isLoading={mutation.isPending}
          >
            <span className="mr-1.5 text-lg">{cfg.emoji}</span> Log {cfg.label} mood
          </Button>
        </CardContent>
      </Card>

      {/* Recent logs */}
      <div>
        <h2 className="text-base font-semibold mb-3">Recent mood entries</h2>
        {isLogsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-10 text-muted-foreground">
              <p className="text-3xl mb-2">🌿</p>
              <p className="text-sm">No mood logs yet. Track your first mood above!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map(
              (log: {
                id: string;
                mood: string;
                intensity: number;
                notes?: string;
                tags: string[];
                loggedAt: string;
              }) => {
                const c =
                  ACTIVE_MOOD_CONFIG[log.mood as ActiveMoodType] ||
                  MOOD_CONFIG[log.mood as MoodType] || {
                    emoji: "🙂",
                    label: log.mood,
                    color: "#888",
                  };
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-3.5 rounded-xl border bg-card hover:bg-muted/20 transition-colors"
                  >
                    <span className="text-2xl">{c.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.label}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {log.intensity}/10
                        </Badge>
                        {log.tags.slice(0, 3).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                      {log.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.notes}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(log.loggedAt), { addSuffix: true })}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}
