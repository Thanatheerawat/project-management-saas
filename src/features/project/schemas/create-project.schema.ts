import { z } from "zod";

// `status` isn't settable at creation — every new project starts ACTIVE
// (the Prisma default). `ownerId` isn't client input either — it's
// derived from the session in the route handler, never trusted from the
// request body.
export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(1000).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
