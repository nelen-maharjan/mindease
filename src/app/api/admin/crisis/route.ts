import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all"; // "open" | "resolved" | "all"
  const severity = searchParams.get("severity") || "all"; // "high" | "medium" | "low" | "all"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  const where: Record<string, unknown> = {};
  if (status === "open") where.resolvedAt = null;
  if (status === "resolved") where.resolvedAt = { not: null };
  if (severity !== "all") where.severity = severity;

  const [flags, total] = await Promise.all([
    prisma.crisisFlag.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.crisisFlag.count({ where }),
  ]);

  return NextResponse.json({
    data: flags,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}

const patchSchema = z.object({
  id: z.string(),
  resolved: z.boolean(),
  resolutionNote: z.string().max(500).optional(),
});

export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { id, resolved, resolutionNote } = parsed.data;

  const flag = await prisma.crisisFlag.update({
    where: { id },
    data: {
      resolvedAt: resolved ? new Date() : null,
      ...(resolutionNote !== undefined ? { resolutionNote } : {}),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ data: flag });
}
