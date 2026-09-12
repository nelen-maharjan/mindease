"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { RefreshCw, CheckCircle2, X, Sparkles, HeartPulse, BookOpen, Smile, AlertCircle } from "lucide-react";
import type { Recommendation } from "@/types";

const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  BREATHING: { icon: "🫁", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
  MEDITATION: { icon: "🧘", color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40" },
  JOURNALING_PROMPT: { icon: "📔", color: "text-pink-700 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-950/40" },
  WALKING: { icon: "🚶", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  MUSIC: { icon: "🎵", color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
  SLEEP_TIP: { icon: "😴", color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40" },
  HYDRATION: { icon: "💧", color: "text-sky-700 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/40" },
  EXERCISE: { icon: "🏃", color: "text-teal-700 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/40" },
  SOCIAL: { icon: "🤝", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
  GRATITUDE: { icon: "🙏", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40" },
};

interface APIResponse {
  data: (Recommendation & { isStarter?: boolean })[];
  isNewUser?: boolean;
  lastMood?: { mood: string; loggedAt: string; notes?: string | null } | null;
}

export default function RecommendationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery<APIResponse>({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const r = await fetch("/api/recommendations");
      if (!r.ok) throw new Error("Failed to load recommendations");
      return r.json();
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      if (!r.ok) throw new Error("Failed to refresh");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      toast({ title: "Recommendations refreshed!", type: "success" });
    },
    onError: () => {
      toast({ title: "Could not refresh recommendations", type: "error" });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/recommendations/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to dismiss");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      toast({ title: "Recommendation dismissed", type: "info" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => {
      const r = await fetch(`/api/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !isRead }),
      });
      if (!r.ok) throw new Error("Failed to update");
      return r.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      toast({
        title: vars.isRead ? "Marked as incomplete" : "Completed! Great job 🎉",
        type: "success",
      });
    },
  });

  const recommendations = data?.data || [];
  const isNewUser = Boolean(data?.isNewUser);
  const lastMood = data?.lastMood;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="size-6 text-emerald-600 dark:text-emerald-400" />
            Recommendations
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Personalized wellness suggestions based on your recent mood and journals
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending || isFetching}
          className="rounded-xl border-border/80 self-start sm:self-auto shrink-0"
        >
          <RefreshCw className={`size-3.5 mr-1.5 ${refreshMutation.isPending || isFetching ? "animate-spin" : ""}`} />
          Refresh Suggestions
        </Button>
      </div>

      {/* New User Onboarding Banner */}
      {isNewUser && (
        <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <HeartPulse className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Welcome to MindEase Recommendations!</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You haven&apos;t logged any mood or journal entries yet. Below are a few general starter tips.
                  Log your first mood to unlock personalized AI suggestions tailored specifically for you!
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link href="/mood">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs">
                  <Smile className="size-3.5 mr-1.5" /> Log Your Mood Now
                </Button>
              </Link>
              <Link href="/journal">
                <Button size="sm" variant="outline" className="rounded-xl text-xs">
                  <BookOpen className="size-3.5 mr-1.5" /> Write Journal Entry
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Mood Badge Header if user has a logged mood */}
      {!isNewUser && lastMood && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Current Context:</span>
          <span>Logged mood: <strong className="capitalize text-foreground">{lastMood.mood.toLowerCase()}</strong></span>
          <span className="text-muted-foreground/40">•</span>
          <span>Recommendations are tailored for this state</span>
        </div>
      )}

      {/* Recommendation List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="text-center py-14 space-y-3">
            <p className="text-4xl">✨</p>
            <p className="text-sm font-semibold">All clear!</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You&apos;ve completed or dismissed all current recommendations. Click &quot;Refresh Suggestions&quot; above to generate new ones.
            </p>
            <Button
              size="sm"
              onClick={() => refreshMutation.mutate()}
              isLoading={refreshMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs mt-2"
            >
              Generate New Suggestions
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const meta = TYPE_META[rec.type] || { icon: "💡", color: "text-gray-700", bg: "bg-gray-50" };
            const isCompleted = rec.isRead;

            return (
              <Card
                key={rec.id}
                className={`rounded-2xl border transition-all ${
                  isCompleted
                    ? "opacity-60 bg-muted/20 border-border/40"
                    : "border-border/80 hover:shadow-md bg-card"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${meta.bg}`}>
                      {meta.icon}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-semibold truncate ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {rec.title}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[10px] capitalize font-medium rounded-lg px-2 py-0.5">
                            {rec.type.replace("_", " ").toLowerCase()}
                          </Badge>

                          {/* Complete button */}
                          {!rec.isStarter && (
                            <button
                              type="button"
                              onClick={() => completeMutation.mutate({ id: rec.id, isRead: Boolean(rec.isRead) })}
                              className={`p-1 rounded-lg transition-colors ${
                                isCompleted
                                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                              title={isCompleted ? "Mark incomplete" : "Mark completed"}
                            >
                              <CheckCircle2 className="size-4" />
                            </button>
                          )}

                          {/* Dismiss button */}
                          {!rec.isStarter && (
                            <button
                              type="button"
                              onClick={() => dismissMutation.mutate(rec.id)}
                              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              title="Dismiss suggestion"
                            >
                              <X className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>

                      {rec.reason && (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2 font-medium flex items-center gap-1">
                          <span>💡</span> {rec.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Footer advice */}
      <div className="rounded-2xl border bg-muted/20 p-4 text-center">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Recommendations adapt dynamically to your mood logs, journal reflections, and personal habits.
          They are wellness suggestions and not professional medical advice.
        </p>
      </div>
    </div>
  );
}
