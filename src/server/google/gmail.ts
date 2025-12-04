import { google } from "googleapis";
import { env } from "~/env";
import { db } from "~/server/db";

export async function getGmailClientForUser(userId: string) {
  // Find this user's Google account row that NextAuth stored
  const account = await db.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
  });

  if (!account || !account.access_token) {
    throw new Error("No Google account with access token for this user");
  }

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}
