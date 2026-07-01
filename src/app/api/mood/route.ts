import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";

const createMoodSchema = z.object({
  mood: z.enum(["HAPPY", "GOOD", "NEUTRAL", "SAD", "DEPRESSED", "ANGRY", "ANXIOUS", "EXHAUSTED"]),
  intensity: z.number().int().min(1).max(10),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional().default([]),
  loggedAt: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
    const offset = Number(searchParams.get("offset") || 0);
    const days = Number(searchParams.get("days") || 30);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [logs, total] = await Promise.all([
      prisma.moodLog.findMany({
        where: { userId: session.user.id, loggedAt: { gte: since } },
        orderBy: { loggedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.moodLog.count({
        where: { userId: session.user.id, loggedAt: { gte: since } },
      }),
    ]);

    return NextResponse.json({ data: logs, total, limit, offset });
  } catch (error) {
    console.error("GET /api/mood error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createMoodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { mood, intensity, notes, tags, loggedAt } = parsed.data;
    const log = await prisma.moodLog.create({
      data: {
        userId: session.user.id,
        mood,
        intensity,
        notes,
        tags,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      },
    });

    return NextResponse.json({ data: log }, { status: 201 });
  } catch (error) {
    console.error("POST /api/mood error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
