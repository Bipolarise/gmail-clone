// src/server/google/sync-gmail.ts
import type { gmail_v1 } from "googleapis";

import { db } from "~/server/db";
import { getGmailClientForUser } from "~/server/google/gmail";

/**
 * Sync up to `maxThreads` threads for a single user.
 * Called from the cron route.
 *
 * Returns how many threads were processed (for logging/stats).
 */
export async function syncUserGmail(opts: {
  userId: string;
  maxThreads?: number;
}): Promise<number> {
  const { userId, maxThreads = 40 } = opts;

  const gmail = await getGmailClientForUser(userId);

  let pageToken: string | undefined;
  let processedThreads = 0;

  // keep batches modest so the function stays fast
  const batchSize = 100; // up to 100 threads per API call

  while (processedThreads < maxThreads) {
    const listRes = await gmail.users.threads.list({
      userId: "me",
      maxResults: Math.min(batchSize, maxThreads - processedThreads),
      pageToken,
    });

    const threads = listRes.data.threads ?? [];
    if (threads.length === 0) break;

    for (const t of threads) {
      if (!t.id) continue;

      // 1) Get thread (metadata only, cheaper)
      const threadRes = await gmail.users.threads.get({
        userId: "me",
        id: t.id,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "To", "Date"],
      });

      const gmailThreadId = threadRes.data.id!;
      const messages = threadRes.data.messages ?? [];
      if (messages.length === 0) continue;

      // Use LAST message as "summary" for the thread
      const lastMsg = messages[messages.length - 1]!;
      const headers = lastMsg.payload?.headers ?? [];

      const getHeader = (name: string) =>
        headers.find(
          (h) => h.name?.toLowerCase() === name.toLowerCase(),
        )?.value ?? "";

      const subject = getHeader("Subject");
      const snippet = threadRes.data.snippet ?? "";
      const from = getHeader("From");
      const internalDate = lastMsg.internalDate
        ? new Date(Number(lastMsg.internalDate))
        : undefined;

      // 2) Upsert GmailThread row
      await db.gmailThread.upsert({
        where: { id: gmailThreadId },
        update: {
          userId,
          subject,
          snippet,
          updatedAt: internalDate ?? new Date(),
        },
        create: {
          id: gmailThreadId,
          userId,
          subject,
          snippet,
          updatedAt: internalDate ?? new Date(),
        },
      });

      // 3) Upsert GmailMessage rows (metadata only)
      for (const msg of messages) {
        if (!msg.id) continue;

        const msgHeaders = msg.payload?.headers ?? [];
        const mh = (name: string) =>
          msgHeaders.find(
            (h) => h.name?.toLowerCase() === name.toLowerCase(),
          )?.value ?? "";

        const msgFrom = mh("From");
        const msgTo = mh("To");
        const msgSubject = mh("Subject");
        const msgSnippet = msg.snippet ?? "";
        const msgInternalDate = msg.internalDate
          ? new Date(Number(msg.internalDate))
          : undefined;
        const labelIds = msg.labelIds ?? [];

        await db.gmailMessage.upsert({
          where: { id: msg.id },
          update: {
            threadId: gmailThreadId,
            userId,
            from: msgFrom,
            to: msgTo,
            subject: msgSubject,
            snippet: msgSnippet,
            internalDate: msgInternalDate,
            labelIds,
            // s3Key stays as-is (null) – HTML comes later when user opens thread
          },
          create: {
            id: msg.id,
            threadId: gmailThreadId,
            userId,
            from: msgFrom,
            to: msgTo,
            subject: msgSubject,
            snippet: msgSnippet,
            internalDate: msgInternalDate,
            labelIds,
            s3Key: undefined,
          },
        });
      }

      processedThreads++;
      if (processedThreads >= maxThreads) break;
    }

    pageToken = listRes.data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  return processedThreads;
}
