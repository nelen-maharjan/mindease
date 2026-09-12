import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin";
import { getMlModelInfo } from "@/lib/ml";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const startDb = Date.now();
  let dbStatus = "healthy";
  let dbLatencyMs = 0;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - startDb;
  } catch {
    dbStatus = "degraded";
    dbLatencyMs = -1;
  }

  // Check Python ML service
  const startMl = Date.now();
  let mlStatus = "offline";
  let mlLatencyMs = -1;
  let mlInfo = null;

  try {
    mlInfo = await getMlModelInfo();
    mlLatencyMs = Date.now() - startMl;
    mlStatus = mlInfo.loaded ? "healthy" : "untrained";
  } catch {
    mlStatus = "offline";
  }

  // Check system memory
  const memoryUsage = process.memoryUsage();
  const heapUsedMb = Math.round((memoryUsage.heapUsed / 1024 / 1024) * 10) / 10;
  const heapTotalMb = Math.round((memoryUsage.heapTotal / 1024 / 1024) * 10) / 10;

  return NextResponse.json({
    data: {
      services: {
        database: { status: dbStatus, latencyMs: dbLatencyMs, type: "PostgreSQL (Prisma)" },
        mlService: { status: mlStatus, latencyMs: mlLatencyMs, info: mlInfo },
        nextServer: { status: "healthy", uptime: Math.round(process.uptime()), memoryMb: `${heapUsedMb}MB / ${heapTotalMb}MB` },
      },
      timestamp: new Date().toISOString(),
    },
  });
}
