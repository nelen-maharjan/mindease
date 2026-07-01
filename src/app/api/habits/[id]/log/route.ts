import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { startOfDay, endOfDay } from "date-fns";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: habitId } = await params;
    const userId = session.user.id;

    const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Toggle: if already logged today, remove it
    const existing = await prisma.habitLog.findFirst({
      where: { habitId, userId, completedAt: { gte: todayStart, lte: todayEnd } },
    });

    if (existing) {
      await prisma.habitLog.delete({ where: { id: existing.id } });
      // Recalculate streak
      await recalculateStreak(habitId, userId);
      return NextResponse.json({ data: { completed: false } });
    }

    // Create log
    await prisma.habitLog.create({
      data: { habitId, userId, completedAt: today },
    });

    // Recalculate streak
    const streak = await recalculateStreak(habitId, userId);

    return NextResponse.json({ data: { completed: true, streak } });
  } catch (error) {
    console.error("POST /api/habits/[id]/log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function recalculateStreak(habitId: string, userId: string) {
  const logs = await prisma.habitLog.findMany({
    where: { habitId, userId },
    orderBy: { completedAt: "desc" },
  });

  let streak = 0;
  const today = startOfDay(new Date());

  for (let i = 0; i < logs.length; i++) {
    const logDay = startOfDay(new Date(logs[i].completedAt));
    const expectedDay = new Date(today);
    expectedDay.setDate(today.getDate() - i);

    if (logDay.getTime() === expectedDay.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  const habit = await prisma.habit.findFirst({ where: { id: habitId } });
  const longestStreak = Math.max(streak, habit?.longestStreak || 0);

  await prisma.habit.update({
    where: { id: habitId },
    data: { streakCount: streak, longestStreak },
  });

  return streak;
}
