import { z } from "zod";

import type { PlatformRole } from "@/generated/prisma/client";

// `satisfies` fails to compile if PlatformRole (schema.prisma) ever
// diverges from this literal list — same pattern as ISSUE_STATUSES/
// ISSUE_PRIORITIES (features/issue/schemas/).
export const PLATFORM_ROLES = [
  "USER",
  "ADMIN",
  "SUPER_ADMIN",
] as const satisfies readonly PlatformRole[];

// Both fields are optional individually, but at least one must be
// present — an empty PATCH body is a validation error, not a silent
// no-op. Route-level rules (who may set `role` vs `isActive`, and the
// self-role-change/self-deactivation guards) are enforced in the Route
// Handler, not here — this schema only validates shape.
export const updateAdminUserSchema = z
  .object({
    isActive: z.boolean().optional(),
    role: z.enum(PLATFORM_ROLES).optional(),
  })
  .refine((data) => data.isActive !== undefined || data.role !== undefined, {
    message: "At least one of isActive or role must be provided",
  });

export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
