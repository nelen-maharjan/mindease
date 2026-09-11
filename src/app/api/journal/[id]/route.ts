import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import { wordCount } from "@/lib/utils";
import { generateJournalReflection } from "@/lib/openai";
import { analyzeJournalText } from "@/lib/ml";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
  tags: z.array(z.string()).optional(),
  moodSnapshot: z.enum(["HAPPY", "GOOD", "NEUTRAL", "SAD", "DEPRESSED", "ANGRY", "ANXIOUS", "EXHAUSTED"]).optional(),
  generateReflection: z.boolean().optional(),
});

async function getEntry(id: string, userId: string) {
  return prisma.journalEntry.findFirst({ where: { id, userId } });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const entry = await getEntry(id, session.user.id);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: entry });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const existing = await getEntry(id, session.user.id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { generateReflection, ...updateData } = parsed.data;
    const updatePayload: Record<string, unknown> = { ...updateData };

    if (updateData.content) {
      updatePayload.wordCount = wordCount(updateData.content);
      const analysis = await analyzeJournalText(updateData.content);
      if (analysis) {
        updatePayload.sentimentScore = analysis.signedScore;
        updatePayload.emotionLabels = analysis.emotions;
      }
    }

    if (generateReflection) {
      try {
        const content = updateData.content || existing.content;
        const reflection = await generateJournalReflection(content);
        updatePayload.aiReflection = reflection;
      } catch (e) {
        console.warn("Could not generate reflection, skipping:", e);
      }
    }

    const entry = await prisma.journalEntry.update({
      where: { id },
      data: updatePayload,
    });

    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("PATCH /api/journal/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const existing = await getEntry(id, session.user.id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.journalEntry.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
