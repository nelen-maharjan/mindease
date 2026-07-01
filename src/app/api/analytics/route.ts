import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { subDays, format, startOfDay, eachDayOfInterval } from "date-fns";
import { getMoodScore, calculateWellnessScore, MOOD_CONFIG } from "@/lib/utils";
import type { MoodType } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const days = Math.min(Number(searchParams.get("days") || 30), 90);
    const userId = session.user.id;

    const since = subDays(new Date(), days);

    const [moodLogs, journalEntries, habits, habitLogs] = await Promise.all([
      prisma.moodLog.findMany({
        where: { userId, loggedAt: { gte: since } },
        orderBy: { loggedAt: "asc" },
      }),
      prisma.journalEntry.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.habit.findMany({
        where: { userId, isActive: true },
        select: { id: true },
      }),
      prisma.habitLog.findMany({
        where: { userId, completedAt: { gte: since } },
      }),
    ]);

    // Mood trend: one entry per day (most recent)
    const dayMap = new Map<string, { score: number; mood: string }>();
    for (const log of moodLogs) {
      const day = format(new Date(log.loggedAt), "yyyy-MM-dd");
      const score = getMoodScore(log.mood as MoodType);
      if (!dayMap.has(day) || score > (dayMap.get(day)?.score ?? 0)) {
        dayMap.set(day, { score, mood: log.mood });
      }
    }

    const allDays = eachDayOfInterval({ start: since, end: new Date() });
    const moodTrend = allDays.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const entry = dayMap.get(key);
      return { date: key, score: entry?.score ?? 0, mood: entry?.mood ?? "" };
    });

    // Mood distribution
    const moodDistribution: Record<string, number> = {};
    for (const log of moodLogs) {
      moodDistribution[log.mood] = (moodDistribution[log.mood] || 0) + 1;
    }

    // Weekly journal frequency
    const journalByWeek = new Map<string, number>();
    for (const entry of journalEntries) {
      const week = format(new Date(entry.createdAt), "'W'ww yyyy");
      journalByWeek.set(week, (journalByWeek.get(week) || 0) + 1);
    }
    const journalFrequency = Array.from(journalByWeek.entries())
      .map(([week, count]) => ({ week, count }))
      .slice(-8);

    // Wellness score
    const moodScores = moodLogs.map((l) => getMoodScore(l.mood as MoodType));
    const avgMoodScore = moodScores.length
      ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length
      : 5;
    const moodVariability = moodScores.length > 1
      ? Math.sqrt(moodScores.reduce((a, b) => a + (b - avgMoodScore) ** 2, 0) / moodScores.length)
      : 0;

    // Journal streak
    let journalStreak = 0;
    const journalDays = new Set(journalEntries.map((e) => format(new Date(e.createdAt), "yyyy-MM-dd")));
    for (let i = 0; i < 60; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (journalDays.has(d)) journalStreak++;
      else break;
    }

    // Habit completion rate
    const expectedDays = days * habits.length;
    const habitCompletionRate = expectedDays > 0 ? Math.min(habitLogs.length / expectedDays, 1) : 0;

    const wellnessScore = calculateWellnessScore({
      avgMoodScore,
      journalStreak,
      habitCompletionRate,
      moodVariability,
    });

    return NextResponse.json({
      data: {
        moodTrend,
        moodDistribution,
        weeklyAverage: Math.round(avgMoodScore * 10) / 10,
        journalFrequency,
        habitCompletion: Math.round(habitCompletionRate * 100),
        wellnessScore,
        currentStreak: journalStreak,
        totalMoodLogs: moodLogs.length,
        totalJournalEntries: journalEntries.length,
      },
    });
  } catch (error) {
    console.error("GET /api/analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
