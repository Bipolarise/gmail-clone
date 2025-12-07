// src/server/google/sync-gmail.ts
import { simpleParser } from "mailparser";
import type { gmail_v1 } from "googleapis";

import { db } from "~/server/db";
import { getGmailClientForUser } from "~/server/google/gmail";
import { uploadEmailHtmlToS3 } from "~/server/aws/s3";

/**
 * Sync up to `maxThreads` threads for a single user.
 * Called from the cron route.
 *
 * Returns how many threads were processed (for logging/stats).
 */
export async function syncUserGmail(opts: {
  userId: string;
  maxThreads?: number;
}): Promise<number> {                    // 👈 return type is now Promise<number>
  const { userId, maxThreads = 400 } = opts;

  const gmail = await getGmailClientForUser(userId);

  let pageToken: string | undefined;
  let processedThreads = 0;

  while (processedThreads < maxThreads) {
    const listRes = await gmail.users.threads.list({
      userId: "me",
      maxResults: Math.min(100, maxThreads - processedThreads),
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
      const date = getHeader("Date");
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

      // 3) Upsert GmailMessage rows (metadata + S3 HTML for lastMsg)
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

        // Check existing row (so we don't re-upload HTML if we already have it)
        const existing = await db.gmailMessage.findUnique({
          where: { id: msg.id },
          select: { s3Key: true },
        });

        let s3Key: string | undefined = existing?.s3Key ?? undefined;

        // OPTIONAL: only upload HTML for the last message in the thread
        if (!s3Key && msg.id === lastMsg.id) {
          // Fetch raw and parse with mailparser
          const rawRes = await gmail.users.messages.get({
            userId: "me",
            id: msg.id,
            format: "raw",
          });

          const raw = rawRes.data.raw;
          if (raw) {
            const rawStr = Buffer.from(raw, "base64").toString("utf8");
            const parsed = await simpleParser(rawStr);

            const html =
              parsed.html ??
              (parsed.textAsHtml as string | undefined) ??
              undefined;

            if (html) {
              const uploaded = await uploadEmailHtmlToS3({
                threadId: gmailThreadId + "-" + msg.id,
                html,
              });

              s3Key = uploaded.key;
            }
          }
        }

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
            s3Key,
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
            s3Key,
          },
        });
      }

      processedThreads++;
      if (processedThreads >= maxThreads) break;
    }

    pageToken = listRes.data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  // 👈 THIS is what fixes the "+=" TS error in the cron route
  return processedThreads;
}
