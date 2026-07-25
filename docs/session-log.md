# Session Log — Orbit

บันทึกละเอียดของทุกอย่างที่ตัดสินใจและทำมาตั้งแต่เริ่มโปรเจกต์ Orbit จนถึงตอนนี้
เก็บไว้เพื่อให้กลับมาอ่านทีหลัง (หรือให้คนอื่น/เซสชันอื่นอ่าน) แล้วเข้าใจ "ทำไม" ของทุกการตัดสินใจ
โดยไม่ต้องไล่อ่านแชตทั้งหมด

---

## ภาพรวมโปรเจกต์

**Orbit** คือ SaaS สำหรับติดตามงาน/issue ของทีมพัฒนาซอฟต์แวร์ แนวเดียวกับ Linear/Jira
มี AI copilot (ฟรี) ช่วยแตกงานจาก requirement สร้างขึ้นเพื่อใช้เป็นผลงานหลักสมัครงานสาย
Full Stack Software Engineer

กระบวนการทำงานทั้งหมดยึดหลัก **"ออกแบบก่อน ไม่รีบเขียนโค้ด"** — มีเอกสารออกแบบ 4 ฉบับที่อนุมัติ
เรียบร้อยแล้วก่อนเริ่มแตะโค้ดเลยสักบรรทัด จากนั้นจึงเข้าสู่ Phase 5 (Project Foundation) ซึ่งเป็น
ขั้นตอนพัฒนาจริงขั้นแรก

---

## Phase 1 — Product Vision

เปรียบเทียบ 3 แนวคิดผลิตภัณฑ์ก่อนเลือก:

| แนวคิด | คำอธิบาย                                                             | ผล                                                                            |
| ------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| A      | Universal PM Tool (Trello/Asana-style)                               | ไม่เลือก — เป็นโจทย์ portfolio ที่ถูกทำซ้ำมากที่สุด ไม่โชว์ความลึกทางวิศวกรรม |
| **B**  | **Dev-focused Issue Tracker (Linear/Jira-style) + AI Copilot เสริม** | **เลือก** — โชว์ multi-tenancy, RBAC, real-time sync, GitHub integration ครบ  |
| C      | AI-native PM (AI เป็นแกนหลัก)                                        | ไม่เลือก — เสี่ยงถูกมองเป็น "AI wrapper" ไม่มี engineering depth              |

**เอกสารที่ผลิต**: Product Vision, Problem Statement, Target Users, Features, User Roles,
User Flow, Tech Stack (ฉบับแรก), Competitor Analysis (Linear/Jira/Asana/ClickUp), MVP 3 เฟส

---

## Phase 2 — System Design (ฉบับแรก)

ออกแบบสถาปัตยกรรมรอบแรกโดยยังไม่ได้ล็อก Tech Stack เป็นทางการ:

- **System Architecture**: Modular Monolith (NestJS) — ไม่ใช่ Microservices เพราะทีมเล็ก
- **Database Schema / ERD**: organizations, memberships, projects, issues, labels, comments,
  activities (append-only jsonb), sprints, github_installations, pull_requests, notifications,
  ai_generation_jobs, refresh_tokens
- **REST API Design**: `/api/v1`, cursor-based pagination, RFC 7807 error format
- **Folder Structure**: Monorepo (Turborepo + pnpm workspaces) — apps/web, apps/api
- **Authentication Flow**: JWT + refresh token rotation (custom), GitHub OAuth แยกจาก GitHub App
- **RBAC**: Owner/Admin/Member/Viewer ระดับ organization
- **AI Integration**: BullMQ queue + Worker process แยก, human-in-the-loop ก่อนสร้าง issue จริง
- **Deployment Architecture**: Vercel (web) + Fly.io (API + Worker แยก), Neon, Upstash Redis, R2

> **หมายเหตุ**: สถาปัตยกรรมฉบับนี้ถูก "ปรับ" ทั้งหมดใน Phase 4 เมื่อ Tech Stack ถูกล็อกเป็น
> Next.js Route Handlers บน Vercel เท่านั้น (ดูหัวข้อ Phase 4)

---

## Phase 3 — UI/UX Design System

ออกแบบประสบการณ์ผู้ใช้และ Design System เต็มรูปแบบ ก่อนล็อก Tech Stack เช่นกัน:

