import { NextResponse } from "next/server";

import { profileSchema } from "@/features/user/schemas/profile.schema";
import { handleApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth/auth";
import { auditLogRepository } from "@/repositories/auth/audit-log.repository";
import { userRepository } from "@/repositories/auth/user.repository";

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not signed in" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const data = profileSchema.parse(body);

    const user = await userRepository.updateProfile(session.user.id, data);
    await auditLogRepository.record("PROFILE_UPDATED", user.id, data);

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
