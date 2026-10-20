import { NextResponse } from "next/server";
import { cleanupExpiredBookings, markCompletedBookings } from "@/lib/booking";

export async function GET(request: Request) {
  return handleCleanup(request);
}

export async function POST(request: Request) {
  return handleCleanup(request);
}

async function handleCleanup(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret");

  const providedSecret =
    authHeader?.replace("Bearer ", "") || cronHeader || querySecret;

  if (secret && providedSecret !== secret) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Invalid CRON_SECRET." },
      { status: 401 }
    );
  }

  const [cleanedCount, completedCount] = await Promise.all([
    cleanupExpiredBookings(),
    markCompletedBookings(),
  ]);

  return NextResponse.json({
    success: true,
    message: `Cron berhasil: ${cleanedCount} expired dibersihkan, ${completedCount} booking ditandai COMPLETED.`,
    expiredCleanedCount: cleanedCount,
    completedCount,
    timestamp: new Date().toISOString(),
  });
}