- **Sitemap**: Auth → Organization → Project (3 ชั้น), issue detail เป็น slide-over ไม่ใช่หน้าเต็ม
- **Navigation**: 5 โซน — Global Bar, Primary Sidebar (ยุบเป็นไอคอนได้), View Tabs,
  Contextual Panel, Command Palette (⌘K)
- **Color Palette**: Neutral โทนเย็นแบบ slate + Accent เดียวคือ "ทองแดง" `#B2551E`
  (ใช้ร่วมกันทั้งปุ่มหลักและ priority "High" โดยตั้งใจ) แยกจากสีสถานะ/priority ที่เป็นคนละชุดสี
  โดยเจตนา (semantic ≠ brand)
  - Status: Backlog `#9AA0A3` / Todo `#5B7A99` / In Progress `#D9A62E` / In Review `#2C7FA6` /
    Done `#1E7A6E` / Cancelled `#A65D5D`
  - Priority: Urgent `#C0392B` / High `#B2551E` / Medium `#C9A227` / Low `#8B9296` /
    None `#C7CBC9`
- **Typography**: Inter (UI, body 14px เพื่อความหนาแน่น) + JetBrains Mono (issue key, timestamp, code)
- **Components**: Button (primary/secondary/ghost/danger), status/priority pill, avatar,
  input, kanban card, toast
- **Dashboard/Mobile Layout**: Kanban บน desktop → List + bottom tab bar บนมือถือ
- **User Journey**: onboarding / วิศวกรทำงานประจำวัน / PM ใช้ AI breakdown
- **Wireframes**: Login, Command Palette, Issue Detail slide-over, AI Breakdown modal
  (checkbox แบบ opt-out แต่ยังต้องยืนยันก่อนสร้างจริงเสมอ)

---

## Phase 4 — Development Plan (Tech Stack ถูกล็อกที่นี่)

ผู้ใช้กำหนด **Locked Tech Stack** มาให้ตรงนี้ ซึ่งต่างจาก Phase 2 มาก:

- Frontend: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Backend: **Next.js Route Handlers** (ไม่ใช่ NestJS แยก service อีกต่อไป)
- Database: PostgreSQL (Neon) · ORM: Prisma
- Auth: Auth.js (NextAuth) · Deployment: **Vercel เท่านั้น** (ไม่ใช่ Fly.io แล้ว)
- Storage: Cloudinary · Charts: Recharts · State: Zustand
- AI: Groq (ฟรี) + Mock provider สลับได้ด้วย env var
- Docs: Markdown

**ผลจากการล็อก stack ใหม่ → ต้องปรับสถาปัตยกรรม 2 จุดจาก Phase 2**:

1. **ตัด BullMQ/Redis/Worker process** — Vercel serverless function ไม่มีที่ให้รัน worker ค้าง
   ตลอดเวลา จึงเรียก AI แบบ streaming ตรงใน Route Handler แทนการเข้าคิว
2. **ตัด WebSocket Gateway** — Vercel function ไม่รองรับ connection ค้างแบบ WebSocket จึงใช้
   TanStack Query polling/revalidation แทน real-time push (ยอมรับเป็น MVP trade-off)

**11 Milestones**: Setup → Authentication → Database → Workspace → Task Management →
Dashboard → Admin Dashboard → AI Features → API Documentation → Testing → Deployment
(รวม ~56 วันทำการ)

**Risk ที่ระบุไว้ล่วงหน้า**: Vercel timeout ตอนเรียก AI, ไม่มี real-time จริง, Groq rate limit,
Neon connection pool, scope creep, GitHub webhook test ยาก, RBAC ช่องโหว่, Cloudinary quota

---

## Phase 5 — Project Foundation (กำลังทำอยู่)

### รอบที่ 1: อนุมัติ + Handover Report

ก่อนเริ่มเขียนโค้ดจริง มีการขอ confirm 4 จุดที่ Locked Stack ไม่ได้ระบุชัด:

1. **TanStack Query** — อนุมัติให้ใช้เป็น **Server State** (Zustand คุม **Client/UI State**
   เท่านั้น) — แบ่งหน้าที่ชัดเจน ถือเป็นส่วนหนึ่งของ Foundation ไม่ใช่การเปลี่ยน Architecture
2. **Authentication** — **ห้าม**ติดตั้ง/config Auth.js ในเฟสนี้เด็ดขาด (ไม่มี auth.ts,
   ไม่มี SessionProvider แม้แต่ placeholder) — เริ่มที่ Milestone Authentication เท่านั้น
