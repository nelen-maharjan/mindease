"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Progress } from "@/components/ui/index";
import { MOOD_CONFIG } from "@/lib/utils";
import type { MoodType } from "@/lib/utils";
import { format } from "date-fns";

const MOOD_COLORS = {
  HAPPY: "#1baf7a", GOOD: "#2a78d6", NEUTRAL: "#888780",
  SAD: "#eda100", DEPRESSED: "#e34948", ANGRY: "#d85a30",
  ANXIOUS: "#ba7517", EXHAUSTED: "#534ab7",
};

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const r = await fetch("/api/analytics?days=30");
      return r.json();
    },
  });

  const analytics = data?.data;

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Understand your emotional patterns</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const moodTrend = (analytics?.moodTrend || []).filter((d: { score: number }) => d.score > 0).map((d: { date: string; score: number; mood: string }) => ({
    ...d,
    date: format(new Date(d.date), "MMM d"),
  }));

  const moodDistribution = Object.entries(analytics?.moodDistribution || {}).map(([mood, count]) => ({
    name: MOOD_CONFIG[mood as MoodType]?.label || mood,
    value: count as number,
    color: MOOD_COLORS[mood as MoodType] || "#888",
  }));

  const journalFreq = analytics?.journalFrequency || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Your emotional patterns over the last 30 days</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Wellness score" value={analytics?.wellnessScore || 0} sub="/ 100" color="text-indigo-600" />
        <StatTile label="Journal streak" value={analytics?.currentStreak || 0} sub="days" color="text-teal-600" />
        <StatTile label="Habit completion" value={`${analytics?.habitCompletion || 0}%`} sub="this period" color="text-violet-600" />
        <StatTile label="Avg mood score" value={analytics?.weeklyAverage || 0} sub="/ 10" color="text-amber-600" />
      </div>

      {/* Mood trend */}
      <Card>
        <CardHeader><CardTitle>Mood trend — last 30 days</CardTitle></CardHeader>
        <CardContent>
          {moodTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Log your mood to see trends here</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={moodTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${Number(v ?? 0)}/10`, "Mood score"]} />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5}
                  dot={{ fill: "#6366f1", r: 3, strokeWidth: 0 }} connectNulls activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mood distribution */}
        <Card>
          <CardHeader><CardTitle>Mood distribution</CardTitle></CardHeader>
          <CardContent>
            {moodDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No mood data yet</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie data={moodDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                      {moodDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {moodDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-xs text-muted-foreground flex-1">{item.name}</span>
                      <span className="text-xs font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Journal frequency */}
        <Card>
          <CardHeader><CardTitle>Journal frequency by week</CardTitle></CardHeader>
          <CardContent>
            {journalFreq.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No journal entries yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={journalFreq} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Entries" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Wellness score breakdown */}
      <Card>
        <CardHeader><CardTitle>Wellness score breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Mood quality", value: Math.round(((analytics?.weeklyAverage || 0) / 10) * 40), max: 40, color: "bg-indigo-500" },
            { label: "Journaling consistency", value: Math.round(Math.min(analytics?.currentStreak || 0, 30) / 30 * 20), max: 20, color: "bg-teal-500" },
            { label: "Habit completion", value: Math.round((analytics?.habitCompletion || 0) / 100 * 30), max: 30, color: "bg-violet-500" },
            { label: "Emotional stability", value: 10, max: 10, color: "bg-amber-500" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value} / {item.max} pts</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${item.color} rounded-full transition-all duration-700`}
                  style={{ width: `${(item.value / item.max) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
