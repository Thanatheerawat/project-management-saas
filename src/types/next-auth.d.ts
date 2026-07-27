import type { DefaultSession } from "next-auth";

import type { PlatformRole } from "@/generated/prisma/client";

// Module augmentation: next-auth's default Session/User/JWT shapes don't
// know about our `id`/`role` fields — this makes them type-safe wherever
// `session.user.role` etc. is read, instead of everyone casting `any`.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: PlatformRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: PlatformRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: PlatformRole;
  }
}
