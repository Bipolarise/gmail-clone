import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getGmailClientForUser } from "~/server/google/gmail";

export const gmailRouter = createTRPCRouter({
  listThreads: publicProcedure.query(async ({ ctx }) => {
    // If user is not logged in, just return an empty list instead of throwing
    if (!ctx.session || !ctx.session.user) {
      return [];
    }

    const gmail = await getGmailClientForUser(ctx.session.user.id);

    const res = await gmail.users.threads.list({
      userId: "me",
      maxResults: 500,
    });

    const threads = res.data.threads ?? [];
    if (threads.length === 0) return [];

    const threadIds = threads.map((t) => t.id!).filter(Boolean);

    const fullThreads = await Promise.all(
      threadIds.map(async (id) => {
        const thread = await gmail.users.threads.get({
          userId: "me",
          id,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });

        const lastMessage =
          thread.data.messages?.[thread.data.messages.length - 1];

        const headers = lastMessage?.payload?.headers ?? [];

        const getHeader = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
            ?.value ?? "";

        return {
          id: thread.data.id ?? "",
          threadId: thread.data.id ?? "",
          snippet: thread.data.snippet ?? "",
          subject: getHeader("Subject"),
          from: getHeader("From"),
          receivedAt: getHeader("Date"),
        };
      }),
    );

    return fullThreads;
  }),
});
