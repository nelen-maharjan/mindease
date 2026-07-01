import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

const createHabitSchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
  description: z.string().max(500).optional(),
  frequency: z.enum(["daily", "weekdays", "weekends"]).default("daily"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const since = subDays(new Date(), 7);

    const habits = await prisma.habit.findMany({
      where: { userId: session.user.id, isActive: true },
      include: {
        logs: {
          where: { completedAt: { gte: since } },
          orderBy: { completedAt: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: habits });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createHabitSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const habit = await prisma.habit.create({
      data: { userId: session.user.id, ...parsed.data },
    });

    return NextResponse.json({ data: habit }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
