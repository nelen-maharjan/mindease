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
      take: 8,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.moodLog.findMany({
      where: { loggedAt: { gte: since } },
      select: { mood: true, loggedAt: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  const moodDistribution: Record<string, number> = {};
  for (const log of moodLogs) {
    moodDistribution[log.mood] = (moodDistribution[log.mood] || 0) + 1;
  }

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
      },
      moodDistribution,
      signups,
      recentUsers,
    },
  });
}
