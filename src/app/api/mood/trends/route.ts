import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { format } from "date-fns";
import { analyzeMoodTrends } from "@/lib/ml";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const days = Math.min(Number(searchParams.get("days") || 30), 90);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.moodLog.findMany({
      where: {
        userId: session.user.id,
        loggedAt: { gte: since },
      },
      orderBy: { loggedAt: "asc" },
      take: 100,
    });

    if (logs.length < 2) {
      return NextResponse.json({
        data: {
          hasEnoughData: false,
          message: "Log at least 2 mood check-ins to view ML trend analysis and anomaly detection.",
        },
      });
    }

    const entries = logs.map((log) => ({
      mood: log.mood,
      intensity: log.intensity,
      date: format(new Date(log.loggedAt), "yyyy-MM-dd"),
    }));

    const analysis = await analyzeMoodTrends(entries);

    if (!analysis) {
      // Graceful fallback if Python service is offline
      const scores = logs.map((l) => l.intensity);
      const avg = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
      return NextResponse.json({
        data: {
          hasEnoughData: true,
          weekly_average: avg,
          trend_direction: "stable",
          change_percent: 0,
          anomalies: [],
          dominant_mood: logs[logs.length - 1].mood.toLowerCase(),
          isFallback: true,
        },
      });
    }

    return NextResponse.json({
      data: {
        hasEnoughData: true,
        ...analysis,
        isFallback: false,
      },
    });
  } catch (error) {
    console.error("GET /api/mood/trends error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
