import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin";
import { z } from "zod";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const flags = await prisma.crisisFlag.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: flags });
}

const patchSchema = z.object({
  id: z.string(),
  resolved: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const flag = await prisma.crisisFlag.update({
    where: { id: parsed.data.id },
    data: { resolvedAt: parsed.data.resolved ? new Date() : null },
  });

  return NextResponse.json({ data: flag });
}
