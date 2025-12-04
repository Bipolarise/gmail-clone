import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getGmailClientForUser } from "~/server/google/gmail";

export const gmailRouter = createTRPCRouter({
  listLabels: protectedProcedure.query(async ({ ctx }) => {
    const gmail = await getGmailClientForUser(ctx.session.user.id);

    const res = await gmail.users.labels.list({
      userId: "me",
    });

    return (res.data.labels ?? []).map((label) => ({
      id: label.id ?? "",
      name: label.name ?? "",
      type: label.type ?? "",
    }));
  }),
});
