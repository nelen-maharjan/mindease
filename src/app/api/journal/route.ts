import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import { wordCount } from "@/lib/utils";

const createJournalSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  tags: z.array(z.string()).optional().default([]),
  moodSnapshot: z.enum(["HAPPY", "GOOD", "NEUTRAL", "SAD", "DEPRESSED", "ANGRY", "ANXIOUS", "EXHAUSTED"]).optional(),
});

const updateJournalSchema = createJournalSchema.partial().extend({
  aiReflection: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
    const offset = Number(searchParams.get("offset") || 0);
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = { userId: session.user.id };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true, title: true, tags: true, moodSnapshot: true,
          emotionLabels: true, wordCount: true, createdAt: true, updatedAt: true,
          content: true, aiReflection: true, sentimentScore: true,
        },
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return NextResponse.json({ data: entries, total });
  } catch (error) {
    console.error("GET /api/journal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createJournalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { title, content, tags, moodSnapshot } = parsed.data;
    const entry = await prisma.journalEntry.create({
      data: {
        userId: session.user.id,
        title,
        content,
        tags,
        moodSnapshot,
        wordCount: wordCount(content),
      },
    });

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    console.error("POST /api/journal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