3. **Middleware** — สร้างได้แต่ต้อง pass-through ล้วน (`return NextResponse.next()`)
   ไม่มี auth/RBAC/redirect ใดๆ
4. **Package Manager** — pnpm

บวก **Testing Foundation**: ติดตั้ง Vitest + React Testing Library + Playwright
(config/โครงสร้างเท่านั้น ยังไม่เขียน test จริง)

ระหว่างทางเกิดเหตุการณ์สำคัญ: คำสั่ง `npx shadcn@latest init` ถูก user สั่งหยุดกลางคัน
แต่ process เบื้องหลังยังทำงานต่อ (`pnpm add shadcn tw-animate-css @base-ui/react`)
→ ตรวจพบและ force-kill process ทั้ง 3 ตัวก่อนเขียน Handover Report เพื่อความปลอดภัย
(ยืนยันแล้วว่า package.json ไม่ถูกเขียนทับก่อนถูกฆ่า)

**ประเด็นที่ต้องหยุดถามในตอนนั้น**: shadcn/ui CLI เวอร์ชันล่าสุด (v4.14.x) เปลี่ยน default
primitive จาก Radix เป็น "Base UI" ใหม่ (`@base-ui/react`) — ไม่ตรงกับแผนเดิม

### รอบที่ 2: อนุมัติแก้ปัญหา shadcn + เดินหน้า Foundation

**การตัดสินใจ**: ใช้ shadcn/ui เวอร์ชันล่าสุดแต่ระบุ Primitive เป็น **Radix** อย่างชัดเจน
(`npx shadcn@latest init -d -b radix`) — **ห้าม**ใช้ Base UI / **ห้าม**เพิ่ม `@base-ui/react`

ผลลัพธ์: ได้ `components.json` แบบ `"style": "radix-nova"` ตรงตามต้องการ พร้อม dependency
`radix-ui@1.6.5`, `tw-animate-css@1.4.0`, `shadcn@4.14.0` (ย้ายไป devDependencies เพราะเป็น
CLI tool ไม่ใช่ runtime code)

**งานที่ทำเสร็จในรอบนี้**:

- ติดตั้ง dependency ครบทั้งหมดตาม Locked Stack (runtime + dev + testing)
- Coding Standards: ESLint (+ simple-import-sort), Prettier (+ tailwindcss plugin), Husky
  (pre-commit → lint-staged, commit-msg → commitlint), `.gitattributes` บังคับ LF ให้ hook script,
  ตั้ง exec bit ผ่าน `git update-index --chmod=+x` เพราะ NTFS ไม่รองรับ chmod ตรงๆ
- Design tokens ใน `globals.css` (Tailwind v4 `@theme`) ตาม UI/UX doc ครบ light/dark
  **+ เพิ่ม token ที่ shadcn component ต้องใช้** (primary, secondary, muted, destructive, card,
  popover, input, ring) โดย map เข้ากับสีของ Orbit เอง ไม่ใช้ค่า default ของ shadcn
- shadcn components: Button, Input, Card, Badge, Skeleton, Dialog (restyle ด้วย Orbit tokens
  แล้ว) + EmptyState ที่เขียนเอง (shadcn ไม่มีให้)
- Layout components: Navbar, Footer, PageContainer, Sidebar (+ Zustand store สำหรับ
  collapse state), Breadcrumb, ThemeToggle (ใช้งานได้จริงผ่าน next-themes)
- **ตัดสินใจ (ไม่ได้ถามก่อน แต่บันทึกเหตุผลไว้)**: **ไม่สร้าง** `(auth)/layout.tsx` และ
  `(dashboard)/layout.tsx` ในเฟสนี้ เพราะยังไม่มี page ใดอยู่ข้างใต้เลย — layout.tsx ที่ไม่มี
  page จะเป็น dead code ที่ Next.js ไม่มีวันเรียกใช้ ขัดกับกติกา "หลีกเลี่ยง Dead Code/Placeholder"
  ที่เน้นย้ำไว้ ให้สร้างพร้อมกับ page แรกจริงในแต่ละ milestone แทน (บันทึกไว้ใน
  `docs/folder-structure.md` แล้ว)
- แก้หน้า `/` (landing) ให้ใช้ Navbar/Footer/PageContainer/ThemeToggle จริงแทน boilerplate
  ของ create-next-app, ลบไฟล์ SVG ที่ไม่ใช้แล้ว (`file.svg`, `globe.svg`, `next.svg`,
  `vercel.svg`, `window.svg`)
