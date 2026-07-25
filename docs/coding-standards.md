# Coding Standards

| Concern         | Choice                                                                                | Reason                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linting         | `eslint-config-next` (flat config)                                                    | Ships Next.js core-web-vitals + a11y rules already tuned for this framework — no reason to hand-roll or switch to Biome and lose that ecosystem fit.    |
| Import order    | `eslint-plugin-simple-import-sort`                                                    | Deterministic import grouping/order enforced automatically, not by convention people forget.                                                            |
| Formatting      | Prettier + `prettier-plugin-tailwindcss`                                              | The Tailwind plugin sorts utility classes into a canonical order — removes class-order bikeshedding from review entirely.                               |
| Pre-commit      | Husky `pre-commit` → `lint-staged`                                                    | Only lints/formats staged files — fast, doesn't re-lint the whole repo on every commit.                                                                 |
| Commit messages | Conventional Commits, enforced by commitlint on Husky's `commit-msg` hook             | Readable history, and a format tooling (changelogs, semantic release) can parse later if ever needed.                                                   |
| Path alias      | `@/*` → `src/*`                                                                       | Avoids `../../../lib/x` relative-import chains.                                                                                                         |
| Env validation  | `zod` schema in `src/config/env.ts`, only validating vars something currently imports | Fails fast with a clear message naming the exact missing/invalid variable, instead of a cryptic crash deep inside whatever first touched `process.env`. |
| Package manager | pnpm                                                                                  | Locked per Development Plan; do not introduce npm/yarn lockfiles alongside it.                                                                          |

## Commit message format

```
<type>(<optional scope>): <description>

feat(issues): add drag-and-drop between board columns
fix(auth): correct redirect after GitHub OAuth callback
chore(deps): bump prisma to 6.x
docs(readme): update setup steps for Neon branch databases
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`.

## What CI enforces on every PR

1. `pnpm lint` — must pass with zero errors
2. `pnpm typecheck` — must pass with zero errors
3. `pnpm build` — must succeed
4. (from the Testing milestone onward) `pnpm test` and `pnpm test:e2e`
