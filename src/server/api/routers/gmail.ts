// src/server/api/routers/gmail.ts
import { z } from "zod";
import type { gmail_v1 } from "googleapis";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getGmailClientForUser } from "~/server/google/gmail";
import { uploadEmailHtmlToS3 } from "~/server/aws/s3";
import { db } from "~/server/db";

type ThreadRow = {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  receivedAt: string;
};

export const gmailRouter = createTRPCRouter({
  // ---------- 1) LIST THREADS (FROM DB, synced by cron) ----------
  listThreads: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session || !ctx.session.user) return [];

    const userId = ctx.session.user.id;

    // Read from GmailThread/GmailMessage that cron has synced
    const threads = await db.gmailThread.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { internalDate: "desc" },
          take: 1, // last message as the summary
        },
      },
      take: 400, // can tweak this
    });

    return threads.map((t): ThreadRow => {
      const last = t.messages[0];

      const received =
        last?.internalDate ?? t.updatedAt ?? new Date();

      return {
        id: t.id, // gmail threadId
        threadId: t.id,
        snippet: t.snippet ?? last?.snippet ?? "",
        subject: t.subject ?? last?.subject ?? "",
        from: last?.from ?? "",
        receivedAt: received.toISOString(),
      };
    });
  }),

  // ---------- 2) GET FULL CONTENT FOR A SINGLE THREAD ----------
  getThreadDetail: publicProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session || !ctx.session.user) return null;

      const gmail = await getGmailClientForUser(ctx.session.user.id);

      try {
        // Get the whole thread in FULL format
        const threadRes = await gmail.users.threads.get({
          userId: "me",
          id: input.threadId,
          format: "full",
        });

        const messages = threadRes.data.messages ?? [];
        if (messages.length === 0) {
          return {
            html: "",
            text: "No messages found in this thread.",
            s3Url: null,
          };
        }

        // Use the LAST message in the thread
        const lastMsg = messages[messages.length - 1]!;
        const payload = lastMsg.payload;
        if (!payload) {
          return {
            html: "",
            text: lastMsg.snippet ?? "No content found for this message.",
            s3Url: null,
          };
        }

        // ---- helper to walk MIME parts and find html/text ----
        const extractBody = (
          part: gmail_v1.Schema$MessagePart,
        ): { html?: string; text?: string } => {
          if (!part) return {};

          let html: string | undefined;
          let text: string | undefined;

          const data = part.body?.data;
          if (data) {
            const decoded = Buffer.from(data, "base64").toString("utf8");

            if (part.mimeType === "text/html") {
              html = decoded;
            } else if (part.mimeType === "text/plain") {
              text = decoded;
            }
          }

          if (part.parts) {
            for (const child of part.parts) {
              const childRes = extractBody(child);
              if (!html && childRes.html) html = childRes.html;
              if (!text && childRes.text) text = childRes.text;
            }
          }

          return { html, text };
        };

        const { html, text } = extractBody(payload);

        // ---- Upload HTML to S3 if we have it ----
        let s3Url: string | null = null;
        if (html) {
          try {
            const { url } = await uploadEmailHtmlToS3({
              threadId: input.threadId,
              html,
            });
            s3Url = url;
            // (optional) you could later store url in GmailMessage.s3Key using ctx.db.gmailMessage
          } catch (s3Err) {
            // Don't break the UI if S3 fails – just log it
            // eslint-disable-next-line no-console
            console.error("Failed to upload email HTML to S3", s3Err);
          }
        }

        return {
          html: html ?? "",
          text: text ?? lastMsg.snippet ?? "",
          s3Url,
        };
      } catch (err: any) {
        // Log full error in your terminal
        // eslint-disable-next-line no-console
        console.error("gmail.getThreadDetail failed", err);

        const status = err?.code ?? err?.status;
        const msg =
          err?.cause?.message ??
          err?.message ??
          (typeof err === "string" ? err : JSON.stringify(err));

        // Nicer message in the UI for quota / permission errors
        if (status === 429 || status === 403) {
          return {
            html: "",
            text:
              "Could not load this message due to Gmail quota/permission limits.\n\n" +
              msg,
            s3Url: null,
          };
        }

        return {
          html: "",
          text: "Could not load this message.\n\nServer error: " + msg,
          s3Url: null,
        };
      }
    }),
});
