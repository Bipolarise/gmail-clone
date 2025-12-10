// src/server/api/routers/gmail.ts
import { z } from "zod";
import type { gmail_v1 } from "googleapis";
import { TRPCError } from "@trpc/server";

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
  labelIds: string[];
};

export const gmailRouter = createTRPCRouter({
  // ---------- 1) LIST THREADS (FROM DB) ----------
  listThreads: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session || !ctx.session.user) return [];

    const userId = ctx.session.user.id;

    const threads = await db.gmailThread.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { internalDate: "desc" },
          take: 1,
        },
      },
    });

    return threads.map((t): ThreadRow => {
      const last = t.messages[0];
      const received = last?.internalDate ?? t.updatedAt ?? new Date();

      return {
        id: t.id,
        threadId: t.id,
        snippet: t.snippet ?? last?.snippet ?? "",
        subject: t.subject ?? last?.subject ?? "",
        from: last?.from ?? "",
        receivedAt: received.toISOString(),
        labelIds: last?.labelIds ?? [],
      };
    });
  }),

  // ---------- 2) GET FULL CONVERSATION THREAD ----------
  getThreadDetail: publicProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session || !ctx.session.user) return null;

      const gmail = await getGmailClientForUser(ctx.session.user.id);

      const threadRes = await gmail.users.threads.get({
        userId: "me",
        id: input.threadId,
        format: "full",
      });

      const messages = threadRes.data.messages ?? [];

      // If empty thread
      if (messages.length === 0) {
        return {
          threadId: input.threadId,
          conversation: [],
        };
      }

      // Extract message body (html + text)
      const extractBody = (
        part: gmail_v1.Schema$MessagePart
      ): { html?: string; text?: string } => {
        if (!part) return {};
        let html, text;

        if (part.body?.data) {
          const decoded = Buffer.from(part.body.data, "base64").toString("utf8");
          if (part.mimeType === "text/html") html = decoded;
          if (part.mimeType === "text/plain") text = decoded;
        }

        if (part.parts) {
          for (const child of part.parts) {
            const res = extractBody(child);
            if (!html && res.html) html = res.html;
            if (!text && res.text) text = res.text;
          }
        }

        return { html, text };
      };

      // Convert each Gmail message to clean conversation item
      const conversation = messages.map((msg) => {
        const payload = msg.payload ?? {};
        const headers = payload.headers ?? [];

        const getHeader = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
            ?.value ?? "";

        const { html, text } = extractBody(payload);

        return {
          id: msg.id!,
          from: getHeader("From"),
          date: getHeader("Date"),
          snippet: msg.snippet ?? "",
          html: html ?? "",
          text: text ?? "",
        };
      });

      return {
        threadId: input.threadId,
        conversation,
      };
    }),

  // ---------- 3) SEND EMAIL (supports reply threading) ----------
  sendEmail: publicProcedure
    .input(
      z.object({
        to: z.string().min(1),
        cc: z.string().optional(),
        bcc: z.string().optional(),
        subject: z.string().default(""),
        body: z.string().default(""),
        threadId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session || !ctx.session.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const gmail = await getGmailClientForUser(ctx.session.user.id);
      const fromAddress = ctx.session.user.email ?? "me";

      const lines: string[] = [
        `From: ${fromAddress}`,
        `To: ${input.to}`,
      ];

      if (input.cc) lines.push(`Cc: ${input.cc}`);
      if (input.bcc) lines.push(`Bcc: ${input.bcc}`);

      // ----- Reply threading -----
      if (input.threadId) {
        try {
          const threadRes = await gmail.users.threads.get({
            userId: "me",
            id: input.threadId,
            format: "metadata",
            metadataHeaders: ["Message-ID"],
          });

          const msgs = threadRes.data.messages ?? [];
          const last = msgs[msgs.length - 1];
          const headers = last?.payload?.headers ?? [];

          const msgIdHeader = headers.find(
            (h) => h.name?.toLowerCase() === "message-id"
          );

          if (msgIdHeader?.value) {
            lines.push(`In-Reply-To: ${msgIdHeader.value}`);
            lines.push(`References: ${msgIdHeader.value}`);
          }
        } catch (e) {
          console.error("Failed fetching Message-ID for threading", e);
        }
      }

      // Content
      lines.push(
        `Subject: ${input.subject}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        "",
        input.body
      );

      const raw = lines.join("\r\n");

      const encoded = Buffer.from(raw)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encoded,
          threadId: input.threadId,
        },
      });

      return {
        id: res.data.id ?? null,
        threadId: res.data.threadId ?? null,
      };
    }),

  // ---------- 4) STAR / UNSTAR THREAD ----------
  toggleStar: publicProcedure
    .input(z.object({ threadId: z.string(), starred: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session || !ctx.session.user)
        throw new TRPCError({ code: "UNAUTHORIZED" });

      const userId = ctx.session.user.id;
      const gmail = await getGmailClientForUser(userId);

      await gmail.users.threads.modify({
        userId: "me",
        id: input.threadId,
        requestBody: input.starred
          ? { addLabelIds: ["STARRED"] }
          : { removeLabelIds: ["STARRED"] },
      });

      // Update in DB as well
      try {
        const messages = await db.gmailMessage.findMany({
          where: { userId, threadId: input.threadId },
        });

        await Promise.all(
          messages.map((msg) => {
            const hasStar = msg.labelIds.includes("STARRED");
            const nextLabels = input.starred
              ? [...new Set([...msg.labelIds, "STARRED"])]
              : msg.labelIds.filter((l) => l !== "STARRED");

            if (input.starred && hasStar) return null;
            if (!input.starred && !hasStar) return null;

            return db.gmailMessage.update({
              where: { id: msg.id },
              data: { labelIds: nextLabels },
            });
          })
        );
      } catch (e) {
        console.error("Failed updating star label in DB", e);
      }

      return { ok: true };
    }),

  // ---------- 5) EMPTY TRASH ----------
  emptyTrash: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session || !ctx.session.user)
      throw new TRPCError({ code: "UNAUTHORIZED" });

    const userId = ctx.session.user.id;
    const gmail = await getGmailClientForUser(userId);

    const trashThreadIds: string[] = [];
    let pageToken: string | undefined;

    do {
      const res = await gmail.users.threads.list({
        userId: "me",
        labelIds: ["TRASH"],
        includeSpamTrash: true,
        maxResults: 100,
        pageToken,
      });

      for (const t of res.data.threads ?? []) {
        if (t.id) trashThreadIds.push(t.id);
      }

      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    await Promise.all(
      trashThreadIds.map((id) =>
        gmail.users.threads.delete({ userId: "me", id })
      )
    );

    await db.gmailMessage.deleteMany({
      where: { userId, threadId: { in: trashThreadIds } },
    });

    await db.gmailThread.deleteMany({
      where: { userId, id: { in: trashThreadIds } },
    });

    return { deleted: trashThreadIds.length };
  }),
});
