// src/app/api/debug/mailbox-size/route.ts
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { getGmailClientForUser } from "~/server/google/gmail";
import { db } from "~/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  // 1) Who is logged in?
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Not logged in", { status: 401 });
  }

  const userId = session.user.id;
  const gmail = await getGmailClientForUser(userId);

  // 2) Ask Gmail for mailbox size in different scopes
  const [allRes, noSpamTrashRes] = await Promise.all([
    // All threads INCLUDING spam + trash
    gmail.users.threads.list({
      userId: "me",
      maxResults: 1,
      includeSpamTrash: true,
    }),
    // Default: EXCLUDES spam + trash
    gmail.users.threads.list({
      userId: "me",
      maxResults: 1,
      // includeSpamTrash omitted → false
    }),
  ]);

  const allEstimate = allRes.data.resultSizeEstimate ?? null;
  const noSpamTrashEstimate = noSpamTrashRes.data.resultSizeEstimate ?? null;

  // 3) Count what we have in our DB
  const dbCount = await db.gmailThread.count({
    where: { userId },
  });

  return NextResponse.json({
    allEstimate,          // all threads (spam+trash+everything)
    noSpamTrashEstimate,  // what our cron is actually walking
    dbCount,              // what we’ve stored
  });
}
