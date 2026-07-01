import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";
import { subDays, format } from "date-fns";
import { getMoodScore, calculateWellnessScore } from "@/lib/utils";
import type { MoodType } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const userId = session.user.id;
  const since7 = subDays(new Date(), 7);
  const since30 = subDays(new Date(), 30);

  const [recentMoods, recentJournals, habits, habitLogs, insights, journalCount30] = await Promise.all([
    prisma.moodLog.findMany({
      where: { userId, loggedAt: { gte: since7 } },
      orderBy: { loggedAt: "desc" },
      take: 10,
    }),
    prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, createdAt: true, moodSnapshot: true, tags: true },
    }),
    prisma.habit.findMany({
      where: { userId, isActive: true },
      include: { logs: { where: { completedAt: { gte: since7 } }, orderBy: { completedAt: "desc" } } },
      take: 5,
    }),
    prisma.habitLog.findMany({
      where: { userId, completedAt: { gte: since7 } },
    }),
    prisma.aiInsight.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.journalEntry.count({ where: { userId, createdAt: { gte: since30 } } }),
  ]);

  // Journal streak
  let journalStreak = 0;
  const journalDays = new Set(
    (await prisma.journalEntry.findMany({ where: { userId }, select: { createdAt: true } }))
      .map((e) => format(new Date(e.createdAt), "yyyy-MM-dd"))
  );
  for (let i = 0; i < 90; i++) {
    const d = format(subDays(new Date(), i), "yyyy-MM-dd");
    if (journalDays.has(d)) journalStreak++;
    else break;
  }

  // Wellness score
  const moodScores = recentMoods.map((l) => getMoodScore(l.mood as MoodType));
  const avgMoodScore = moodScores.length ? moodScores.reduce((a: number, b: number) => a + b, 0) / moodScores.length : 5;
  const moodVariability = moodScores.length > 1
    ? Math.sqrt(moodScores.reduce((a: number, b: number) => a + (b - avgMoodScore) ** 2, 0) / moodScores.length) : 0;
  const habitCompletionRate = habits.length > 0 ? Math.min(habitLogs.length / (7 * habits.length), 1) : 0;
  const wellnessScore = calculateWellnessScore({ avgMoodScore, journalStreak, habitCompletionRate, moodVariability });

  // Today's habit completions
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const habitsCompletedToday = habits.filter((h: { logs: { completedAt: Date }[] }) =>
    h.logs.some((l: { completedAt: Date }) => format(new Date(l.completedAt), "yyyy-MM-dd") === todayStr)
  ).length;

  const latestMood = recentMoods[0];

  return (
    <DashboardClient
      userName={session.user.name || session.user.email?.split("@")[0] || "there"}
      wellnessScore={wellnessScore}
      journalStreak={journalStreak}
      habitsCompletedToday={habitsCompletedToday}
      totalHabits={habits.length}
      latestMood={latestMood ? { mood: latestMood.mood, intensity: latestMood.intensity, loggedAt: latestMood.loggedAt.toISOString() } : null}
      recentMoods={recentMoods.map((m) => ({ ...m, loggedAt: m.loggedAt.toISOString(), createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() }))}
      recentJournals={recentJournals.map((j) => ({ ...j, createdAt: j.createdAt.toISOString() }))}
      habits={habits.map((h) => ({
        ...h,
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
        logs: h.logs.map((l: { completedAt: Date; id: string; habitId: string; userId: string; notes: string | null }) => ({ ...l, completedAt: l.completedAt.toISOString() })),
      }))}
      insights={insights.map((i) => ({ ...i, createdAt: i.createdAt.toISOString(), periodStart: i.periodStart.toISOString(), periodEnd: i.periodEnd.toISOString() }))}
    />
  );
}
