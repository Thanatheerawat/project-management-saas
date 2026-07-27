# Security

How this system addresses the OWASP Top 10 (2021) categories relevant to
an authentication system. Written against the Milestone 2 design — updated
as later milestones (Workspace, Task Management) add their own surface
area.

## A01:2021 — Broken Access Control

- Route protection enforced in `middleware.ts` (real session check, not the
  Foundation-phase pass-through) — unauthenticated users can't reach
  `/profile` or any `(dashboard)` route.
- Platform role (`SUPER_ADMIN` / `ADMIN` / `USER`) checked via a single
  `requireRole()` helper (`src/lib/auth/rbac.ts`) — every authorization
  check goes through one function, not ad-hoc `if` statements scattered
  across route handlers. Org-level RBAC (Owner/Admin/Member/Viewer) is a
  separate, later concern (Workspace milestone) — see
  [auth-flow.md](./auth-flow.md) for what's in scope now.
- API routes re-check the session server-side even though middleware
  already gated the page — a client-side redirect is not an access control
  boundary by itself.

## A02:2021 — Cryptographic Failures

- Passwords hashed with `bcryptjs` (cost factor 12) — never stored or
  logged in plaintext, never returned in any API response.
- `PasswordResetToken` stores a **hash** of the token, not the raw value —
  a database leak alone can't be used to reset accounts.
- Session uses next-auth's signed JWT (`NEXTAUTH_SECRET`), httpOnly + secure +
  sameSite=lax cookie — the token itself is never exposed to JavaScript.

## A03:2021 — Injection

- Every request body validated with a `zod` schema before touching any
  business logic — malformed or unexpected fields are rejected at the
  boundary, not passed through.
- All database access goes through Prisma (parameterized queries) via the
  repository layer — no raw SQL string concatenation anywhere.

## A04:2021 — Insecure Design

- Forgot-password intentionally returns the same response whether or not
  the email exists — prevents account enumeration by design, not as an
  afterthought.
- Failed login attempts increment a counter (`failedLoginAttempts`) and
  can set `lockedUntil` on the `User` row — brute-forcing a password is
  throttled without needing external infrastructure.
- Email verification is mocked but the _flow_ (token generated, consumed
  once, expires) is real — swapping in a real email provider later doesn't
  change the security model, only the delivery mechanism.

## A05:2021 — Security Misconfiguration

- Secrets (`NEXTAUTH_SECRET`, `DATABASE_URL`) only ever live in `.env`
  (gitignored) — `.env.example` documents the shape with placeholders, never
  real values.
- Generic error messages returned to clients (`docs/auth-flow.md`) — stack
  traces and internal error detail are logged server-side via `logger`,
  never sent to the browser.

## A07:2021 — Identification and Authentication Failures

- Session strategy is JWT (stateless, short-lived per Auth.js defaults),
  not a hand-rolled token scheme.
- Account lockout after repeated failed attempts (see A04) directly
  addresses credential-stuffing/brute-force risk.
- Password reset tokens are single-use (`usedAt`) and time-limited
  (`expiresAt`) — a captured token has a narrow window of validity.

## A09:2021 — Security Logging and Monitoring Failures

- `AuditLog` records every security-relevant event: login success/failure,
  logout, password reset requested/completed, profile update — each with
  `userId` (nullable, for failed attempts against unknown emails),
  `action`, and `metadata` (IP/user-agent where available).
- This is what makes "who changed what, and when" answerable after the
  fact — a gap that's expensive to retrofit once real users exist, so it's
  designed in at Milestone 2 rather than added later.

## Not yet in scope (flagged for later, not silently skipped)

- **Distributed rate limiting** — the DB-counter approach (A04) works
  per-account but doesn't stop distributed attempts across many accounts
  or IPs. A real solution (e.g. Upstash Ratelimit) is a deliberate future
  addition, not part of Milestone 2 — see the Risks section of the
  Milestone 2 plan.
- **Content-Security-Policy / security headers** — no CSP, HSTS, or
  `X-Frame-Options` configured yet. Worth adding once there's real
  user-generated content to guard against (Task Management milestone).
- **2FA/MFA** — out of scope for Milestone 2's Credentials-only flow.
