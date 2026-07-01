import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { subDays } from "date-fns";
import { generateWeeklyInsights } from "@/lib/openai";
import { getMoodScore } from "@/lib/utils";
import type { MoodType } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    // Return cached insights if recent
    const recent = await prisma.aiInsight.findFirst({
      where: { userId, createdAt: { gte: subDays(new Date(), 1) } },
      orderBy: { createdAt: "desc" },
    });

    if (recent) {
      const all = await prisma.aiInsight.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      return NextResponse.json({ data: all });
    }

    // Generate fresh insights
    const since = subDays(new Date(), 7);
    const [moodLogs, journalCount, habits, habitLogs] = await Promise.all([
      prisma.moodLog.findMany({ where: { userId, loggedAt: { gte: since } } }),
      prisma.journalEntry.count({ where: { userId, createdAt: { gte: since } } }),
      prisma.habit.findMany({ where: { userId, isActive: true }, select: { id: true } }),
      prisma.habitLog.findMany({ where: { userId, completedAt: { gte: since } } }),
    ]);

    const moodData = moodLogs.map((l) => ({
      mood: l.mood,
      intensity: l.intensity,
      loggedAt: l.loggedAt,
    }));

    const expectedHabitDays = 7 * habits.length;
    const habitCompletionRate = expectedHabitDays > 0 ? habitLogs.length / expectedHabitDays : 0;

    const insightTexts = await generateWeeklyInsights({
      moodLogs: moodData,
      journalCount,
      habitCompletionRate,
      userName: session.user.name || undefined,
    });

    const now = new Date();
    const weekAgo = subDays(now, 7);

    const insights = await Promise.all(
      insightTexts.map((content, i) =>
        prisma.aiInsight.create({
          data: {
            userId,
            content,
            category: ["mood_trend", "habit_pattern", "journal_reflection"][i % 3],
            periodStart: weekAgo,
            periodEnd: now,
          },
        })
      )
    );

    return NextResponse.json({ data: insights });
  } catch (error) {
    console.error("GET /api/insights error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
