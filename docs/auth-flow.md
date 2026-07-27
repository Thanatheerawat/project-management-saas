# Authentication Flow

Diagrams for the flows implemented in Milestone 2 (Identity & Access
Management). These are the flows the plan in `docs/session-log.md`
describes in prose — this file is the visual reference.

## Register → Mock Email Verification

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Route Handler
    participant D as Database
    participant E as MockEmailProvider

    C->>A: POST /api/auth/register {name, email, password}
    A->>D: check email uniqueness
    A->>A: hash password (bcryptjs)
    A->>D: create User (emailVerified = null)
    A->>D: create AuditLog (action=REGISTER)
    A->>E: send "verify your email" (mock)
    E->>E: logger.info() — no real email sent
    A-->>C: 201 {id, name, email} + session cookie (auto sign-in)
    C->>C: redirect to /verify-email (shows mock link/token on screen)
```

## Login (Credentials)

```mermaid
sequenceDiagram
    participant C as Client
    participant NA as Auth.js (/api/auth/callback/credentials)
    participant D as Database

    C->>NA: signIn("credentials", {email, password})
    NA->>D: find User by email
    alt user not found, inactive, or locked
        NA->>D: create AuditLog (action=LOGIN_FAILED)
        NA-->>C: generic "invalid credentials" error
    else password matches
        NA->>D: verify password hash (bcryptjs)
        NA->>D: reset failedLoginAttempts, set lastLoginAt
        NA->>D: create AuditLog (action=LOGIN_SUCCESS)
        NA-->>C: set JWT session cookie (httpOnly)
    else password does not match
        NA->>D: increment failedLoginAttempts, maybe set lockedUntil
        NA->>D: create AuditLog (action=LOGIN_FAILED)
        NA-->>C: generic "invalid credentials" error
    end
```

## Route Protection (Middleware)

```mermaid
flowchart TD
    Req["Incoming request"] --> Check{"Session cookie valid?"}
    Check -->|No| Protected{"Route is protected? (/profile, dashboard/**)"}
    Protected -->|Yes| Redirect1["Redirect → /login?callbackUrl=..."]
    Protected -->|No| Next1["next()"]
    Check -->|Yes| AuthPage{"Route is /login or /register?"}
    AuthPage -->|Yes| Redirect2["Redirect → /profile"]
    AuthPage -->|No| Next2["next()"]
```

## Forgot Password → Reset Password

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Route Handler
    participant D as Database
    participant E as MockEmailProvider

    C->>A: POST /api/auth/forgot-password {email}
    A->>D: find User by email (silently, no error either way)
    opt user exists
        A->>D: create PasswordResetToken (tokenHash, expiresAt)
        A->>D: create AuditLog (action=PASSWORD_RESET_REQUESTED)
        A->>E: send reset link (mock)
    end
    A-->>C: 200 "if that email exists, a link was sent" (always)

    C->>A: POST /api/auth/reset-password {token, newPassword}
    A->>D: look up PasswordResetToken by hash(token)
    alt token missing, expired, or already used
        A-->>C: 400 invalid or expired token
    else valid
        A->>D: update User.passwordHash, mark token usedAt
        A->>D: create AuditLog (action=PASSWORD_RESET_COMPLETED)
        A-->>C: 200 success → redirect to /login
    end
```

## Logout

```mermaid
sequenceDiagram
    participant C as Client
    participant NA as Auth.js (/api/auth/signout)
    participant D as Database

    C->>NA: signOut()
    NA->>D: create AuditLog (action=LOGOUT)
    NA-->>C: clear session cookie
    C->>C: redirect to /
```