- Providers: ThemeProvider, QueryProvider (TanStack Query + Devtools **เฉพาะ dev**,
  เช็คด้วย `process.env.NODE_ENV === "development"`), Toaster (sonner) — **ไม่มี** SessionProvider
- `src/lib/logger.ts` (wrapper เปลี่ยนไปใช้ Pino/Sentry ทีหลังได้โดยไม่กระทบ caller)
- `src/config/env.ts` (zod validate เฉพาะ `DATABASE_URL`/`DIRECT_URL` ที่มีจุดใช้งานจริงแล้ว
  — ไม่ validate ตัวแปรที่ยังไม่มีอะไรใช้ เพื่อไม่ให้เป็น dead validation)
- `prisma/schema.prisma` (datasource+generator เท่านั้น ไม่มี model), `src/lib/prisma.ts`
  (singleton), `prisma/seed.ts` (stub, import แบบ relative path ไม่ใช้ `@/` alias เพราะ `tsx`
  รัน standalone อาจ resolve alias ไม่ได้)
- `src/middleware.ts` — pass-through ล้วนตามสั่ง
- Next.js special files: `loading.tsx`, `error.tsx`, `global-error.tsx` (self-contained
  ไม่พึ่ง provider เพราะอาจ trigger ตอน root layout เองพังก็ได้), `not-found.tsx`
  → อัปเดตให้ใช้ shadcn Button จริงหลัง Button พร้อมใช้แล้ว
- Testing config: `vitest.config.ts` + `vitest.setup.ts`, `playwright.config.ts`,
  script ใน `package.json` (`test`, `test:watch`, `test:e2e`, `typecheck`) — ยังไม่มี test จริง
- Docs ครบ 5 ไฟล์ + README + ไฟล์นี้ (session-log.md)

### ✅ Prisma 7 blocker — แก้แล้ว (อนุมัติทางเลือก 1)

อนุมัติให้ปรับตามแนวทางใหม่ของ Prisma 7 โดยเพิ่ม 2 dependency ที่อนุญาต:
`@prisma/adapter-neon` + `@neondatabase/serverless` (ถือเป็นส่วนหนึ่งของ Prisma+Neon stack เดิม)

**สิ่งที่เปลี่ยน**:

- `prisma.config.ts` (ไฟล์ใหม่ที่ root) — คุม CLI (`generate`/`migrate`) เรียก
  `process.loadEnvFile()` เพื่อโหลด `.env` เอง (Node 22 built-in, **ไม่ต้องเพิ่ม `dotenv`**
  เป็น dependency ที่ 3 — เจอปัญหานี้ระหว่างทาง คือ Prisma 7 ไม่โหลด `.env` อัตโนมัติแล้ว
  แก้ด้วย Node API แทนการเพิ่ม library ใหม่)
- `prisma/schema.prisma` — เปลี่ยน generator เป็น `prisma-client` (ตัวใหม่ ทดแทน
  `prisma-client-js` ที่ deprecated แล้ว) พร้อม `output = "../src/generated/prisma"`,
  datasource เหลือแค่ `provider = "postgresql"` (ไม่มี url/directUrl แล้ว)
- `src/lib/prisma.ts` — สร้าง `PrismaClient` ผ่าน `PrismaNeon` adapter แทน connection
  string ตรง, import `PrismaClient` จาก `@/generated/prisma/client` (ไม่ใช่ `@prisma/client`
  อีกต่อไป)
- ตัด `DIRECT_URL` ออกจาก `env.ts`/`.env`/`.env.example` ทั้งหมด — ไม่จำเป็นอีกต่อไปเพราะ
  Neon adapter query ผ่าน HTTP ไม่ใช่ TCP
- `src/generated/` เข้า `.gitignore` + ยกเว้นจาก ESLint/Prettier (เป็น generated code)
- อัปเดต `docs/architecture.md` และ `docs/setup-guide.md` ให้ตรงกับแนวทางใหม่แล้ว

`pnpm prisma generate` รันผ่านสำเร็จหลังแก้ทั้งหมดนี้

### Completion Checklist — ผ่านครบทั้ง 5 ข้อ

