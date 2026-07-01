"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Badge, Skeleton } from "@/components/ui/index";
import type { Recommendation } from "@/types";

const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  BREATHING:        { icon: "🫁", color: "text-blue-700", bg: "bg-blue-50 dark:bg-blue-950/30" },
  MEDITATION:       { icon: "🧘", color: "text-purple-700", bg: "bg-purple-50 dark:bg-purple-950/30" },
  JOURNALING_PROMPT:{ icon: "📔", color: "text-pink-700", bg: "bg-pink-50 dark:bg-pink-950/30" },
  WALKING:          { icon: "🚶", color: "text-green-700", bg: "bg-green-50 dark:bg-green-950/30" },
  MUSIC:            { icon: "🎵", color: "text-indigo-700", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  SLEEP_TIP:        { icon: "😴", color: "text-violet-700", bg: "bg-violet-50 dark:bg-violet-950/30" },
  HYDRATION:        { icon: "💧", color: "text-sky-700", bg: "bg-sky-50 dark:bg-sky-950/30" },
  EXERCISE:         { icon: "🏃", color: "text-teal-700", bg: "bg-teal-50 dark:bg-teal-950/30" },
  SOCIAL:           { icon: "🤝", color: "text-amber-700", bg: "bg-amber-50 dark:bg-amber-950/30" },
  GRATITUDE:        { icon: "🙏", color: "text-rose-700", bg: "bg-rose-50 dark:bg-rose-950/30" },
};

export default function RecommendationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const r = await fetch("/api/recommendations");
      return r.json();
    },
  });

  const recommendations: Recommendation[] = data?.data || [];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recommendations</h1>
        <p className="text-muted-foreground text-sm mt-1">Personalized suggestions based on your mood and activity</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : recommendations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-14">
            <p className="text-4xl mb-3">✨</p>
            <p className="text-sm font-medium mb-1">No recommendations yet</p>
            <p className="text-xs text-muted-foreground">Log your mood to get personalized suggestions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const meta = TYPE_META[rec.type] || { icon: "💡", color: "text-gray-700", bg: "bg-gray-50" };
            return (
              <Card key={rec.id} className="hover:shadow-md transition-all">
                <CardContent className="pt-4 pb-4">
                  <div className="flex gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 ${meta.bg}`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{rec.title}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">{rec.type.replace("_", " ").toLowerCase()}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">{rec.description}</p>
                      {rec.reason && (
                        <p className="text-[10px] text-muted-foreground mt-2 italic">💡 {rec.reason}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border bg-muted/30 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Recommendations are personalized based on your recent mood logs, journaling patterns, and habits.
          They are wellness suggestions — not medical advice.
        </p>
      </div>
    </div>
  );
}
