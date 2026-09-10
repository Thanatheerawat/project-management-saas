import { z } from "zod";

// Single source of truth for the password complexity policy — the exact
// same regexes back both server-side enforcement (passwordPolicySchema,
// spread into register/reset-password/change-password schemas) and the
// client-side live checklist (PasswordRequirementsChecklist), so the two
// can never disagree about what counts as a valid password. login.schema
// deliberately never uses this — an existing user's password must stay
// valid for login regardless of whether it meets today's policy.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
export const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
export const PASSWORD_NUMBER_REGEX = /[0-9]/;

export interface PasswordRequirementStatus {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}

export function getPasswordRequirementStatus(
  password: string,
): PasswordRequirementStatus {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasUppercase: PASSWORD_UPPERCASE_REGEX.test(password),
    hasLowercase: PASSWORD_LOWERCASE_REGEX.test(password),
    hasNumber: PASSWORD_NUMBER_REGEX.test(password),
  };
}

// Every password-setting schema (register/reset-password/change-password)
// spreads this in for its "new password" field instead of redeclaring the
// rule — see each schema file's own comment.
export const passwordPolicySchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, "validation.passwordMin8")
  .regex(PASSWORD_UPPERCASE_REGEX, "validation.passwordUppercase")
  .regex(PASSWORD_LOWERCASE_REGEX, "validation.passwordLowercase")
  .regex(PASSWORD_NUMBER_REGEX, "validation.passwordNumber");
