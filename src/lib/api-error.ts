import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError } from "@/lib/auth/rbac";
import { logger } from "@/lib/logger";

// One shared handler so every Route Handler returns the same error shape
// (docs/security.md — consistent error envelope, no internal detail
// leaked to the client).
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "validation_error",
        message: "Invalid request data",
        issues: error.issues,
      },
      { status: 400 },
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: "forbidden", message: error.message },
      { status: 403 },
    );
  }

  logger.error("Unhandled API error", {
    message: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { error: "internal_error", message: "Something went wrong" },
    { status: 500 },
  );
}
