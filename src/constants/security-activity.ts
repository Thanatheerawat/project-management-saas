import type { AuditAction } from "@/generated/prisma/client";

// M8.6: deliberately excludes PROFILE_UPDATED — that event exists (and is
// shown to admins via src/features/admin/audit-log-response.ts's
// AUDIT_ACTIONS, which includes it) but isn't a *security* event the way
// the other 8 are; showing "Profile updated" under "Security Activity"
// would mislabel an ordinary account edit as a security concern. `satisfies
// readonly AuditAction[]` fails to compile if AuditAction (schema.prisma)
// ever diverges from this literal list — same pattern AUDIT_ACTIONS itself
// uses.
export const SECURITY_ACTIVITY_ACTIONS = [
  "REGISTER",
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGOUT",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "EMAIL_VERIFIED",
  "PASSWORD_CHANGED",
] as const satisfies readonly AuditAction[];

export type SecurityActivityAction = (typeof SECURITY_ACTIVITY_ACTIONS)[number];

// Stable translation-key identifiers, not the display text itself (same
// "stable identifier -> t(key)" technique as validation-messages.ts) — the
// component calls useTranslations("profile") and looks up label/
// description here per event, keeping this file free of any literal
// English/Thai string.
export const SECURITY_ACTIVITY_MESSAGE_KEYS: Record<
  SecurityActivityAction,
  { label: string; description: string }
> = {
  REGISTER: {
    label: "securityActivity.events.register.label",
    description: "securityActivity.events.register.description",
  },
  LOGIN_SUCCESS: {
    label: "securityActivity.events.loginSuccess.label",
    description: "securityActivity.events.loginSuccess.description",
  },
  LOGIN_FAILED: {
    label: "securityActivity.events.loginFailed.label",
    description: "securityActivity.events.loginFailed.description",
  },
  LOGOUT: {
    label: "securityActivity.events.logout.label",
    description: "securityActivity.events.logout.description",
  },
  PASSWORD_RESET_REQUESTED: {
    label: "securityActivity.events.passwordResetRequested.label",
    description: "securityActivity.events.passwordResetRequested.description",
  },
  PASSWORD_RESET_COMPLETED: {
    label: "securityActivity.events.passwordResetCompleted.label",
    description: "securityActivity.events.passwordResetCompleted.description",
  },
  EMAIL_VERIFIED: {
    label: "securityActivity.events.emailVerified.label",
    description: "securityActivity.events.emailVerified.description",
  },
  PASSWORD_CHANGED: {
    label: "securityActivity.events.passwordChanged.label",
    description: "securityActivity.events.passwordChanged.description",
  },
};
