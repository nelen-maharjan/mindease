"use client";

import { MOOD_CONFIG } from "@/lib/utils";
import type { MoodType } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Progress, Badge } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Props {
  userName: string;
  wellnessScore: number;
  journalStreak: number;
  habitsCompletedToday: number;
  totalHabits: number;
  latestMood: { mood: string; intensity: number; loggedAt: string } | null;
  recentMoods: Array<{ id: string; mood: string; intensity: number; loggedAt: string; tags: string[] }>;
  recentJournals: Array<{ id: string; title: string; createdAt: string; moodSnapshot?: string | null; tags: string[] }>;
  habits: Array<{ id: string; name: string; emoji?: string | null; streakCount: number; logs: Array<{ completedAt: string }> }>;
  insights: Array<{ id: string; content: string; category: string; createdAt: string }>;
}

const insightIcons: Record<string, string> = {
  mood_trend: "📈",
  habit_pattern: "🔄",
  journal_reflection: "✨",
};

export function DashboardClient({
  userName, wellnessScore, journalStreak, habitsCompletedToday, totalHabits,
  latestMood, recentMoods, recentJournals, habits, insights,
}: Props) {
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Build 7-day mood chart data
  const moodChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = format(d, "yyyy-MM-dd");
    const logsForDay = recentMoods.filter((m) => format(new Date(m.loggedAt), "yyyy-MM-dd") === key);
    const avgScore = logsForDay.length
      ? logsForDay.reduce((a, m) => a + (MOOD_CONFIG[m.mood as MoodType]?.intensity ?? 5), 0) / logsForDay.length
      : null;
    return { day: format(d, "EEE"), score: avgScore };
  });

  const latestMoodConfig = latestMood ? MOOD_CONFIG[latestMood.mood as MoodType] : null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, {userName} ✨
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/mood">Log mood</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/journal">New entry</Link>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Today's mood"
          value={latestMoodConfig?.emoji || "—"}
          sub={latestMoodConfig?.label || "Not logged"}
          color="bg-indigo-50 dark:bg-indigo-950/30"
        />
        <StatCard
          label="Journal streak"
          value={`${journalStreak}`}
          sub="days"
          color="bg-teal-50 dark:bg-teal-950/30"
        />
        <StatCard
          label="Wellness score"
          value={`${wellnessScore}`}
          sub="out of 100"
          color="bg-violet-50 dark:bg-violet-950/30"
        />
        <StatCard
          label="Habits today"
          value={`${habitsCompletedToday}/${totalHabits}`}
          sub="completed"
          color="bg-amber-50 dark:bg-amber-950/30"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mood trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Mood this week</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={moodChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [v != null ? `${Number(v).toFixed(1)}/10` : "No data", "Mood"]}
                />
                <Line
                  type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2}
                  dot={{ fill: "#6366f1", r: 3, strokeWidth: 0 }}
                  connectNulls activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Wellness score ring */}
        <Card>
          <CardHeader><CardTitle>Wellness score</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center pt-2">
            <div className="relative w-28 h-28 mb-3">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                <circle
                  cx="50" cy="50" r="40" fill="none" stroke="url(#scoreGrad)" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40 * wellnessScore / 100} ${2 * Math.PI * 40 * (1 - wellnessScore / 100)}`}
                  className="transition-all duration-700"
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{wellnessScore}</span>
                <span className="text-[10px] text-muted-foreground">/ 100</span>
              </div>
            </div>
            <Progress value={wellnessScore} className="h-1.5 w-full" indicatorClassName="bg-gradient-to-r from-indigo-500 to-teal-500" />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Based on mood, journaling & habits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent journals */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Recent journals</CardTitle>
            <Link href="/journal" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {recentJournals.length === 0 ? (
              <EmptyState text="No journal entries yet" action={{ label: "Write first entry", href: "/journal" }} />
            ) : (
              recentJournals.slice(0, 4).map((j) => (
                <Link key={j.id} href={`/journal/${j.id}`}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                  <span className="text-lg mt-0.5">{j.moodSnapshot ? MOOD_CONFIG[j.moodSnapshot as MoodType]?.emoji : "📝"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{j.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(j.createdAt), { addSuffix: true })}</p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Habits today */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Habits today</CardTitle>
            <Link href="/habits" className="text-xs text-primary hover:underline">Manage</Link>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {habits.length === 0 ? (
              <EmptyState text="No habits set up" action={{ label: "Add habit", href: "/habits" }} />
            ) : (
              habits.slice(0, 5).map((h) => {
                const doneToday = h.logs.some((l) => format(new Date(l.completedAt), "yyyy-MM-dd") === todayStr);
                return (
                  <div key={h.id} className="flex items-center gap-2.5 py-1.5">
                    <span className="text-base w-6 text-center">{h.emoji || "⬡"}</span>
                    <span className="text-sm flex-1 truncate">{h.name}</span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all ${doneToday ? "bg-green-100 text-green-700" : "border border-border"}`}>
                      {doneToday && "✓"}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>AI insights</CardTitle>
            <Link href="/analytics" className="text-xs text-primary hover:underline">Analytics</Link>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Log mood and journal entries to generate insights.
              </p>
            ) : (
              insights.map((insight) => (
                <div key={insight.id} className="flex gap-2.5 items-start">
                  <span className="text-base mt-0.5">{insightIcons[insight.category] || "💡"}</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.content}</p>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" className="w-full mt-2 text-xs" asChild>
              <Link href="/analytics">View full analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color} border border-border/50`}>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function EmptyState({ text, action }: { text: string; action?: { label: string; href: string } }) {
  return (
    <div className="text-center py-6">
      <p className="text-sm text-muted-foreground mb-2">{text}</p>
      {action && (
        <Button variant="outline" size="sm" asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