รัน `prisma generate` → `lint` → `typecheck` → `build` → `test` ตามลำดับ เจอ 2 ปัญหาเล็กระหว่างทาง
(ไม่กระทบ Architecture/Stack แต่อย่างใด แก้เสร็จในตัวไม่ต้องหยุดถาม):

- **`pnpm build` พังที่ `/_not-found`** ด้วย `TypeError: i.createContext is not a function` —
  สาเหตุคือ `button.tsx`/`badge.tsx` ที่ shadcn generate มาใช้ `Slot` จาก `radix-ui` แต่ไม่มี
  `"use client"` กำกับไว้ ทำให้ Next.js พยายาม render เป็น Server Component แล้วไปชนกับ
  client-only API ข้างใน Radix Slot → เพิ่ม `"use client"` ให้ทั้งสองไฟล์ แก้จบ
- **`pnpm test` exit code 1 ทั้งที่ไม่มี error จริง** — Vitest ไม่พบไฟล์ test เลย (ตามสโคปที่ตกลงกัน
  ว่ายังไม่ต้องเขียน test) แล้ว default จะ exit 1 → เพิ่ม `--passWithNoTests` ใน script `test`
  ให้ผลลัพธ์สะท้อนความจริง (infra พร้อม ไม่มีอะไรพัง) แทนที่จะดูเหมือน fail

ผลสุดท้าย: `prisma generate` ✅ / `lint` ✅ / `typecheck` ✅ / `build` ✅ / `test` ✅ (0 ไฟล์ test
ตามที่ตกลงกันไว้) — ยังไม่ commit ใดๆ รอการอนุมัติ

---

## Standing Rules ที่ตกลงกันไว้ (ใช้ตลอดทุก Milestone ที่เหลือ)

- ทำทีละ Milestone ทีละ Feature เท่านั้น ห้ามขนานหลาย feature
- พบว่าต้องเปลี่ยน Architecture / Folder Structure / Tech Stack → **หยุดและอธิบายก่อนเสมอ**
  (รวมถึงการเพิ่ม library ใหม่ที่ไม่ได้อยู่ใน Locked Stack)
- จบ Milestone ต้องผ่าน lint + typecheck + build (และ test เมื่อมีแล้ว) ก่อนถือว่าเสร็จ
- จบ Milestone ต้องอัปเดต `/docs` และสรุปสิ่งที่ทำ/เหลือ/จะทำต่อ
- สร้างเฉพาะไฟล์ที่จำเป็นจริง หลีกเลี่ยง placeholder ที่ไม่มีการใช้งานและ dead code
- ก่อนเขียนโค้ดของ phase/milestone ใหม่ ต้องอธิบาย (1) จะทำอะไร (2) เหตุผล (3) โครงสร้าง
  แล้วรอ approve ก่อนเสมอ แม้ข้อความก่อนหน้าจะบอกให้ "ไปต่อได้" แล้วก็ตาม
- Server state ใช้ TanStack Query, Client/UI state ใช้ Zustand เท่านั้น ห้ามปนกัน

---

## Final Foundation Report (สรุปฉบับเต็มที่ส่งให้ผู้ใช้)

### Overall Progress

**100% ของ Project Foundation ตามขอบเขตที่อนุมัติ** — ครบทั้ง 11 งานย่อยและ Completion
Checklist ทั้ง 5 ข้อ ยังไม่มีการ commit ใดๆ เพิ่มจาก baseline (`e568cb0`) ตามคำสั่ง

### Quality Gate Results

