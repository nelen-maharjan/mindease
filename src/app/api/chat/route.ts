import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import { generateChatResponse, detectCrisisSeverity, getCrisisWords } from "@/lib/openai";

const sendMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { message, sessionId } = parsed.data;
    const userId = session.user.id;

    // Crisis detection (runs before AI)
    const crisisSeverity = detectCrisisSeverity(message);
    const crisisWords = getCrisisWords(message);

    if (crisisSeverity !== "none") {
      await prisma.crisisFlag.create({
        data: {
          userId,
          severity: crisisSeverity,
          triggerWords: crisisWords,
        },
      });
    }

    // Get or create chat session
    let chatSession;
    if (sessionId) {
      chatSession = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
      });
    }

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          userId,
          title: message.slice(0, 60) + (message.length > 60 ? "…" : ""),
        },
        include: { messages: true },
      });
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: "USER",
        content: message,
        crisisDetected: crisisSeverity !== "none",
      },
    });

    // Build history for OpenAI
    const history = (chatSession.messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === "USER" ? "user" as const : "assistant" as const,
      content: m.content,
    }));
    history.push({ role: "user", content: message });

    // Generate AI response
    const aiReply = await generateChatResponse(history, session.user.name || undefined);

    // Save assistant message
    const assistantMsg = await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: "ASSISTANT",
        content: aiReply,
        crisisDetected: false,
      },
    });

    return NextResponse.json({
      data: {
        sessionId: chatSession.id,
        message: assistantMsg,
        crisisDetected: crisisSeverity !== "none",
        crisisSeverity,
      },
    });
  } catch (error) {
    console.error("POST /api/chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const chatSession = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId: session.user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      if (!chatSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ data: chatSession });
    }

    const sessions = await prisma.chatSession.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ data: sessions });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
