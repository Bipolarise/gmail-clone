// src/app/api/cron/sync-gmail/route.ts
import { NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db";
import { syncUserGmail } from "~/server/google/sync-gmail";

export const dynamic = "force-dynamic"; // always run on request

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  // 1) Simple auth so random people can't trigger your sync
  if (!token || token !== env.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 2) Find all users who have a Google account
    const accounts = await db.account.findMany({
      where: { provider: "google" },
      select: { userId: true },
      distinct: ["userId"],
    });

    let totalThreads = 0;

    // 3) Sync each user's Gmail
    for (const { userId } of accounts) {
      const count = await syncUserGmail({
        userId,
        maxThreads: 400, // adjust if you want to be gentler on quota
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