| ขั้นตอน                | ผล        | หมายเหตุ                                                                                                                  |
| ---------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm prisma generate` | ✅ Passed | สร้าง client ที่ `src/generated/prisma` สำเร็จ                                                                            |
| `pnpm lint`            | ✅ Passed | เจอ 17 errors (import order, auto-fix ได้) + 1 error จริง (`react-hooks/set-state-in-effect` ใน ThemeToggle) — แก้หมดแล้ว |
| `pnpm typecheck`       | ✅ Passed | ไม่มี error                                                                                                               |
| `pnpm build`           | ✅ Passed | เจอ error จริง 1 จุด (ดูรายละเอียดด้านบน — ขาด `"use client"` ใน button.tsx/badge.tsx) — แก้แล้ว                          |
| `pnpm test`            | ✅ Passed | 0 test files ตามสโคป — เพิ่ม `--passWithNoTests` ให้ผลตรงความจริง                                                         |

### Updated File Structure (สรุป)

```
orbit/
├── prisma.config.ts          ← ใหม่ (Prisma 7)
├── prisma/{schema.prisma, seed.ts}
├── src/
│   ├── app/{layout,page,loading,error,global-error,not-found}.tsx, globals.css
│   ├── components/
│   │   ├── ui/{button,input,card,badge,skeleton,dialog,empty-state}.tsx
│   │   └── layout/{navbar,sidebar,sidebar-store,footer,breadcrumb,page-container,theme-toggle}
│   ├── config/env.ts
│   ├── lib/{prisma,logger,utils}.ts
│   ├── providers/{index,theme-provider,query-provider}.tsx
│   ├── generated/prisma/   ← gitignored, regenerated
│   └── middleware.ts
├── docs/ (6 ไฟล์ รวมไฟล์นี้)
└── README.md
```

`src/features/`, `services/`, `repositories/`, `types/`, `constants/`, `hooks/` ยังไม่มี
(ตั้งใจ — ยังไม่มีเนื้อหาให้ใส่จนกว่าจะถึง Milestone ถัดไป)

### Git Status (ณ ตอนที่รายงาน)

- Modified: 9 ไฟล์ · Added (staged): 2 ไฟล์ (`.husky/*`) · Deleted: 5 ไฟล์ (SVG ของ
  create-next-app) · Untracked: 45 ไฟล์ · มี commit เดียวก่อนหน้า (`e568cb0`) — ชุดนี้ยังไม่ commit

### Ready for Commit

**✅ พร้อม Commit** — ผ่าน Quality Gate ครบ, ไม่มี process ค้าง, ขอบเขตตรงตาม Foundation
ทุกประการ (ไม่มี Auth/RBAC/Business Logic/DB Model หลุดเข้ามา) — **รอคำสั่งให้ commit** ยังไม่ทำเอง

### ข้อเสนอแนะก่อนเข้า Milestone ถัดไป

1. **Node.js version**: ใช้ `process.loadEnvFile()` ต้องการ Node 20.6+/22+ — ควรระบุ `"engines"`
   ใน `package.json` ตอน Milestone Deployment
2. **`middleware` → `proxy` deprecation**: Next.js 16 เตือนว่า convention นี้กำลังถูกแทนที่ด้วย
   `proxy.ts` — ยังใช้งานได้ปกติตอนนี้ ควรพิจารณาเปลี่ยนตอน Milestone Authentication ที่จะเพิ่ม
   logic จริงเข้าไป (ไม่ต้องแก้สองรอบ)
3. **shadcn component ใหม่ในอนาคต**: ต้องเช็คว่ามี `"use client"` ครบก่อน build จริงทุกครั้ง
   (เจอ bug นี้ไปแล้ว 2 ไฟล์)
4. Milestone 2 (Authentication) พร้อมเริ่มได้ทันทีเมื่ออนุมัติ

---

## Pre-commit polish: CHANGELOG.md + ADRs

ก่อน commit จริง ผู้ใช้ขอเพิ่มเอกสารมาตรฐาน production อีก 2 อย่าง (ไม่แตะ
Architecture/Stack/Dependency/Business Logic ใดๆ):

- **`CHANGELOG.md`** (root) — รูปแบบ Keep a Changelog, `[0.1.0] - Project Foundation`
  สรุประดับ release ของทุกอย่างที่ทำใน Foundation
- **`docs/adr/`** — 5 ADR + README index:
  1. Use Next.js App Router
  2. Use Prisma 7 with Neon Adapter
  3. Use TanStack Query for Server State
  4. Use Zustand for Client/UI State
  5. Serverless-first Architecture on Vercel

  แต่ละอันมี Status/Context/Decision/Consequences/Trade-offs ครบ

`pnpm lint` + `pnpm typecheck` ผ่านทั้งคู่หลังเพิ่มเอกสาร (ไม่ได้ build ใหม่ตามที่บอกว่าไม่จำเป็น)
ยังไม่ commit — รอการอนุมัติ commit message

---

## Next Steps (เมื่อได้รับอนุมัติ)

1. Commit งานทั้งหมดของ Foundation (รวม CHANGELOG + ADR) เป็น milestone เดียว
   (รอคำสั่งให้ commit ก่อน)
2. เริ่ม Milestone 2 (Authentication) — ต้องอธิบายแผน+เหตุผล+โครงสร้างก่อนเขียนโค้ด ตามกติกาเดิม
