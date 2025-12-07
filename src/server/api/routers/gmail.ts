// src/server/api/routers/gmail.ts
import { z } from "zod";
import type { gmail_v1 } from "googleapis";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getGmailClientForUser } from "~/server/google/gmail";
import { uploadEmailHtmlToS3 } from "~/server/aws/s3";

export const gmailRouter = createTRPCRouter({
  // ---------- 1) LIST THREADS (lightweight metadata) ----------
  listThreads: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session || !ctx.session.user) return [];

    const gmail = await getGmailClientForUser(ctx.session.user.id);

    const res = await gmail.users.threads.list({
      userId: "me",
      maxResults: 358, // keep it low to avoid quotas
    });

    const threads = res.data.threads ?? [];
    if (threads.length === 0) return [];

    // Build up the result by looping instead of 50 parallel requests
    const fullThreads: {
      id: string;
      threadId: string;
      snippet: string;
      subject: string;
      from: string;
      receivedAt: string;
    }[] = [];

    for (const t of threads) {
      if (!t.id) continue;

      const threadRes = await gmail.users.threads.get({
        userId: "me",
        id: t.id,
        format: "metadata", // allowed for threads
        metadataHeaders: ["Subject", "From", "Date"],
      });

      const messages = threadRes.data.messages ?? [];
      if (messages.length === 0) continue;

      const lastMsg = messages[messages.length - 1]!;

      const headers = lastMsg.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find(
          (h) => h.name?.toLowerCase() === name.toLowerCase(),
        )?.value ?? "";

      fullThreads.push({
        id: threadRes.data.id ?? t.id,
        threadId: threadRes.data.id ?? t.id,
        snippet: threadRes.data.snippet ?? "",
        subject: getHeader("Subject"),
        from: getHeader("From"),
        receivedAt: getHeader("Date"),
      });
    }

    return fullThreads;
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
          format: "full", // allowed by the Caribou/Gmail proxy
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
