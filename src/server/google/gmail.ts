import { google } from "googleapis";
import { env } from "~/env";
import { db } from "~/server/db";

export async function getGmailClientForUser(userId: string) {
  // Fetch Google OAuth tokens stored by NextAuth
  const account = await db.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
  });

  if (!account || !account.access_token) {
    throw new Error("No Google account with access token for this user");
  }

  // IMPORTANT: include redirect URI
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.NEXTAUTH_URL + "/api/auth/callback/google"
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  return google.gmail({
    version: "v1",
    auth: oauth2Client,
  });
}
