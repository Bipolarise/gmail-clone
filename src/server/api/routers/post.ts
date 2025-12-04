import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { CreatePostInputSchema } from "~/services/post/service";

export const postRouter = createTRPCRouter({
  // Simple public "hello" example – used by the template
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  // Still protected because it uses the logged-in user,
  // but no longer depends on ctx.postService
  create: protectedProcedure
    .input(CreatePostInputSchema.pick({ name: true }))
    .mutation(async ({ ctx, input }) => {
      // TEMP STUB: just echo back a fake "post" object
      return {
        id: "temp-id",
        name: input.name,
        createdBy: {
          id: ctx.session.user.id,
          name: ctx.session.user.name ?? "",
          email: ctx.session.user.email ?? "",
          image: ctx.session.user.image ?? "",
        },
        createdAt: new Date(),
      } as any;
    }),

  // These three used to call ctx.postService – now they are safe stubs
  latest: publicProcedure.query(async () => {
    // No posts implemented yet
    return null;
  }),

  all: publicProcedure.query(async () => {
    // No posts implemented yet
    return [];
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async () => {
      // No posts implemented yet
      return null;
    }),

  // This one is just a demo secret message – keep it public for now
  getSecretMessage: publicProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
