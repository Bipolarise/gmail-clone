// src/server/google/sync-gmail.ts
import type { gmail_v1 } from "googleapis";

import { db } from "~/server/db";
import { getGmailClientForUser } from "~/server/google/gmail";

type SyncOptions = {
  userId: string;
  maxThreads?: number; // total threads to touch in THIS cron run
};

/**
 * Helper to upsert a thread + all its messages (metadata only).
 */
async function upsertThreadAndMessages(opts: {
  userId: string;
  gmail: gmail_v1.Gmail;
  threadId: string;
}) {
  const { userId, gmail, threadId } = opts;

  // Get thread with metadata (cheap)
  const threadRes = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "metadata",
    metadataHeaders: ["Subject", "From", "To", "Date"],
  });

  const messages = threadRes.data.messages ?? [];
  if (messages.length === 0) return;

  const lastMsg = messages[messages.length - 1]!;
  const headers = lastMsg.payload?.headers ?? [];

  const getHeader = (name: string) =>
    headers.find(
      (h) => h.name?.toLowerCase() === name.toLowerCase(),
    )?.value ?? "";

  const subject = getHeader("Subject");
  const snippet = threadRes.data.snippet ?? "";

  const internalDate = lastMsg.internalDate
    ? new Date(Number(lastMsg.internalDate))
    : undefined;

  // Upsert GmailThread
  await db.gmailThread.upsert({
    where: { id: threadId },
    update: {
      userId,
      subject,
      snippet,
      updatedAt: internalDate ?? new Date(),
    },
    create: {
      id: threadId,
      userId,
      subject,
      snippet,
      updatedAt: internalDate ?? new Date(),
    },
  });

  // Upsert GmailMessage rows
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
        threadId,
        userId,
        from: msgFrom,
        to: msgTo,
        subject: msgSubject,
        snippet: msgSnippet,
        internalDate: msgInternalDate,
        labelIds,
        // s3Key unchanged – we only set that after HTML upload
      },
      create: {
        id: msg.id,
        threadId,
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
}

/**
 * Sync up to `maxThreads` threads for a single user.
 *
 * Strategy:
 *  1) Always sync some NEWEST threads so new mail is picked up quickly.
 *  2) Use remaining budget to BACKFILL older pages, using
 *     GmailSyncState.backfillPageToken to walk the mailbox.
 *
 * Called from the cron route.
 */
export async function syncUserGmail(opts: SyncOptions): Promise<number> {
  const { userId, maxThreads = 450 } = opts; // 400–500 as per spec
  const maxListPageSize = 100; // Gmail max per list call

  console.log(
    ">>> syncUserGmail START",
    { userId, maxThreads },
  );

  const gmail = await getGmailClientForUser(userId);

  // Ensure we have a sync state row
  let syncState = await db.gmailSyncState.upsert({
    where: { userId },
    create: {
      userId,
      backfillPageToken: null,
      backfillDone: false,
    },
    update: {},
  });

  let processedThreads = 0;

  // ---- 1) Always sync newest threads (incremental / new mail) ----
  const newestBatchSize = Math.min(50, maxThreads); // small slice for latest mail

  if (newestBatchSize > 0) {
    const newestRes = await gmail.users.threads.list({
      userId: "me",
      maxResults: newestBatchSize,
      includeSpamTrash: true,
    });

    const newestThreads = newestRes.data.threads ?? [];

    // Only ONCE, if we have never started backfill, we can prime the cursor
    // to "page 2" (the next page after newest).
    if (syncState.backfillPageToken === null) {
      const nextToken = newestRes.data.nextPageToken ?? null;
      if (nextToken) {
        syncState = await db.gmailSyncState.update({
          where: { userId },
          data: { backfillPageToken: nextToken },
        });
      }
    }

    for (const t of newestThreads) {
      if (!t.id) continue;
      await upsertThreadAndMessages({ userId, gmail, threadId: t.id });
      processedThreads++;
      if (processedThreads >= maxThreads) {
        const finalCount = await db.gmailThread.count({ where: { userId } });
        console.log(">>> syncUserGmail END (newest only)", {
          userId,
          processedThreads,
          finalCount,
        });
        return processedThreads;
      }
    }
  }

  // ---- 2) Backfill older pages, if we still have budget ----
  if (!syncState.backfillDone && processedThreads < maxThreads) {
    let remaining = maxThreads - processedThreads;

    // We can walk multiple pages in ONE cron run if budget allows
    while (remaining > 0 && !syncState.backfillDone) {
      const pageSize = Math.min(maxListPageSize, remaining);

      const listRes = await gmail.users.threads.list({
        userId: "me",
        maxResults: pageSize,
        pageToken: syncState.backfillPageToken ?? undefined,
        includeSpamTrash: true, // we want *everything*
      });

      const threads = listRes.data.threads ?? [];
      const nextPageToken = listRes.data.nextPageToken ?? null;

      console.log(">>> backfill page", {
        userId,
        pageSize,
        got: threads.length,
        nextPageToken,
      });

      if (threads.length === 0) {
        // No more pages
        syncState = await db.gmailSyncState.update({
          where: { userId },
          data: {
            backfillPageToken: null,
            backfillDone: true,
          },
        });
        break;
      }

      for (const t of threads) {
        if (!t.id) continue;
        await upsertThreadAndMessages({ userId, gmail, threadId: t.id });
        processedThreads++;
        remaining--;
        if (remaining <= 0) break;
      }

      // Advance cursor
      syncState = await db.gmailSyncState.update({
        where: { userId },
        data: {
          backfillPageToken: nextPageToken,
          backfillDone: nextPageToken === null,
        },
      });

      if (!nextPageToken) break; // reached the end
    }
  }

  const finalThreads = await db.gmailThread.count({ where: { userId } });

  console.log(">>> syncUserGmail END", {
    userId,
    processedThreads,
    finalThreads,
    backfillDone: syncState.backfillDone,
    backfillPageToken: syncState.backfillPageToken,
  });

  return processedThreads;
}
