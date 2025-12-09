// src/app/api/debug/gmail-total/route.ts
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { getGmailClientForUser } from "~/server/google/gmail";
import { db } from "~/server/db";
import type { gmail_v1 } from "googleapis";

async function countAllThreads(gmail: gmail_v1.Gmail) {
  let pageToken: string | undefined;
  const seen = new Set<string>();

  do {
    const res = await gmail.users.threads.list({
      userId: "me",
      maxResults: 500,          // up to 500 per page
      pageToken,
      // includeSpamTrash: true, // uncomment if you want spam+trash as well
    });

    const threads = res.data.threads ?? [];
    for (const t of threads) {
      if (t.id) {
        seen.add(t.id);
      }
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return {
    exactCount: seen.size,
    // keeping the estimate just for comparison/debug
    resultSizeEstimate: (await gmail.users.threads.list({
      userId: "me",
      maxResults: 1,
    })).data.resultSizeEstimate ?? null,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Not logged in", { status: 401 });
  }

  const userId = session.user.id;
  const gmail = await getGmailClientForUser(userId);

  // 1) Exact count from Gmail by paginating every page once
  const { exactCount, resultSizeEstimate } = await countAllThreads(gmail);

  // 2) Count of what you've synced into Postgres
  const dbCount = await db.gmailThread.count({
    where: { userId },
  });

  return NextResponse.json({
    exactCount,          // real Gmail thread count
    resultSizeEstimate,  // Gmail’s fuzzy guess
    dbCount,             // what’s in your DB
  });
}
