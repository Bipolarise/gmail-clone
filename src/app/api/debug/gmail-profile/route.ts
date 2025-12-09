// src/app/api/debug/gmail-profile/route.ts
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { getGmailClientForUser } from "~/server/google/gmail";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Not logged in", { status: 401 });
  }

  const gmail = await getGmailClientForUser(session.user.id);

  // This call returns the REAL totals for this Gmail account
  const profile = await gmail.users.getProfile({ userId: "me" });

  return NextResponse.json({
    emailAddress: profile.data.emailAddress,
    messagesTotal: profile.data.messagesTotal,
    threadsTotal: profile.data.threadsTotal,
  });
}
