import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [user, profile, moodLogs, journalEntries, goals, habits, habitLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.moodLog.findMany({
      where: { userId },
      orderBy: { loggedAt: "desc" },
      select: { id: true, mood: true, notes: true, loggedAt: true },
    }),
    prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, content: true, createdAt: true },
    }),
    prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, description: true, category: true, isCompleted: true, dueDate: true, createdAt: true },
    }),
    prisma.habit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, description: true, frequency: true, isActive: true, createdAt: true },
    }),
    prisma.habitLog.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      select: { id: true, habitId: true, completedAt: true },
    }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    user,
    profile,
    moodLogs,
    journalEntries,
    goals,
    habits,
    habitLogs,
  };

  const json = JSON.stringify(exportData, null, 2);

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mindease-data-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
