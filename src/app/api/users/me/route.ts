import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { userRepository } from "@/repositories/auth/user.repository";

// Reads fresh from the database rather than the JWT payload — the
// session token only carries id/role (cheap, for authorization checks),
// not fields like emailVerified that can change without a re-login.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const user = await userRepository.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: "not_found", message: "Account not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: user.emailVerified,
      role: user.role,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
