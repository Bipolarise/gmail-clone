import { NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db";
import { syncUserGmail } from "~/server/google/sync-gmail";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  // security check
  if (!token || token !== env.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // FIXED: load actual users, not accounts table
    const accounts = await db.user.findMany({
      select: { id: true },
    });

    let totalThreads = 0;

    for (const { id: userId } of accounts) {
      const count = await syncUserGmail({
        userId,
        maxThreads: 40,
      });

      totalThreads += count;
    }

    return NextResponse.json({
      ok: true,
      syncedThreads: totalThreads,
      users: accounts.length,
    });
  } catch (err) {
    console.error("CRON Gmail sync failed", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
