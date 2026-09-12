import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin";
import { subDays, format, eachDayOfInterval } from "date-fns";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const since = subDays(new Date(), 30);

  const [
    userCount,
    adminCount,
    moodCount,
    journalCount,
    chatCount,
    crisisOpen,
    crisisTotal,
    habitCount,
    recentUsers,
    moodLogs,
    newUsers,
    crisisFlags,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.moodLog.count(),
    prisma.journalEntry.count(),
    prisma.chatSession.count(),
    prisma.crisisFlag.count({ where: { resolvedAt: null } }),
    prisma.crisisFlag.count(),
    prisma.habit.count({ where: { isActive: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { moodLogs: true, journalEntries: true, goals: true, crisisFlags: true } },
      },
    }),
    prisma.moodLog.findMany({
      where: { loggedAt: { gte: since } },
      select: { mood: true, loggedAt: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.crisisFlag.findMany({
      select: { severity: true, triggerWords: true, resolvedAt: true, createdAt: true },
    }),
  ]);

  // Mood distribution
  const moodDistribution: Record<string, number> = {};
  for (const log of moodLogs) {
    moodDistribution[log.mood] = (moodDistribution[log.mood] || 0) + 1;
  }

  // Daily signups
  const days = eachDayOfInterval({ start: since, end: new Date() });
  const usersByDay = new Map<string, number>();
  for (const u of newUsers) {
    const key = format(u.createdAt, "yyyy-MM-dd");
    usersByDay.set(key, (usersByDay.get(key) || 0) + 1);
  }
  const signups = days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return { date: key, count: usersByDay.get(key) || 0 };
  });

  // Safety Analytics
  const severityBreakdown: Record<string, number> = { high: 0, medium: 0, low: 0 };
  const triggerWordsCount: Record<string, number> = {};
  let totalResolutionTimeMs = 0;
  let resolvedCount = 0;

  for (const flag of crisisFlags) {
    severityBreakdown[flag.severity] = (severityBreakdown[flag.severity] || 0) + 1;
    for (const w of flag.triggerWords) {
      triggerWordsCount[w] = (triggerWordsCount[w] || 0) + 1;
    }
    if (flag.resolvedAt) {
      resolvedCount++;
      totalResolutionTimeMs += flag.resolvedAt.getTime() - flag.createdAt.getTime();
    }
  }

  const avgResolutionHours =
    resolvedCount > 0 ? Math.round((totalResolutionTimeMs / resolvedCount / (1000 * 60 * 60)) * 10) / 10 : null;

  const topTriggerWords = Object.entries(triggerWordsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  return NextResponse.json({
    data: {
      kpis: {
        users: userCount,
        admins: adminCount,
        moodLogs: moodCount,
        journals: journalCount,
        chats: chatCount,
        openCrisis: crisisOpen,
        crisisTotal,
        activeHabits: habitCount,
        avgResolutionHours,
      },
      moodDistribution,
      signups,
      recentUsers,
      safetyAnalytics: {
        severityBreakdown,
        topTriggerWords,
        resolvedCount,
      },
    },
  });
}
