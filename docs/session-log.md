# Session Log — Orbit

บันทึกละเอียดของทุกอย่างที่ตัดสินใจและทำมาตั้งแต่เริ่มโปรเจกต์ Orbit จนถึงตอนนี้
เก็บไว้เพื่อให้กลับมาอ่านทีหลัง (หรือให้คนอื่น/เซสชันอื่นอ่าน) แล้วเข้าใจ "ทำไม" ของทุกการตัดสินใจ
โดยไม่ต้องไล่อ่านแชตทั้งหมด

---

## TL;DR — ถ้าเปิดแชทใหม่ อ่านตรงนี้ก่อน

**Orbit** = SaaS ติดตามงาน/issue สำหรับทีม dev (แนว Linear/Jira) + AI copilot ฟรี
ทำเป็นผลงานสมัครงานสาย Full Stack ทำงานแบบ "ออกแบบก่อน อนุมัติทีละขั้น ห้ามข้าม" เสมอ
(กติกาเต็มอยู่ท้ายไฟล์นี้ หัวข้อ "Standing Rules")

**Tech stack ที่ล็อกไว้แล้ว (ห้ามเปลี่ยนโดยไม่ถาม)**: Next.js App Router + TypeScript +
Tailwind v4 + shadcn/ui (Radix) + Prisma 7 (ผ่าน `@prisma/adapter-neon`, ไม่ใช้ url/directUrl
แบบเดิม) + Neon Postgres + next-auth **v4** (ไม่ใช่ v5 — ดู ADR-006) + TanStack Query
(server state) + Zustand (client/UI state เท่านั้น) + Vercel — รายละเอียดเหตุผลทั้งหมดอยู่ใน
`docs/adr/`

**สถานะตอนนี้ (ล่าสุด)**: Foundation (v0.1.0), Milestone 2 (v0.2.0, commit `1e9393b`), และ
**Milestone 3 (v0.3.0, commit `83808bf`)** commit+tag+push ขึ้น GitHub สำเร็จแล้วทั้ง 3 ตัว
(`https://github.com/Thanatheerawat/project-management-saas`, branch `main`) — `git log --oneline`
ล่าสุด: `83808bf`(M3) → `1e9393b`(M2) → `73f6e4a`(Foundation) → `e568cb0`(scaffold)

**กำลังทำ Milestone 4 (Task Management Core / Issue tracking)** แบบ incremental เข้มงวดกว่า M2/M3
เดิม — ผู้ใช้สั่งทำทีละ increment เล็กๆ ชัดเจน "proceed with Increment N only... stop immediately...
do NOT continue to Increment N+1" ทุกรอบ (ต่างจาก M3 ที่บางช่วงอนุมัติหลาย increment รวดเดียว)
ทำเสร็จแล้ว **6 increment** (นับ 5A+5B แยกกัน): (1) Prisma schema + migration
(`Issue`/`Label`/`IssueLabel`/`Comment` + `Project.key`/`issueCounter`), (2) Repository + zod
schema + response mapper, (3) Issue API (5 endpoint), (4) Label API + Comment API +
`IssueLabel` repository (10 endpoint), (5A) TanStack Query hooks (16 ไฟล์), (5B) Kanban board
shell + columns + issue card (mount บนหน้า project detail เดิม ไม่สร้าง route ใหม่), (6) Create
Issue dialog + Edit Issue UI + Status change UI + Label assignment UI + Comment UI + หน้า Issue
detail เต็มรูปแบบ (route ใหม่ `.../issues/[issueId]`, **ไม่มี API endpoint ใหม่เลย** — ต่อกับของเดิม
ทั้งหมด) จากนั้นทำ **Architecture & Code Audit** แบบ read-only (9 findings, ไม่มี correctness bug)
ตามด้วย **Cleanup Pass เล็กๆ** ตามคำแนะนำของ audit: extract `resolveIssueContext()`/
`validateAssignee()` (ลดโค้ดซ้ำ ~70 บรรทัดข้าม 8 handler) + แก้ TanStack Query cache invalidation
ของ label attach/detach (Kanban board เคยค้าง label เก่าจนกว่า staleTime จะหมด ตอนนี้ invalidate
ถูก query key แล้ว) จากนั้นทำ **Increment 7 (Tests)**: integration test ใหม่ 4 ไฟล์ (55 test) ครอบ
Issue/Label/Comment/IssueLabel API ครบ + RBAC + workspace isolation + invalid assignee + duplicate
project key + concurrency test สำหรับ atomic issue numbering (เรียก `issueRepository.create()`
ตรงๆ พร้อมกัน 10 ครั้ง ยืนยัน `number` ไม่ซ้ำ) รวม unit 62 + integration 125 ผ่านหมด จากนั้นทำ
**Increment 8 (Playwright e2e)**: 2 ไฟล์ใหม่ (`issue-flow.spec.ts` session เดียวครบทุก CRUD/
status/label/comment/delete, `issue-permissions.spec.ts` 3 browser context ครอบ member invite/
RBAC/cross-workspace) เจอบั๊กใน test เอง (URL regex match คำว่า "new" โดยไม่ตั้งใจ) แก้แล้ว
ยืนยันเสถียรด้วย production build (`pnpm build && pnpm start`) ผ่าน **59/59 สองรอบติดกัน** —
**ยังไม่ commit ใดๆ ของ M4 เลย** (`git status` ล่าสุดมีแต่ modified/untracked ทั้งหมด) รอการอนุมัติ
Increment 8 ก่อนเริ่ม Increment 9 (docs)

**ถ้าจะทำงานต่อ**: เช็ค `git status`/`git log` จริงก่อนเชื่อไฟล์นี้ทั้งหมดเสมอ — M4 ทำแบบ
increment-ต่อ-increment เข้มงวด (**ห้ามข้ามขั้นตอน ห้ามเริ่ม increment ถัดไปเองโดยไม่รอคำสั่ง แม้
increment ก่อนหน้าจะผ่าน quality gate ครบก็ตาม**) ดูหัวข้อ "Milestone 4" ด้านล่างสำหรับรายละเอียด
ทุก increment ที่ทำไปแล้ว และหัวข้อ "Next Steps" ท้ายไฟล์สำหรับสถานะล่าสุดสุด

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

## Foundation Committed: v0.1.0

Commit `73f6e4a` ("feat(core): complete project foundation") + annotated tag `v0.1.0`
— working tree clean หลัง commit (pre-commit hook รัน Prettier reformat ให้อัตโนมัติ
รวมอยู่ใน commit เดียวกัน)

## Milestone 2 Development Plan — ปรับก่อนเริ่ม Implementation

อนุมัติแผน Milestone 2 (Identity & Access Management) โดยรวม พร้อมขอปรับ 5 จุดก่อนเริ่มเขียนโค้ด
(ยังคง Architecture/Stack เดิมทั้งหมด):

1. **Platform Role ขยายเป็น 3 ระดับ**: `SUPER_ADMIN` > `ADMIN` > `USER` (จากเดิม 2 ระดับ)
2. **เพิ่มฟิลด์ใน `User`** (แผนเท่านั้น ยังไม่สร้างจริง): `isActive`, `lastLoginAt`,
   `failedLoginAttempts`, `lockedUntil`
3. **เพิ่ม `AuditLog` เข้า domain model** (ยังไม่ implement) — บันทึก LOGIN_SUCCESS/FAILED,
   LOGOUT, PASSWORD_RESET_REQUESTED/COMPLETED, PROFILE_UPDATED พร้อม `userId` (nullable),
   `action`, `metadata` (jsonb)
4. **เพิ่ม `GET /api/auth/session`** ใน API design — ชี้แจงว่านี่คือ endpoint ที่ Auth.js
   มีให้อยู่แล้วในตัว (ผ่าน catch-all route) ไม่ใช่โค้ดที่ต้องเขียนเอง
5. **เพิ่มเอกสาร 2 ไฟล์** (สร้างจริงแล้วตอนนี้ เพราะเป็นเอกสารไม่ใช่โค้ด):
   - [`docs/auth-flow.md`](./auth-flow.md) — Mermaid sequence/flow diagram ครบ 5 flow
     (Register+Mock Verify, Login, Route Protection, Forgot/Reset Password, Logout)
   - [`docs/security.md`](./security.md) — สรุปแนวทางตาม OWASP Top 10 (2021) ที่เกี่ยวข้อง
     (A01, A02, A03, A04, A05, A07, A09) + หัวข้อที่ยังไม่อยู่ใน scope (rate limiting กระจาย,
     CSP, 2FA)

ยังไม่เขียนโค้ด ไม่ติดตั้ง package ใดๆ — รอการอนุมัติแผนที่ปรับแล้วก่อนเริ่ม Implementation จริง

---

## Milestone 2 — Implementation

อนุมัติให้เริ่มเขียนโค้ดจริงแบบ incremental รายงานทุกช่วง ห้าม commit/tag/push จนกว่าจะสั่ง
ทำ 6 increment ตามลำดับ:

### Increment 1 — Prisma Schema + Dependencies

ติดตั้ง `next-auth` + `bcryptjs`, เพิ่ม 6 model (`PlatformRole`/`AuditAction` enum,
`User` ขยาย, `Account`, `Session`, `VerificationToken`, `PasswordResetToken`, `AuditLog`)
`prisma generate` ผ่าน **ค้นพบสำคัญ**: `next-auth` resolve เป็น **v4.24.15 ไม่ใช่ v5**
(v5 ยัง beta) — ไม่กระทบ Dependency/Schema/Folder Structure ใดๆ แค่วิธีเขียนโค้ดภายในเปลี่ยน
(ดู ADR-006) ลบ `@types/bcryptjs` ที่ deprecated ออกทันที (bcryptjs 3.x มี type ในตัวแล้ว)
**เจอ blocker**: `.env` ยังเป็น placeholder localhost — `prisma migrate dev` ต้องการ
`DATABASE_URL` จริงจาก Neon ที่ยังไม่ได้รับ

### Increment 2 — Auth Core + Repositories + Session Provider

`lib/auth/{password,rbac,auth.config,auth,tokens}.ts`, module augmentation
`types/next-auth.d.ts`, repositories (`user`, `password-reset-token`, `audit-log`,
`verification-token`), mock `email.service.ts`, zod schema 6 ตัว, `SessionProvider`
ต่อเข้า `AppProviders` **ค้นพบ**: ไม่ต้องใช้ `PrismaAdapter` เลย เพราะ Credentials+JWT
ไม่พึ่ง adapter (ประหยัด dependency ไปอีกตัว) เพิ่ม `NEXTAUTH_SECRET` เข้า env validation

- generate ค่า dev ไว้ใน `.env`

### Increment 3 — API Route Handlers

6 endpoint ครบ (`register`, `forgot-password`, `reset-password`, `verify-email`,
`users/me`, `users/profile`) + `lib/api-error.ts` (shared error envelope) แก้ comment
`VerificationToken` ใน schema ให้ตรงกับการใช้งานจริง (ใช้เก็บ mock email-verification
token โดยตรง ไม่ใช่ "สำรองไว้เฉยๆ" ตามที่เข้าใจผิดตอนวางแผน)

### Increment 4 — Middleware

`middleware.ts` เปลี่ยนจาก pass-through เป็น route protection จริงด้วย `getToken()`
จาก `next-auth/jwt` (คนละตัวกับ `auth()` wrapper เพราะรันบน Edge runtime)

### Increment 5 — UI (ใหญ่ที่สุด)

Hooks (TanStack Query) ครบทุก flow, Form component ด้วย `useState` + zod ธรรมดา
(**ไม่ใช้ form library** เพื่อไม่เพิ่ม dependency), pages ครบ 6 หน้า + layout 2 ชุด
`register/route.ts` คืน `mockVerifyUrl` ในผลลัพธ์ (ปลอดภัยเพราะ 201 เองก็ยืนยันมีบัญชีอยู่แล้ว
ต่างจาก forgot-password ที่ไม่คืน token ใดๆ) เจอ `react-hooks/set-state-in-effect` ใน
`ProfileForm` (เหมือนที่เจอกับ `ThemeToggle` ตอน Foundation) แก้ด้วยการแยก
component ย่อยที่ initialize state จากข้อมูลที่โหลดเสร็จแล้วโดยตรง `pnpm build` ผ่านสมบูรณ์

### Increment 6 — Unit Tests

`password.test.ts`, `rbac.test.ts`, `register.schema.test.ts` — 14 test ผ่านหมด
**Integration/E2E test เลื่อนออกไป** — ต้องมี DB จริงถึงจะเขียนแล้วรันได้จริง (ไม่ใช่แค่โค้ดลอยๆ)

### สถานะปัจจุบัน: รอ DATABASE_URL จริงจาก Neon

`pnpm lint` ✅ / `pnpm typecheck` ✅ / `pnpm build` ✅ / `pnpm test` ✅ (14 unit test)
**ค้างอยู่**: `pnpm prisma migrate dev` (ต้องต่อ DB จริง), integration test, e2e test,
และการทดสอบ flow จริงด้วยมือ (สมัคร/login/reset password จริง)

**เอกสารที่อัปเดต**: README.md, CHANGELOG.md (เพิ่ม `[Unreleased]` section),
`docs/security.md` (แก้ `AUTH_SECRET`→`NEXTAUTH_SECRET`), `docs/folder-structure.md`
(อัปเดต note ที่ล้าสมัยเรื่อง middleware/(auth)/(dashboard)), `docs/setup-guide.md`,
เพิ่ม **ADR-006** (next-auth v4 + no adapter)

ยังไม่ commit/tag ใดๆ ตามคำสั่ง

---

## Final Report ที่ส่งให้ผู้ใช้ (Milestone 2 — ยังไม่ปิดจ๊อบ)

### Progress

**~90% เสร็จ** — โค้ดทั้งหมดเขียนเสร็จและผ่าน Quality Gate ที่ไม่ต้องพึ่ง DB จริงครบทุกข้อ
ค้างอยู่จุดเดียว: ต้องมี `DATABASE_URL` จริงจาก Neon เพื่อรัน `pnpm prisma migrate dev`
และเขียน integration/e2e test ให้จบ

### Completed

Authentication (register/login/logout), Authorization พื้นฐาน, RBAC 3 ระดับ,
Session Management (JWT), Route Protection (middleware จริง), User Profile,
Forgot/Reset Password, Email Verification (Mock) — ครบทุก Feature ตามแผน

### Files Added (~40 ไฟล์)

`prisma/schema.prisma` (แก้), `docs/adr/006-*.md`, `docs/auth-flow.md`, `docs/security.md`,
`src/lib/auth/{password,rbac,auth.config,auth,tokens}.ts`, `src/lib/{api-client,api-error}.ts`,
`src/types/next-auth.d.ts`, `src/repositories/auth/{user,password-reset-token,audit-log,
verification-token}.repository.ts`, `src/services/auth/email.service.ts`,
`src/features/auth/{schemas×5, hooks×5, components×5}`,
`src/features/user/{schemas×1, hooks×2, components×2}`,
`src/app/api/auth/{[...nextauth],register,forgot-password,reset-password,verify-email}/route.ts`,
`src/app/api/users/{me,profile}/route.ts`, `src/app/(auth)/layout.tsx` + 5 pages,
`src/app/(dashboard)/layout.tsx` + profile page, `src/providers/session-provider.tsx`,
unit tests × 3

### Files Modified

`package.json`/`pnpm-lock.yaml`, `src/config/env.ts` (+`NEXTAUTH_SECRET`),
`.env`/`.env.example` (−`DIRECT_URL`, +`NEXTAUTH_SECRET`), `src/middleware.ts`,
`src/providers/index.tsx` (+SessionProvider), `README.md`, `CHANGELOG.md`,
`docs/{security,setup-guide,folder-structure,adr/README}.md`

### Packages Installed

`next-auth` (4.24.15 — อยู่ในสต็อกเดิม แค่ยังไม่เคยติดตั้ง), `bcryptjs` (3.0.3 — ตัวใหม่ตัวเดียว
ที่อนุมัติ) — ติดตั้ง `@types/bcryptjs` แล้วลบทิ้งทันทีเมื่อพบว่า deprecated/ไม่จำเป็น

### Problems Found (ไม่กระทบ Architecture/Stack ที่อนุมัติ)

1. `next-auth` เป็น v4.24.15 ไม่ใช่ v5 (บันทึกเป็น ADR-006)
2. ไม่ต้องใช้ `PrismaAdapter` — Credentials+JWT ไม่พึ่ง adapter
3. 🔴 บล็อกอยู่: ไม่มี `DATABASE_URL` จริง → migrate/integration test/e2e test/ทดสอบมือ
   ยังทำไม่ได้

### Verification Result

| คำสั่ง                    | ผล                 |
| ------------------------- | ------------------ |
| `pnpm prisma generate`    | ✅                 |
| `pnpm prisma migrate dev` | ❌ ต้องการ DB จริง |
| `pnpm lint`               | ✅                 |
| `pnpm typecheck`          | ✅                 |
| `pnpm build`              | ✅                 |
| `pnpm test`               | ✅ (14 unit test)  |

### Next Step

ต้องการ Neon `DATABASE_URL` จริงจากผู้ใช้ เพื่อรัน migration + เขียน/รัน integration
และ e2e test + ทดสอบ flow เต็มด้วยมือ 1 รอบ จากนั้นจะรายงาน Final Milestone 2 Report
ฉบับสมบูรณ์และรอการอนุมัติก่อน commit/tag — **ยังไม่ Commit/Tag/Push ใดๆ**

---

## Milestone 2 — Database Migration & Test Suites

ผู้ใช้ตั้งค่า `DATABASE_URL` จริงจาก Neon ใน `.env` แล้ว อนุมัติให้ทำงานที่ค้างต่อ

### Migration

`pnpm prisma migrate dev --name init_identity_access` สำเร็จ สร้าง migration แรก
(`prisma/migrations/20260727002815_init_identity_access/`) ยืนยันด้วย `pnpm prisma migrate status`
("Database schema is up to date!") และ query ตรงกับ Neon จริงเพื่อยืนยันว่าตารางถูกสร้างครบทั้ง 6:
`User`, `Account`, `Session`, `VerificationToken`, `PasswordResetToken`, `AuditLog`

### Integration Test Suite (29 test, 7 ไฟล์, `pnpm test:integration`)

รันกับ Neon จริงตัวเดียวกับ dev (ไม่มี test DB แยกใน Locked Stack) แต่ละ test สร้างข้อมูลด้วย
unique email แล้ว cleanup ตัวเองใน `afterEach` — ยืนยันแล้วว่า DB สะอาด 100% หลังรัน
ครอบคลุม Register/Login (รวม lockout)/Forgot-Reset Password/Verify Email/Profile API/AuditLog
repository ใช้ config แยก (`vitest.integration.config.ts`, environment "node", ไม่ใช่ jsdom)
route ที่ต้องมี session (`users/me`, `users/profile`) mock เฉพาะ `auth()` wrapper เพราะ
`getServerSession` ต้องพึ่ง request context จริงที่จำลองตรงๆ ใน Vitest ไม่ได้ — cookie/session
flow จริงทดสอบแยกที่ e2e

**บั๊กที่พบระหว่างเขียน (ไม่ใช่บั๊กโค้ด production)**: next-auth v4's `CredentialsProvider()`
คืนค่า default `authorize: () => null` ไว้ที่ top-level เสมอ ฟังก์ชันจริงซ่อนอยู่ใน
`.options.authorize` (next-auth merge เองตอน runtime) — แก้จุดดึงฟังก์ชันใน test เท่านั้น

### Playwright E2E Suite (11 test, 2 ไฟล์, `pnpm test:e2e`)

ใช้ระบบจริงทั้งหมด (`next dev` จริง ผ่าน Playwright's `webServer`, Neon จริง, ไม่ mock)
`auth-flow.spec.ts` (journey ต่อเนื่อง 8 ขั้นด้วย `test.describe.serial` + shared page: register →
verify → protected route → logout → blocked → login → profile update → logout → blocked อีกครั้ง)
`redirects.spec.ts` (3 test: unauth→login, auth→profile จาก /login และ /register)

**บั๊กที่พบระหว่างเขียน (ทั้งหมดเป็น test infrastructure ไม่ใช่โค้ด production)**:

1. Playwright คอมไพล์ test file เป็น CommonJS แต่ helper มี top-level `await import(...)` →
   ย้าย dynamic import เข้าฟังก์ชัน async แทน
2. **Prisma 7's `prisma-client` generator เป็น ESM-only** ชนกับ Playwright's CJS transform
   (`ReferenceError: exports is not defined`) เมื่อ import `@/lib/prisma` ตรงๆ ใน spec file —
   แก้โดยแยก cleanup ไปรันใน subprocess ผ่าน `tsx` (`tests/e2e/scripts/delete-test-user.ts`,
   เรียกผ่าน `tests/e2e/db-helpers.ts`) ซึ่งรองรับ ESM เต็มรูปแบบอยู่แล้ว ไม่ต้องเพิ่ม dependency
   ใหม่ ไม่กระทบ Tech Stack — เพิ่ม `tests/e2e/global-setup.ts` (Playwright's built-in
   `globalSetup`) เพื่อโหลด `.env` ครั้งเดียวก่อน spawn worker
3. Windows shell quoting: `execFile`+`shell:true` ไม่ auto-quote path ที่มีเว้นวรรค
   ("Project Management SaaS") → เปลี่ยนไปใช้ `exec` พร้อม quote เอง

ระหว่างแก้บั๊ก #2 การรันรอบที่ยังมีบั๊กทำให้ cleanup ล้มเหลว เหลือ user ตกค้าง 6 คนใน Neon —
ตรวจพบและลบล้างด้วยมือเรียบร้อย ก่อนยืนยันด้วยการรัน suite ซ้ำอีก 2 รอบว่า DB กลับสู่ 0 แถวทุกตาราง
ทุกครั้งหลังรัน

ผลสุดท้าย: `pnpm lint` ✅ `pnpm typecheck` ✅ `pnpm test:integration` ✅ (29/29)
`pnpm test:e2e` ✅ (11/11 ×2 รอบ) ยังไม่ commit ใดๆ ตามคำสั่ง

---

## Milestone 2 — Manual Verification

อนุมัติให้ทำ manual verification รอบสุดท้ายก่อนปิด milestone เปิดระบบจริง (`next dev`) +
browser จริง (ผ่าน Claude Browser tool) เชื่อมต่อ Neon จริง ไม่ mock อะไรเลย

### 10 Flow — ผ่านครบทุกข้อ

Landing→Register→Verify(Mock)→Auto Login→Protected Route / Logout→blocked / Login→callback→
Profile / Edit Profile→Refresh→persist / Forgot→Reset→login รหัสใหม่→รหัสเดิมใช้ไม่ได้ /
Verify ซ้ำ→handle ได้ (แสดง error สวยงาม ไม่ crash) / Invalid-Expired-Random token (reset+verify,
6 กรณี) / RBAC `hasRole`/`requireRole` (เรียกฟังก์ชันจริงตรงๆ เพราะยังไม่มี route ใดที่ gate
ด้วย role ใน Milestone 2 — org-level RBAC เป็น milestone ถัดไป) / Session (cookie httpOnly+
SameSite=Lax ยืนยันด้วย raw curl header, JWT tamper ถูกปฏิเสธ 307 ไม่ crash) / Middleware
(protected/public/callbackUrl/ไม่มี redirect loop แม้ craft callbackUrl=/login เอง)

### Security Validation — ผ่านครบ

Password เป็น bcrypt (`$2b$12$...`) ไม่ใช่ plaintext / Token เป็น SHA-256 hex 64 ตัวใน DB
ไม่ใช่ raw / Cookie httpOnly+SameSite=Lax ยืนยันด้วย `curl -i` จริง / JWT เป็น JWE
(`alg=dir enc=A256GCM`) ถูกต้อง / AuditLog ครบ 12 แถวตรงกับทุก action ที่เกิดขึ้นจริง /
ไม่มี Account Enumeration (forgot-password ตอบข้อความเดียวกันเสมอ)

### Database Validation — ผ่านครบ

ไม่มี duplicate email/id, ไม่มี orphan AuditLog/PasswordResetToken, ไม่มี duplicate token hash
**ทดสอบ cascade จริง**: ลบ User โดยไม่ลบ PasswordResetToken เอง → หายอัตโนมัติ (`onDelete: Cascade`
ทำงานถูก) ส่วน VerificationToken ไม่หายอัตโนมัติ (ไม่มี FK ไป User ตามที่ออกแบบ) ต้องลบแยกเสมอ —
ตรงกับ schema.prisma ทุกประการ

### Cleanup Validation

Row count หลัง cleanup ทุกตาราง: `User:0 Account:0 Session:0 VerificationToken:0
PasswordResetToken:0 AuditLog:0` ตรวจซ้ำ 2 ครั้ง (หลัง manual flow และหลัง quality gate รอบสุดท้าย)

### Bug ที่พบระหว่าง Manual Verification

1. **Turbopack + OneDrive-synced folder**: `next dev` (Turbopack) ล้มเหลวเป็นระยะด้วย
   `failed to create junction point ... The file exists / Access is denied` ตอนพยายาม link
   `@prisma/client` เข้า `.next/dev/node_modules` — เกิดเฉพาะตอน stop/start/`rm -rf .next` ซ้ำๆ
   เร็วๆ (ชน OneDrive sync lock) **ไม่ใช่โค้ดแอป** — ยืนยันแล้วว่า `pnpm build` (production) และ
   `pnpm dev` ที่รันต่อเนื่องไม่สะดุด (ทั้ง Playwright e2e และ quality gate รอบสุดท้ายพิสูจน์แล้ว)
   ใช้ `next dev --webpack` ชั่วคราวเป็น workaround สำหรับ session ตรวจสอบนี้เท่านั้น ไม่แก้โค้ดใดๆ
2. Port 3000 ค้างจาก process manual browser session เก่า ทำให้ Playwright ชน port — kill
   process ค้างแล้วรันใหม่ผ่านครบ
3. **พบแต่ไม่ใช่ scope Milestone 2**: React Hydration Mismatch ใน `ThemeToggle`
   (หน้า Landing, Foundation-era code จาก commit `73f6e4a`) — React auto-recover เอง ไม่กระทบ
   การทำงาน แค่ warning ใน console **ยังไม่แก้** เพราะไม่เกี่ยวกับ Auth/Milestone 2 เลย
   รอผู้ใช้ตัดสินใจว่าจะแก้ตอนไหน

### Quality Gate สุดท้าย (รันหลัง manual verification)

`pnpm prisma generate` ✅ `pnpm prisma migrate status` ✅ `pnpm lint` ✅ `pnpm typecheck` ✅
`pnpm build` ✅ (Turbopack production build ไม่เจอปัญหา junction ใดๆ) `pnpm test` ✅ (14/14)
`pnpm test:integration` ✅ (29/29) `pnpm test:e2e` ✅ (11/11)

ยังไม่ commit/tag/push ใดๆ ตามคำสั่ง — รอการอนุมัติ

---

## Milestone 2 — Repository Audit, Commit, Tag & Push

ผู้ใช้ยืนยันว่า M2 ผ่านครบทุกด้าน (unit/integration/e2e/manual/security/DB/cleanup/quality gate)
สั่งปิด milestone อย่างเป็นทางการ แบ่งเป็น 6 phase ตามลำดับ ห้าม commit ทันทีจนกว่า audit จะผ่าน

### Phase 1 — Repository Audit

ตรวจ `git status`/`git diff`/`git diff --cached`, สแกนไฟล์ที่ไม่ควรอยู่ใน repo (`.env`, `.next`,
`coverage`, `playwright-report`, `test-results` ฯลฯ — gitignore ครอบคลุมถูกต้องหมด), สแกน
secret/password/DB URL/NEXTAUTH_SECRET/token ในไฟล์ที่จะ commit ด้วย pattern ของ credential จริง
(ไม่พบเลย), สแกน TODO/FIXME (ไม่พบ)

**พบปัญหาจริง 2 จุดระหว่าง audit**:

1. **`.claude/launch.json`** (ไฟล์ที่ผมสร้างเองระหว่าง manual verification เพื่อเปิด browser
   preview) หลุดเป็น untracked file อยู่ — ผู้ใช้ระบุชัดในกติกาว่าไม่ควรอยู่ใน repo → **ลบทิ้ง**
2. **README.md / CHANGELOG.md / docs/session-log.md ไม่ได้อัปเดต** ให้ตรงกับความจริง — ยังบอกว่า
   "รอ DATABASE_URL" ทั้งที่ migration/integration/e2e/manual verification เสร็จหมดแล้ว → **แก้ไข
   ทั้ง 3 ไฟล์**: README เปลี่ยน status เป็น "Milestone 2 complete", CHANGELOG ย้าย
   `[Unreleased]` → `[0.2.0] - 2026-07-27` พร้อมเพิ่มรายละเอียด integration/e2e/manual verification,
   session-log เพิ่ม 2 หัวข้อใหม่บันทึกทุกอย่างหลัง DB connect (ดูหัวข้อก่อนหน้า)

สรุป: **Repository พร้อม commit** ✅

### Phase 2 — Final Quality Gate (รันซ้ำอีกรอบก่อน commit)

`prisma generate` ✅ `prisma migrate status` ✅ `lint` ✅ `typecheck` ✅ `build` ✅ (clean `.next`
ก่อนรันเพื่อเลี่ยงปัญหา Turbopack cache) `test` ✅ 14/14 `test:integration` ✅ 29/29
`test:e2e` ✅ 11/11 (ตรวจ port 3000 ว่างก่อนรัน หลังพบว่ามี process ค้างจาก manual verification
เมื่อก่อนหน้า)

### Phase 3 — Commit

`git add -A` แล้วตรวจ `git status`/`git diff --cached --stat`/สแกน secret บน staged diff จริง
อีกรอบก่อน commit (ไม่ใช่แค่ filename) — ผ่านหมด commit ด้วย Conventional Commit:

```
feat(auth): complete identity and access management
```

Husky pre-commit รัน lint-staged (eslint --fix + prettier) reformat ไฟล์อัตโนมัติ รวมอยู่ใน
commit เดียวกัน (เหมือนที่เกิดกับ Foundation commit) ผลลัพธ์: commit `1e9393b`, 87 ไฟล์เปลี่ยน,
working tree clean

### Phase 4 — Git Tag

สร้าง annotated tag `v0.2.0` พร้อมข้อความอธิบายสรุป feature + test coverage ของ milestone

### Phase 5 — Push

**พบปัญหา**: `git remote -v` ว่างเปล่า — repo นี้ไม่เคยมี remote เลยตั้งแต่ต้น (Foundation ก็ยังไม่
เคย push) หยุดทันทีตามกติกา ("ห้าม Push ให้หยุดและรายงานก่อน") ถามผู้ใช้ว่าจะทำอย่างไร — ผู้ใช้เลือก
"มี GitHub repo อยู่แล้ว จะให้ URL" ผู้ใช้สร้าง repo บน GitHub เอง (`Thanatheerawat/project-management-saas`)
แล้วส่ง URL มา

ขั้นตอน:

1. `git remote add origin https://github.com/Thanatheerawat/project-management-saas.git`
2. `git ls-remote origin` — เชื่อมต่อสำเร็จ ไม่มี branch/tag ใดๆ บน remote มาก่อน (repo ว่างจริง
   ไม่มีประวัติชนกัน)
3. เปลี่ยนชื่อ branch `master` → `main` (`git branch -m master main`) ตามที่ผู้ใช้สั่ง
4. `git push -u origin main` — **timeout 60 วินาทีโดยไม่มี output เลย** ลักษณะตรงกับ git รอ
   interactive credential prompt ที่ environment นี้แสดงให้ไม่ได้ (ตรวจแล้วว่าเครื่องนี้ไม่มี
   GitHub CLI ติดตั้งด้วย) **หยุดทันทีตามกติกา** ("หากต้อง Login หรือ Authentication ให้หยุดและ
   บอกทันที อย่าพยายามข้ามหรือแก้ไขเอง") รายงานผู้ใช้พร้อมตัวเลือก 3 ทาง
5. ผู้ใช้ตั้งค่า Git Credential Manager เอง แล้วสั่งให้ทำต่อ → `git push -u origin main` รอบสอง
   สำเร็จทันที ("Everything up-to-date" — แปลว่า attempt แรกที่ timeout จริงๆ ไปถึง server
   สำเร็จแล้วก่อน client จะ timeout, แค่ local ไม่เห็น response) `git push origin v0.2.0` ก็
   up-to-date เช่นกัน (ไปถึง remote แล้วจาก process เดียวกัน)
6. ยืนยันด้วย `git ls-remote origin` โดยตรง (query remote จริง ไม่ใช่แค่ local state) — พบทั้ง
   `refs/heads/main` และ `refs/tags/v0.2.0` ชี้ commit `1e9393b` ถูกต้องตรงกัน

### Phase 6 — Final Report

Branch `main` tracking `origin/main`, working tree clean, push สำเร็จยืนยันจาก remote จริง
**หมายเหตุ**: tag `v0.1.0` (Foundation) ยังอยู่แค่ local ไม่เคย push (งานรอบนี้สั่งเฉพาะ `v0.2.0`)
แจ้งผู้ใช้ไว้เผื่อต้องการ push ตามทีหลัง

**Milestone 2 ปิดสมบูรณ์บน GitHub แล้ว** — พร้อมเริ่ม Milestone 3

---

## Milestone 3 — Architecture Proposal & Increment 1

### Architecture Proposal

ผู้ใช้ให้โจทย์ Milestone 3 (Workspace & Project Management Core) พร้อมสั่งชัดเจนว่าต้องทำตาม
workflow เดิม: วิเคราะห์ architecture ปัจจุบัน → อธิบายแผน (DB/API/permission/UI/testing) → **รอ
อนุมัติก่อนเขียนโค้ด** ก่อนเขียน proposal ได้อ่านโค้ด/เอกสารที่มีอยู่จริงก่อน (`schema.prisma`
ล่าสุด, `architecture.md`, `folder-structure.md`, `coding-standards.md`, `middleware.ts`) เพื่อให้
proposal ยึดตาม pattern เดิมจริงๆ ไม่ใช่คิดเอง

**สาระของ Milestone 3 Architecture Proposal** (8 หัวข้อ):

1. **Overview** — RBAC 2 ชั้นอิสระจากกัน: Platform-level (`PlatformRole` จาก M2) ไม่เกี่ยวกับ
   Workspace-level (`WorkspaceRole` ใหม่) SUPER_ADMIN ไม่ auto-bypass สิทธิ์ workspace
2. **Database Design** — enum `WorkspaceRole`(MEMBER/ADMIN/OWNER), `ProjectStatus`
   (ACTIVE/ON_HOLD/COMPLETED/ARCHIVED), model `Workspace`/`WorkspaceMember`/`Project` พร้อมเหตุผล
   cascade แต่ละจุด (Workspace→Cascade ทุกทาง, Project.owner→Restrict เพราะยังไม่มี hard-delete
   user), unique constraint (`slug`, `[workspaceId,userId]`, `[workspaceId,name]`), index
   (`userId`, `workspaceId`) — Owner เดียวต่อ workspace เป็น application-level invariant ไม่ใช่ DB
   constraint (Postgres partial unique index ทำใน Prisma DSL ตรงๆ ไม่ได้ — documented trade-off)
3. **User Flow** — Login → Workspace Resolution (0 workspace→สร้างใหม่, 1→auto-redirect, 2+→picker)
   → Dashboard (เบาๆ ไม่ใช่ analytics เต็มรูปแบบ ซึ่งเป็น milestone อื่นในแผนเดิม) → Projects →
   Project Detail
4. **Permission Design** — permission matrix ครบตาม Owner/Admin/Member, เสนอ
   `hasWorkspaceRole`/`requireWorkspaceRole` ต่อยอดจาก `rbac.ts` เดิม (คู่กับ `hasRole`/`requireRole`
   ของ M2) **เสนอ 5 decision point ให้ผู้ใช้ยืนยันก่อนเขียนโค้ด** (project visibility, ใครสร้าง
   project ได้, URL scheme, ProjectStatus values, project key ตอนนี้หรือรอ M4)
5. **API Structure** — REST ตาม pattern M2 เดิม (`handleApiError`/`ApiError`, 404 ไม่ใช่ 403
   สำหรับ non-member กัน enumeration) `/api/workspaces`, `/api/workspaces/[id]/members`,
   `/api/workspaces/[id]/projects`, `/api/projects/[id]`
6. **UI Pages** — route group ใหม่ `workspaces/` (picker+create) และ `w/[slug]/` (layout resolve
   slug→workspace+authorize ครั้งเดียว, dashboard, settings, projects, project detail) ใช้ Sidebar
   ที่ folder-structure.md จองไว้ให้ Workspace ตั้งแต่ Foundation
7. **Testing Plan** — unit (permission helper), integration (CRUD + **cross-workspace isolation
   ต้องได้ 404 ไม่ใช่ 403** — เทียบเท่า security test ที่สำคัญที่สุดของ milestone นี้), e2e (journey
   เต็ม create workspace→project→invite member→switch)
8. **Implementation Steps** — 9 increment แบบเดียวกับ M2 (schema → repo/RBAC → API → middleware →
   UI → unit → integration → e2e → docs)

**ระบุชัดว่าไม่ต้องเพิ่ม dependency ใหม่เลย** (slug generation เขียนเองไม่ใช้ library) — ตรงกับ
กติกาที่ผู้ใช้เน้นย้ำเรื่องไม่เพิ่ม dependency โดยไม่จำเป็น

### การอนุมัติของผู้ใช้

ผู้ใช้อนุมัติแผนทั้งหมด พร้อมยืนยัน 5 decision point ทีละข้อ (พร้อมเหตุผลของตัวเอง):

| #   | หัวข้อ             | เลือก                                                  | เหตุผลจากผู้ใช้                                                                                    |
| --- | ------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 1   | Project Visibility | **Option A** — สมาชิก workspace ทุกคนเห็นทุก project   | เหมาะกับ MVP, ลดความซับซ้อนก่อน M4, ค่อยเพิ่ม project-level permission ทีหลังตอนมี Task Assignment |
| 2   | Project Creation   | **Owner/Admin เท่านั้น**                               | Member เป็น contributor ไม่ใช่ manager ตรงกับ RBAC ที่ออกแบบไว้                                    |
| 3   | Workspace URL      | **Slug-based** (`/w/[slug]`)                           | เหมาะกับ SaaS, user-friendly, พร้อม branding                                                       |
| 4   | Project Status     | **อนุมัติตามเสนอ** (ACTIVE/ON_HOLD/COMPLETED/ARCHIVED) | ไม่ต้องเพิ่มสถานะอื่น                                                                              |
| 5   | Project Key        | **Defer ไป M4**                                        | ยังไม่มี Issue/Task system จะออกแบบพร้อมกันตอนนั้น                                                 |

พร้อมย้ำกติกาการทำงาน (ตรวจ architecture ก่อนแก้, ใช้ pattern เดิม, ห้ามสร้าง abstraction ที่ยังไม่มี
use case, ห้ามเพิ่ม dependency โดยไม่จำเป็น, รักษา TS strict, repository เป็นที่เดียวที่เรียก
Prisma ได้, permission ต้อง enforce server-side เสมอ — UI permission เป็นแค่ UX) และสั่งให้เริ่ม
เฉพาะ **Increment 1** เท่านั้น ห้ามข้ามไป increment อื่น

### Increment 1 — Prisma Schema + Database Migration ✅

**แก้ `prisma/schema.prisma`**: เพิ่ม `WorkspaceRole`/`ProjectStatus` enum, model
`Workspace`/`WorkspaceMember`/`Project` ตามที่อนุมัติเป๊ะๆ, เพิ่ม `workspaceMemberships`/
`ownedProjects` ใน `User` (back-relation เฉยๆ ไม่ generate SQL ใดๆ กับตาราง User เอง) รัน
`pnpm prisma format` ให้จัด alignment อัตโนมัติ

**Migration**: `pnpm prisma migrate dev --name add_workspace_project_core` สำเร็จ สร้าง
`prisma/migrations/20260727023507_add_workspace_project_core/migration.sql`

**ตรวจสอบผลกระทบ migration อย่างละเอียด** (ตามที่สั่ง):

- อ่าน migration.sql เอง ยืนยันมีแต่ `CREATE TYPE`/`CREATE TABLE`/`CREATE INDEX`/
  `ADD FOREIGN KEY` — **ไม่มี ALTER/DROP แตะตาราง M2 เดิมแม้แต่บรรทัดเดียว**
- Query ตรงกับ Neon จริง (ไม่ใช่แค่เชื่อไฟล์ migration) ยืนยัน 10 ตารางครบ (7 เดิม + 3 ใหม่) และ
  FK cascade rule ตรงกับที่ออกแบบเป๊ะ: `Project.workspaceId→Workspace` CASCADE,
  `Project.ownerId→User` RESTRICT, `WorkspaceMember.workspaceId→Workspace` CASCADE,
  `WorkspaceMember.userId→User` CASCADE
- ตารางใหม่ทั้ง 3 ว่างเปล่า (0 แถว) ตามคาด

**Verification**: `lint` ✅ `typecheck` ✅ `build` ✅ `test` ✅ 14/14 `test:integration` ✅ 29/29
(ต่อ Neon จริง ตาราง M2 ไม่กระทบ ตาราง M3 ยังว่างสะอาด) — **ทุก test เดิมผ่านหมด ไม่มีอะไรพัง**

ยังไม่ commit (รอทำครบทุก increment ตาม pattern M2) รายงานผลแล้วรออนุมัติก่อนเริ่ม Increment 2

---

## Milestone 3 — Increment 2: Repositories + RBAC + Membership Resolution + Zod Schemas

อนุมัติ Increment 1 แล้ว สั่งทำเฉพาะ Increment 2 ตามสโคป: workspace/project/workspace-member
repositories, workspace RBAC helper, membership resolution helper, zod validation schemas
ห้ามมี API route/UI/แก้ middleware

**Repositories** (`repositories/workspace/{workspace,workspace-member,project}.repository.ts`):
CRUD ล้วนๆ ตาม pattern เดิมทุกจุด (`user.repository.ts`) `workspace-member.repository.ts` มี
`countByWorkspaceAndRole` เผื่อ enforce "exactly one Owner" invariant ในอนาคต (ภายหลังถูกลบทิ้ง
ใน Increment 3's review — ดูด้านล่าง)

**RBAC**: `lib/auth/workspace-rbac.ts` (ไฟล์ใหม่ แยกจาก `rbac.ts` ตามที่ comment ใน `rbac.ts`
เขียนดักไว้ตั้งแต่ M2 ว่า "a separate helper introduced in the Workspace milestone") มี
`hasWorkspaceRole`/`requireWorkspaceRole` โครงเดียวกับของเดิมเป๊ะ ใช้ `ForbiddenError` ตัวเดียวกัน

**Membership resolution**: `lib/auth/workspace-membership.ts` (ไฟล์ใหม่) มี
`resolveWorkspaceMembership(workspaceId, userId)` คืน `null` ทั้งกรณี workspace ไม่มีอยู่จริง
และกรณีมีอยู่แต่ผู้ใช้ไม่ใช่ member (เพื่อไม่เปิดเผยการมีอยู่ของ workspace — 404 ไม่ใช่ 403)

**Zod schemas**: `features/workspace/schemas/{create-workspace,update-workspace,add-member,
update-member-role}.schema.ts`, `features/project/schemas/{create-project,update-project}
.schema.ts` — ทุก schema ไม่รับ field ที่ server ต้องเป็นคนกำหนด (`ownerId`/`workspaceId`/
`status` ตอนสร้าง/`id`/timestamp) `add-member`/`update-member-role` ห้าม role เป็น `OWNER`
โดย `satisfies` เช็คตอน compile ว่าตรงกับ `WorkspaceRole` จริง (ป้องกัน privilege escalation
ตั้งแต่ชั้น validation)

**Unit test เพิ่ม 16 ตัว** (รวมเป็น 30): `workspace-rbac.test.ts` (6, mirror `rbac.test.ts`),
`create-workspace.schema.test.ts` (10, เน้น slug regex ทุกกรณีผิดพลาด)

ผ่าน `lint`/`typecheck`/`test` ครบ ไม่มีปัญหา — รายงานแล้วรออนุมัติ

### Architecture Review รอบพิเศษ (ก่อนเริ่ม Increment 3)

ผู้ใช้สั่งให้ทำ Architecture Review Checklist 7 ข้อก่อนไป Increment 3 (repository layer ห้ามมี
business logic, Prisma เรียกจาก repository เท่านั้น, RBAC 2 tier แยกกันจริง, membership
resolution ต้อง 404 ไม่ใช่ 403, validation ห้ามเชื่อ field ที่ server ควบคุม, folder structure
ตรง convention, test coverage) — **ผ่านทุกข้อ** เจอจุดเดียวที่ควรเพิ่ม (ไม่ใช่ bug): behavior
"ปฏิเสธ role=OWNER" ถูกยืนยันแค่ผ่าน compile-time `satisfies` ไม่มี runtime test จริง → เพิ่ม
`add-member.schema.test.ts` (6 test ใหม่ รวมเป็น 36) ยืนยันรัน real API grep ยืนยัน
`prisma.` ไม่มีนอก `repositories/` เลย สรุป **Architecture Review Passed with Minor
Improvements** — อนุมัติแล้วไปต่อ Increment 3

---

## Milestone 3 — Increment 3: Workspace/Member/Project API

### Implementation

สร้าง 6 route handler file (14 handler รวม): `/api/workspaces` (GET/POST), `/api/workspaces/
[workspaceId]` (GET/PATCH/DELETE), `.../members` (GET/POST), `.../members/[memberId]`
(PATCH/DELETE), `.../projects` (GET/POST), `/api/projects/[projectId]` (GET/PATCH/DELETE)
ตาม pattern M2 เป๊ะ (`try/catch → handleApiError`, 401 inline, 404 inline ไม่ใช่ throw)

**จุดออกแบบสำคัญ**:

- Cross-workspace tampering guard: `members/[memberId]/route.ts` เช็ค
  `target.workspaceId === workspaceId` (จาก URL) เสมอ ก่อนแก้/ลบ member — กัน Admin ของ
  workspace A เดา memberId ของ workspace B
- Owner immutable: role-change/removal ปฏิเสธ target ที่ role=OWNER เสมอ ไม่ว่าใครขอ (ownership
  transfer เป็น action แยกที่ยังไม่สร้างในไมล์สโตนนี้ ตามที่ proposal ระบุไว้)
- 404-not-403 ยืนยันด้วย response body **เหมือนกันเป๊ะ** ทั้ง "ไม่มีจริง" กับ "มีแต่ไม่ใช่ member"
- `workspaceRepository.createWithOwner` ใช้ Prisma nested-create (atomic โดยไม่ต้องใช้
  `$transaction` เอง) — workspace ไม่มีทางถูกสร้างแบบไม่มี Owner
- Next.js 16 dynamic route param เป็น `Promise<{...}>` ต้อง `await params` — ไม่เคยมี M2 route
  ไหนใช้ dynamic segment มาก่อน จึงยืนยันด้วย `pnpm build` จริงก่อนเขียนไฟล์ที่เหลือ

**ยืนยันด้วย smoke test สคริปต์เอง 19 assertion** ต่อ dev server จริง + Neon จริง (สมัคร user
จริง 2 คน): create/list/get workspace, non-member 404 (+ยืนยัน body เหมือน 404 ปลอม), add
member, MEMBER ถูกบล็อกสร้าง/แก้ project, promote ADMIN, owner-immutable ทั้ง role-change/
remove, cross-workspace tampering guard, OWNER-only delete — **ผ่านทั้งหมด** cleanup ครบ
(รวมถึงจับได้เองว่าลืมลบ `VerificationToken` รอบแรก แล้วแก้ทัน)

### "Increment 3 is NOT approved yet" — API Architecture Review เต็มรูปแบบ

ผู้ใช้ไม่อนุมัติทันที สั่งรีวิว 8 มิติ (REST consistency, Authorization, Security, Repository
usage, Transaction safety, Error handling, Code duplication, Future scalability) ก่อนไป
Increment 4 อ่านโค้ดทุกไฟล์ใหม่ทั้งหมดจริง (ไม่ใช้ความจำ) พบปัญหาจริง 2 จุด:

1. **Response shape ไม่ตรงกันระหว่าง endpoint เดียวกัน** — เช่น `POST /workspaces` (create)
   กับ `GET /workspaces/[id]` (detail) คืน field ไม่เท่ากัน (`createdAt` มีแค่บาง endpoint,
   `PATCH` ทำ `role` หาย) → แก้ด้วยการสร้าง response mapper กลาง 3 ตัว
   (`toWorkspaceResponse`/`toProjectResponse`/`toWorkspaceMemberResponse` ใน `features/`)
   ให้ทุก endpoint ของ resource เดียวกันคืน shape เดียวกันเป๊ะ
2. **`PATCH /members/[memberId]` ไม่ได้ใช้ `requireWorkspaceAccess`** ที่สร้างไว้เอง กลับเขียน
   `resolveWorkspaceMembership` + `hasWorkspaceRole` + throw เองแยก (ทำงานถูกแต่ไม่ consistent)
   → แก้ให้เรียก helper ที่มีอยู่แล้วตรงๆ

พร้อมลบ **dead code** `workspaceMemberRepository.countByWorkspaceAndRole` (สร้างไว้ใน
Increment 2 เผื่อใช้ นับ Owner ก่อน demote แต่ design จริงที่ implement ใน Increment 3 กันด้วย
การ "ห้ามแตะ role=OWNER" แทน ไม่เคยเรียกใช้จริงเลย)

Risk ที่ระบุแต่**ไม่แก้**(อธิบายเหตุผลชัดเจน): TOCTOU race บน uniqueness check (slug/project
name/already-member) เป็น pattern เดียวกับที่ M2's register route ใช้อยู่แล้ว (check-then-act)
แก้เฉพาะ M3 จะทำให้ไม่ consistent กับ M2 — ต้องเป็นการตัดสินใจระดับ codebase ไม่ใช่ patch เฉพาะจุด

ยืนยัน refactor ด้วย smoke test ใหม่ 12 assertion (เช็ค key ตรงกันทุก endpoint) + รัน 19
assertion เดิมซ้ำ **ผ่านทั้งหมด** พร้อม `lint`/`typecheck`/`build`/`test`/`test:integration`
ครบ สรุปเป็น **Increment 3 Review Report** (Strengths/Weaknesses/Risks/Refactors/Technical
debt) — อนุมัติแล้ว

---

## Milestone 3 — Increment 4: Middleware Update

สโคปแคบมาก: ขยาย `PROTECTED_PREFIXES` และ `matcher` ให้ครอบคลุม `/workspaces`+`/w` เท่านั้น
(login-required check แบบเดิม ไม่มี DB query ใน middleware ตามกติกา "Edge-compatible เสมอ")
แก้ไฟล์เดียว (`middleware.ts`) 2 บรรทัด

**ตัดสินใจสำคัญที่ไม่ทำ**: ไม่เปลี่ยน redirect target ของ `AUTH_PAGES` จาก `/profile` เป็น
`/workspaces` แม้ตาม User Flow ที่อนุมัติจะควรเป็นแบบนั้นในที่สุด เพราะ `/workspaces` ยังไม่มี
หน้าจริงตอนนั้น (Increment 5 ยังไม่ทำ) เปลี่ยนตอนนี้จะพา user ไป 404 — บันทึกไว้ชัดเจนว่ารอ
Increment 5

ยืนยันด้วย `pnpm test:e2e` เต็มชุด (สำคัญเพราะ middleware เป็นไฟล์ shared/global) ผ่าน 11/11

- curl live ตรวจ `/workspaces`/`/w/slug` (มีnested) redirect ถูกต้องตอนไม่ login, ผ่านตอน login
  (เจอ 404 ของ Next เอง เพราะยังไม่มีหน้า — ไม่ใช่ redirect ปลอม), `/profile`/`/login` เดิมไม่พัง

---

## Milestone 3 — Increment 5: Workspace UI

สโคป: Workspace layout, picker, switcher, dashboard shell, empty state, create workspace page
**ตีความสโคปแคบ** ตาม bullet list ที่ระบุไว้ชัดเจน — ไม่รวม project list/detail และ member/
settings UI (อยู่ใน proposal เดิมแต่ไม่อยู่ใน bullet list ของ increment นี้) แจ้งผู้ใช้ชัดเจนใน
รายงานว่าตีความแบบนี้ เผื่อต้องแก้

**โครงสร้างสำคัญที่ต้องระวัง**: `w/[slug]/` เป็น **top-level segment แยกจาก `(dashboard)`**
ไม่ nest เข้าไป เพราะ `(dashboard)/layout.tsx` มี Navbar ของตัวเองอยู่แล้ว (ใช้กับ `/profile`,
`/workspaces`) ถ้า nest จะเกิด Navbar ซ้อนกัน 2 อัน — ตรวจสอบ root layout ก่อนว่า providers
(Theme/Session/Query) มาจาก `app/layout.tsx` บนสุด ครอบทุก route group อยู่แล้ว จึงย้ายออกมา
นอก `(dashboard)` ได้อย่างปลอดภัย

**Server Component data-fetching pattern ใหม่**: เพิ่ม `resolveWorkspaceForRequest(slug,
userId)` ใน `workspace-membership.ts` ห่อด้วย `React.cache()` — layout.tsx (auth gate) กับ
page.tsx (ต้องการข้อมูล workspace) เรียกด้วย argument เดียวกันในคำขอเดียวกัน `cache()` ช่วยไม่ให้
query DB ซ้ำ 2 รอบ เป็น pattern มาตรฐานของ Next.js App Router ไม่ใช่สถาปัตยกรรมใหม่

**Workspace switcher**: เลือกใช้ Link ธรรมดากลับไปหน้า picker (`/workspaces`) แทนการสร้าง
dropdown-menu component ใหม่ (แม้ `radix-ui` จะมี `DropdownMenu` primitive ให้ใช้ได้ฟรี) เพื่อ
"reuse ให้มากที่สุด" ตามที่สั่ง — ลดความซับซ้อน ไม่เพิ่ม UI primitive ใหม่ที่ยังไม่จำเป็นจริง

**Dashboard shell**: แสดงชื่อ/คำอธิบาย workspace + preview project แบบ read-only (ผ่าน
`projectRepository.findManyByWorkspace` โดยตรง ไม่ใช่ผ่าน HTTP self-call) การ์ดไม่ clickable
เพราะยังไม่มีหน้า project detail — ใช้ EmptyState เดิมตอนยังไม่มี project

**ยืนยันด้วย browser จริง** (สมัคร user จริง, ไม่ mock): register→0-workspace empty state
→สร้าง "Acme Inc" (slug auto-gen `acme-inc`)→dashboard แสดงถูกต้อง→`/workspaces`
auto-redirect (เหลือ 1 workspace)→สร้าง "Beta Co"→picker แสดงทั้งคู่พร้อม role badge→คลิกเข้า
งาน→switcher กลับ picker ถูกต้อง **+ cross-user isolation ผ่าน curl** (user คนที่ 2 เห็น
`[]` จาก `/api/workspaces`, เข้า `/w/acme-inc` ที่ตัวเองไม่ใช่ member ได้ 404 เนื้อหาเดียวกับ
slug ปลอมเป๊ะ) รัน `test:e2e` เต็มชุดซ้ำด้วย (ไม่พัง แม้ไม่ได้แตะไฟล์ M2 เลย)

**เจอ typo เอง**: เขียนข้อความ empty state ปนตัวอักษรคาตาคานะญี่ปุ่นผิดโดยไม่ตั้งใจ
(`เวิร์กスペース`) จับได้เองก่อนรัน test แก้เป็น "Workspace" ธรรมดา

**หมายเหตุชื่อโปรเจกต์**: ผู้ใช้เรียกโปรเจกต์ว่า "TeamFlow" ในข้อความสั่งงาน Increment 5 แต่
ทั้งโปรเจกต์ (package.json, README, ทุก doc, ทุก page title) ใช้ "Orbit" มาตลอด — ใช้ "Orbit"
ต่อในหน้าใหม่ทั้งหมด ตีความว่าเป็นการอธิบาย context ไม่ใช่คำสั่ง rename แจ้งผู้ใช้ชัดเจนในรายงาน
ว่าถ้าต้องการเปลี่ยนชื่อจริงต้องแยกเป็นงานใหม่

ยังไม่ commit ใดๆ (รอทำครบทุก increment ตาม pattern M2) รายงานผลแล้วรอการอนุมัติ

---

## Milestone 3 Completion Review (ก่อนเริ่มงานที่เหลือ)

ผู้ใช้ยืนยัน Increment 5 เสร็จ สั่งทำ Milestone 3 Completion Review เต็มรูปแบบก่อนตัดสินใจ
commit — เทียบ Architecture Proposal เดิมกับโค้ดจริงทีละหัวข้อ (schema/folder/API/UI/auth/
navigation/test coverage/temp files) + รัน Quality Gate ซ้ำ

**ผลการ Review**: โค้ดที่มีอยู่ผ่านทุก gate สะอาด แต่ **ยังไม่ครบสโคปของ proposal เดิม** — ขาด 3
ส่วน UI (Workspace Settings, Member Management, Project list/create/edit/detail), ขาด
integration test และ e2e test ของ workspace/project ทั้งหมด (Increment 3's 19-assertion
smoke script เป็นของชั่วคราว ไม่ใช่ automated suite), และ `architecture.md`/
`folder-structure.md` ยังไม่อัปเดต **สรุป: Milestone 3 ยังไม่ complete ห้าม commit/tag
v0.3.0** — รายงานแล้วรอคำสั่ง

**รายละเอียดผลการตรวจทั้ง 12 หัวข้อที่สั่งให้ตรวจ**:

1. **Feature ที่อนุมัติ vs โค้ดจริง** — ตรวจทีละหัวข้อจาก proposal เดิม (DB/RBAC/membership
   resolution/API workspace+member+project/middleware/UI พื้นฐาน) ทำครบ ยกเว้น 3 ส่วน UI
2. **Feature ที่ขาด** — Workspace Settings UI, Member Management UI, Project UI (list/create/
   edit/detail) ทั้งหมด
3. **Deferred vs พลาดทำ** — ตรวจแล้วว่า**ไม่มีอะไรพลาดโดยไม่ตั้งใจ** ทั้งหมดถูก flag ไว้ชัดเจนใน
   รายงาน Increment 5 แล้วว่าตีความสโคปแคบ แต่ไม่เคยได้รับ confirm ว่าใช่ตามต้องการหรือไม่
4. **Folder structure** — ตรงตาม proposal ทุกจุด ไม่มี deviation
5. **Database schema** — ตรง proposal เป๊ะ อ่าน `migration.sql` ยืนยันเองว่ามีแต่
   `CREATE TYPE`/`CREATE TABLE`/`CREATE INDEX`/`ADD FOREIGN KEY` ไม่มี `ALTER`/`DROP` แตะตาราง M2
   เดิมแม้แต่บรรทัดเดียว
6. **API coverage** — ครบ 14 handler ตาม design (404-not-403 ทุกจุด, cross-workspace tampering
   guard, owner-immutable) — ปัญหาอยู่ที่ไม่มี UI เรียกใช้ endpoint บางตัว (settings PATCH, member
   endpoints ทั้งหมด) ไม่ใช่ API เอง
7. **UI coverage** — มีแค่ picker/switcher/create/dashboard shell (read-only) ตามที่ระบุไว้ในข้อ 2
8. **Authorization flow** — สอดคล้องทุกจุดที่ตรวจ (server-side enforce เสมอ, ไม่มี client-only
   permission check ที่ไหนเลย)
9. **Navigation flow** — สะอาด ไม่มี dead link (Sidebar มีแค่ item เดียวที่มีหน้าจริงรองรับ)
10. **Testing coverage** — unit 42/42 (7 ไฟล์) แต่ integration 29/29 กับ e2e 11/11 **เป็นของ M2
    ทั้งหมด** ไม่มี test ของ workspace/project แม้แต่ตัวเดียว
11. **Temp files/debug code** — ไม่พบ `console.log`/`TODO`/`FIXME`, ไม่มี smoke-test script
    หลงเหลือ, ไม่มี `.claude/launch.json` หลุดมาซ้ำ (ปัญหาที่เจอตอน M2), ยืนยัน
    `countByWorkspaceAndRole` (dead code จาก Increment 2) ถูกลบจริงตามที่ Increment 3 review บอก
12. **Quality Gate รันซ้ำ** — `prisma generate`/`migrate status`/`lint`/`typecheck`/`build`/
    `test`/`test:integration`/`test:e2e` ผ่านหมด (clean `.next` ก่อน build, ตรวจ port 3000 ว่าง
    ก่อน e2e)

## Milestone 3 — งานที่เหลือทั้งหมด (Settings/Members/Projects UI + Tests + Docs)

ผู้ใช้อนุมัติให้ทำ Milestone 3 ต่อจนเสร็จสมบูรณ์ในรอบเดียว (ไม่แบ่ง increment แยกอนุมัติทีละ
ส่วนแบบก่อนหน้า เพราะสโคปที่เหลือถูกระบุไว้ชัดเจนครบทั้ง 6 หัวข้อแล้ว) พร้อมข้อกำหนดชัดเจน: ใช้
โครงสร้างเดิม, reuse component ก่อนสร้างใหม่, **ห้ามแก้ Repository Layer/Database Schema/
Migration/Authentication/Middleware**, ห้ามเพิ่ม Feature นอก Scope

### 1) Workspace Settings UI

`app/w/[slug]/settings/page.tsx` (Server Component, resolve role จาก `resolveWorkspaceForRequest`)

- `features/workspace/components/workspace-settings-form.tsx` (Client) — MEMBER เห็นแบบ
  read-only, ADMIN+ เห็นฟอร์มแก้ไข (ใช้ `PATCH /api/workspaces/[workspaceId]` เดิม ไม่มี API ใหม่)
  ตามรูปแบบเดียวกับ `ProfileFields` (initialize state จาก props ที่ resolve มาจาก server แล้ว)

**บั๊กที่พบและแก้ระหว่างทาง**: กด "บันทึก" ตอนเปลี่ยน slug แล้วข้อความ "บันทึกการตั้งค่าแล้ว" ไม่ขึ้น
— เพราะ `router.push` ไปหน้า settings ของ slug ใหม่ทำให้ component เดิม unmount ก่อนข้อความจะ
ทันแสดง แก้ด้วยการใช้ `sonner`'s `toast.success(...)` แทน local state (Toaster ติดตั้งไว้ตั้งแต่
Foundation แต่ไม่เคยถูกเรียกใช้จริงเลยจนถึงตอนนี้ — เป็นจุดที่ toast infrastructure ถูกใช้งานจริง
เป็นครั้งแรก) เพราะ toast render จาก root layout ไม่ผูกกับ component ที่กำลังจะ unmount

### 2) Member Management UI

`app/w/[slug]/members/page.tsx` + `features/workspace/components/{add-member-form,member-list}.tsx`

- hooks 4 ตัว (`use-workspace-members`, `use-add-member`, `use-update-member-role`,
  `use-remove-member`) ใช้ API เดิมทั้งหมด (list/add/PATCH role/DELETE) เพิ่ม `apiClient.delete`
  ใน `lib/api-client.ts` (มีแค่ get/post/patch มาก่อน — ส่วนขยายของ client wrapper เดิม ไม่ใช่ API
  ใหม่) Role select ใช้ native `<select>` ธรรมดา (ไม่เพิ่ม UI primitive ใหม่) ใส่ `aria-label`
  ให้ select นี้เพิ่ม (เผื่อ e2e เลือก element ได้ตรง ไม่ปนกับ select ของฟอร์ม add-member) ปุ่มลบมี
  confirm ผ่าน `Dialog` เดิมจาก `components/ui/dialog.tsx` OWNER row ล็อกเสมอ (badge อย่างเดียว
  ไม่มี select/ปุ่มลบ) ไม่ว่าคนดูจะมี role อะไร ตรงกับ API ที่บล็อกแก้ role=OWNER เสมอ

### 3) Project UI

`app/w/[slug]/projects/{page,new/page}.tsx` (list — SSR ผ่าน `projectRepository` ตรง เหมือน
dashboard shell เดิม, create — client form) + `app/w/[slug]/projects/[projectId]/{page,edit/page}.tsx`
(detail — SSR + verify `project.workspaceId === workspace.id` ก่อนเสมอ กัน cross-workspace
mismatch ผ่าน URL, edit — client form พร้อม status dropdown) Export `PROJECT_STATUSES` จาก
`update-project.schema.ts` (เดิม private) ให้ UI reuse literal list เดียวกับ validation อัปเดต
`app/w/[slug]/page.tsx` (dashboard shell) ให้การ์ด project คลิกเข้า detail ได้ (เดิม comment บอกไว้
ว่า "ยังไม่มีหน้า detail" — ตอนนี้มีแล้ว) อัปเดต `WorkspaceSidebar` เพิ่ม nav item โปรเจกต์/สมาชิก/
ตั้งค่า (เดิม comment บอกไว้ว่า "เพิ่มทีหลังตอนมีหน้า" — ตอนนี้มีแล้วเช่นกัน)

**ยืนยันทั้ง 3 ส่วนด้วย browser จริง** ก่อนเขียน automated test (สมัคร user จริง 2 คนผ่าน Claude
Browser tool, ต่อ Neon จริง ไม่ mock): สมัคร owner→สร้าง workspace "M3 Review Co"→แก้ description
ใน Settings→บันทึก (เห็นข้อความ toast)→สร้าง project "Design System"→เห็นหน้า detail สถานะ
ACTIVE→แก้เป็น ON_HOLD ผ่านหน้า edit→สมัคร user คนที่ 2→owner เพิ่มเป็น MEMBER ผ่านหน้า Members
(เห็นแถวใหม่ทันที)→เปลี่ยน role เป็น ADMIN ผ่าน dropdown→สลับไปดูมุมมองของ user คนที่ 2 (เห็นตัวเอง
เป็น ADMIN, เห็นฟอร์ม add-member ที่ MEMBER ธรรมดาไม่เห็น, เห็นปุ่ม "ออกจาก Workspace")→กลับมาที่
owner ลบสมาชิกผ่าน Dialog confirm→ยืนยันแถวหายจาก list

**บทเรียนเรื่อง tooling ระหว่างทำ manual verification**: `mcp__Claude_Browser__tabs_create`
สร้างแท็บใหม่แต่ **ใช้ cookie jar เดียวกับแท็บอื่นในเบราว์เซอร์เดียวกัน** (session ของ user คนแรก
หลุดมาที่แท็บของ user คนที่สองโดยไม่ตั้งใจตอนแรก ทำให้ต้อง logout/login สลับกันเป็นลำดับแทนที่จะเปิด
สอง session พร้อมกันจริงๆ) — คนละพฤติกรรมกับ Playwright's `browser.newPage()` ที่สร้าง
BrowserContext ใหม่แยก cookie jar ให้อัตโนมัติทุกครั้ง (ใช้ประโยชน์จากจุดนี้ใน
`member-management.spec.ts` เพื่อให้ Owner กับ Member เป็น session จริงพร้อมกันสองอันในเทสเดียว)
จดไว้เผื่อ debug bug ลักษณะ "อยู่ดีๆ เห็น session ผิดคน" ในอนาคตกับ Claude Browser tool

**เกร็ดความรู้อีกจุด (สคริปต์ cleanup ชั่วคราว)**: เขียนสคริปต์ `_manual-cleanup.ts`/
`_check-clean.ts` ที่ root (ลบทิ้งทันทีหลังใช้ ไม่เคย commit) เพื่อล้างข้อมูล manual-test ออกจาก
Neon ครั้งแรกเจอ error `Invalid environment variables` ทั้งที่เขียน `process.loadEnvFile()`
ไว้บรรทัดบนสุดแล้ว — สาเหตุคือไฟล์ `.ts` รันแบบ ESM จริง (`tsx`) ทำให้ `import { prisma } from
"./src/lib/prisma"` แบบ static ถูก hoist ขึ้นไปรันก่อน `process.loadEnvFile()` เสมอ (import
hoisting เป็นพฤติกรรมมาตรฐานของ ES module ไม่ใช่บั๊ก) ทำให้ `src/config/env.ts` validate ก่อนที่
`.env` จะถูกโหลด แก้ด้วยการเปลี่ยนเป็น `const { prisma } = await import(...)` แบบ dynamic
(ไม่ถูก hoist) ไว้ในบรรทัดหลัง `process.loadEnvFile()` แทน — จดไว้เผื่อเขียนสคริปต์ one-off ทำนอง
นี้อีกในอนาคต (ไฟล์ที่มีอยู่แล้วในโปรเจกต์อย่าง `prisma/seed.ts`/`tests/integration/setup.ts`/
`tests/e2e/global-setup.ts` ไม่เจอปัญหานี้เพราะเป็น setup file แยกที่ runner เรียกก่อน import
อื่นเสมออยู่แล้ว ไม่ใช่ static import ในไฟล์เดียวกัน)

### 4) Integration Tests (41 test ใหม่ รวมเป็น 70)

4 ไฟล์ใหม่ (`workspace`, `workspace-member`, `project`, `workspace-isolation`
`.integration.test.ts`) เรียก Route Handler ตรง (mock เฉพาะ `auth()` เหมือน M2's
`profile-and-me.integration.test.ts`) ครอบคลุม CRUD ครบทุก resource, 404-not-403 ทุกจุด (ยืนยัน
ด้วย `toEqual` เทียบ body ระหว่าง non-member กับ nonexistent), 403 สำหรับ role ไม่พอ,
cross-workspace tampering guard (memberId จาก workspace อื่น), owner-immutable ทั้ง role-change/
remove เพิ่ม `deleteTestWorkspace`/`uniqueSlug`/`sessionFor` ใน `tests/integration/helpers.ts`
(ใช้ร่วมกันทุกไฟล์ใหม่ แทนที่จะ copy helper ซ้ำแบบที่ M2 เคยทำ)

### 5) Playwright E2E (23 test ใหม่ รวมเป็น 34)

4 ไฟล์ใหม่: `workspace-flow` (Login→Create→Picker 0/1/2+→Switcher), `project-flow`
(list empty-state→create→detail→edit→dashboard preview), `member-management` (2 browser
context จริงพร้อมกันผ่าน `browser.newPage()` — Owner กับ Member เป็น session จริงคนละตัว ไม่ใช่
login/logout สลับกันในหน้าเดียว), `workspace-settings` (edit + rename ตาม slug ใหม่ + slug เก่า 404) เพิ่ม `deleteTestWorkspace`/`uniqueSlug` ใน `tests/e2e/db-helpers.ts` +
`scripts/delete-test-workspace.ts` (คู่กับของเดิมที่มีแค่ user)

**บั๊กที่พบระหว่างเขียน**:

1. Test เอง buggy: `WorkspaceSwitcher` render เป็น `<a>` (ผ่าน `Button asChild` + `Link`) ไม่ใช่
   `<button>` จริง — แก้ selector จาก `getByRole("button", ...)` เป็น `getByRole("link", ...)`
2. **Turbopack dev-server flakiness ภายใต้ concurrent load** (ไม่ใช่บั๊กแอป): รัน `pnpm test:e2e`
   (ใช้ `next dev`) พร้อมกัน 8 worker บางรอบเจอ `strict mode violation: resolved to 2 elements`
   ที่ข้อความต่างกันไปทุกรอบ (การ์ด project, คำอธิบาย workspace, ข้อความ empty-state) พร้อม log
   `TypeError: controller[kState].transformAlgorithm is not a function` จากฝั่ง webserver —
   ยืนยันด้วยการรันชุดเดียวกันกับ **production build** (`pnpm build && pnpm start`) **2 รอบ
   ติดกัน ผ่าน 34/34 ทั้งคู่ ใช้เวลาแค่ ~15s** (เทียบกับ dev mode ~30s และไม่เสถียร) — สรุปว่าเป็น
   Turbopack dev-server response-streaming bug ภายใต้ load หนักในเครื่องนี้ (คนละรอยเดียวกับ
   OneDrive junction-point bug ที่เจอตอน M2) **ไม่ใช่โค้ดแอปพัง** เพิ่ม comment ในจุดที่ assertion
   อาจโดน pattern นี้ (`getByText` → เปลี่ยนเป็น `getByRole("link", ...)` หรือ `.first()` ให้ทนต่อ
   double-render ชั่วคราว) แนะนำผู้ใช้ว่าถ้ารัน CI จริงควรรันกับ production build ไม่ใช่ `next dev`

### 6) Documentation

อัปเดต `docs/architecture.md` (เพิ่มหัวข้อ "Two independent RBAC tiers" และ "Workspace as the
tenancy boundary" + แก้ "Current state" ที่ค้างมาตั้งแต่ Foundation), `docs/folder-structure.md`
(เพิ่มหัวข้อ `app/w/[slug]/` เป็น top-level segment และ `features/workspace|project/`),
`docs/session-log.md` (ไฟล์นี้)

### รายการไฟล์ทั้งหมดของรอบนี้ (จาก `git status` ณ ตอนที่รายงาน)

**Modified (9 ไฟล์ตาม `git status`)**: `prisma/schema.prisma`, `src/middleware.ts`,
`src/lib/auth/rbac.ts` (comment เท่านั้น) — ทั้ง 3 ไฟล์นี้ถูกแก้ไปแล้วตั้งแต่ Increment 1/2/4 ก่อน
รอบนี้ ไม่ได้แก้เพิ่มวันนี้ ส่วนที่แก้จริงในรอบนี้คือ `src/lib/api-client.ts` (+`delete` method),
`tests/integration/helpers.ts` (+`deleteTestWorkspace`/`uniqueSlug`/`sessionFor`),
`tests/e2e/db-helpers.ts` (+`deleteTestWorkspace`/`uniqueSlug`), และ
`docs/{architecture,folder-structure,session-log}.md`

**Added ใหม่ทั้งหมด (~54 ไฟล์)**:

- API: `app/api/workspaces/{route,[workspaceId]/route,[workspaceId]/members/route,
[workspaceId]/members/[memberId]/route,[workspaceId]/projects/route}.ts`,
  `app/api/projects/[projectId]/route.ts`
- UI: `app/(dashboard)/workspaces/{page,new/page}.tsx`, `app/w/[slug]/{layout,page}.tsx`,
  `w/[slug]/settings/page.tsx`, `w/[slug]/members/page.tsx`, `w/[slug]/projects/{page,new/page}.tsx`,
  `w/[slug]/projects/[projectId]/{page,edit/page}.tsx`
- `features/workspace/`: schemas×5 (+2 test), hooks×6, components×6, `workspace-response.ts`,
  `workspace-member-response.ts`
- `features/project/`: schemas×2, hooks×2, components×2, `project-response.ts`
- `lib/auth/{workspace-rbac.ts+test,workspace-membership.ts}`, `lib/slug.ts+test`
- `repositories/workspace/{workspace,workspace-member,project}.repository.ts`
- Tests: `tests/integration/{workspace,workspace-member,project,workspace-isolation}
.integration.test.ts`, `tests/e2e/{workspace-flow,project-flow,member-management,
workspace-settings}.spec.ts`, `tests/e2e/scripts/delete-test-workspace.ts`
- Migration: `prisma/migrations/20260727023507_add_workspace_project_core/migration.sql`

หมายเหตุ: บางไฟล์ในรายการนี้ (เช่น `create-workspace-form.tsx`, `workspace-picker.tsx`,
`workspace-switcher.tsx`, `use-workspaces.ts`, `use-create-workspace.ts`) เป็นของ Increment 5
เดิม (ก่อนรอบนี้) แต่ยัง untracked เหมือนกันเพราะทั้ง Milestone 3 ยังไม่เคย commit เลยสักครั้ง —
git status เห็นเป็นไฟล์ใหม่ทั้งหมดเท่ากันหมด ไม่ได้แปลว่าทุกไฟล์ถูกสร้างในรอบนี้

---

## Milestone 3 Final Quality Gate

| ขั้นตอน                      | ผล                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm prisma generate`       | ✅                                                                                                                                    |
| `pnpm prisma migrate status` | ✅ "Database schema is up to date!"                                                                                                   |
| `pnpm lint`                  | ✅ 0 error                                                                                                                            |
| `pnpm typecheck`             | ✅ 0 error                                                                                                                            |
| `pnpm build`                 | ✅ (clean `.next`, ทุก route ใหม่ compile ผ่าน)                                                                                       |
| `pnpm test` (unit)           | ✅ 42/42                                                                                                                              |
| `pnpm test:integration`      | ✅ 70/70 (ต่อ Neon จริง)                                                                                                              |
| `pnpm test:e2e`              | ✅ 34/34 **×2 รอบติดกันกับ production build** (`next start`) — dev mode (`next dev`) มี flake ที่ไม่ใช่บั๊กแอป ดูหัวข้อบั๊ก #2 ด้านบน |

ตรวจ Neon จริงหลังรันทุก suite: `User:0 Workspace:0 WorkspaceMember:0 Project:0 AuditLog:0
VerificationToken:0` — สะอาด 100%

**ยังไม่ commit/tag ใดๆ** ตามคำสั่ง — รอ Final Review Report และการอนุมัติ

## Milestone 3 Committed: v0.3.0

ผู้ใช้อนุมัติ Final Review Report แล้วสั่ง commit+tag+push — commit `83808bf`
("feat(workspace): complete milestone 3"), annotated tag `v0.3.0`, push ขึ้น `origin/main`
สำเร็จ (72 ไฟล์เปลี่ยน) ยืนยันด้วย `git ls-remote origin` ตรงกับ local **Milestone 3 ปิดสมบูรณ์**
หมายเหตุ: README.md/CHANGELOG.md ไม่ได้อัปเดตในรอบ audit นี้ (ต่างจาก M2 ที่อัปเดตทั้งคู่ก่อน commit) —
ยังค้างอยู่ที่สถานะ "Milestone 2 complete"/`[0.2.0]` ล่าสุด ไม่ใช่ปัญหาเร่งด่วนแต่ควรแก้ก่อน
Milestone ถัดไปจะปิด

---

## Milestone 4 — Architecture & Planning Phase (ก่อนเขียนโค้ด)

ผู้ใช้สั่งให้ทำ architecture/planning phase เต็มรูปแบบสำหรับ Milestone 4 (Task Management Core)
ก่อนแตะโค้ดใดๆ — ห้ามแก้ไฟล์ ห้ามเขียนโค้ด รอ approve ก่อนเสมอ ทบทวน schema/architecture.md/
folder-structure.md ทั้งหมด รวมถึงย้อนอ่าน session-log.md ทุก Phase เพื่อดึงข้อจำกัดที่ล็อกไว้แล้ว
ตั้งแต่ต้นโปรเจกต์ ที่พบและใช้เป็นข้อจำกัดจริง (ไม่ใช่ทางเลือกเปิด):

- **Status/Priority values ถูกล็อกไว้แล้วใน `globals.css`** ตั้งแต่ Phase 3 (6 status, 5 priority)
  ยังไม่เคยถูกใช้ในโค้ดเลยจนถึงตอนนี้ — enum ต้องตรงเป๊ะ ไม่ใช่คิดใหม่
- **ชื่อ resource คือ `Issue` ไม่ใช่ `Task`** — ตรงกับ README ("issue tracker"), ERD เดิมจาก Phase 2,
  และตัวอย่าง commit message ใน `coding-standards.md` เอง (`feat(issues): ...`)
  แม้ milestone จะชื่อ "Task Management" ในแผนเดิมก็ตาม
- **Project Key ถูก defer มาที่นี่แล้วตั้งแต่ M3** (Decision Point 5: "ยังไม่มี Issue/Task system
  จะออกแบบพร้อมกันตอนนั้น") — ต้องออกแบบพร้อมกับ Issue schema รอบนี้

เสนอแผนครบ 6 หัวข้อ (Prisma schema, API endpoints, RBAC, repository layer, feature modules, UI
routes) + testing strategy + migration strategy + architectural risks + roadmap 9 increment
(จังหวะเดียวกับ M2/M3) พร้อม **Decision Points A–H** ให้อนุมัติก่อนเริ่ม — ผู้ใช้อนุมัติทุกข้อตามที่
เสนอ (คอลัมน์ "เลือก" ด้านล่าง) letter พวกนี้ถูกอ้างอิงซ้ำตลอดทุก increment ที่ตามมา เก็บตารางเต็มไว้
ที่นี่กันต้องไล่ความจำ:

| #   | หัวข้อ                        | เลือก                                                     |
| --- | ----------------------------- | --------------------------------------------------------- |
| A   | ชื่อ model                    | `Issue` (ไม่ใช่ `Task`)                                   |
| B   | ขอบเขต unique ของ Project key | ทั้ง workspace (workspace-wide) ไม่ใช่แค่ใน project เดียว |
| C   | Drag-and-drop                 | Defer — ใช้ status control (ปุ่ม/dropdown) ก่อน           |
| D   | Issue detail UI               | หน้าเต็มธรรมดาก่อน ไม่ใช่ slide-over/intercepting route   |
| E   | Activity feed                 | Defer ทั้งหมด (ไม่มี `IssueActivity` model ใน M4)         |
| F   | ขอบเขตของ Label               | Workspace-scoped (ใช้ร่วมกันได้ทุก project ใน workspace)  |
| G   | ใครแก้ไข issue ได้            | MEMBER ขึ้นไปทุกคน (ไม่จำกัดแค่ reporter/assignee/ADMIN)  |
| H   | Comment moderation            | Author แก้ไข comment ตัวเองได้ / ADMIN+ ลบของใครก็ได้     |

สั่งเริ่มเฉพาะ **Increment 1** เท่านั้น ห้ามข้ามไป increment อื่น

### Increment 1 — Prisma Schema + Migration ✅

**Schema**: เพิ่ม `IssueStatus`/`IssuePriority` enum (ตรงกับ token ที่ล็อกไว้), model
`Issue`/`Label`/`IssueLabel`/`Comment`, เพิ่ม `Project.key`/`Project.issueCounter` (คอลัมน์ใหม่บน
ตาราง M3 เดิม — migration แรกของ M4 ที่แตะตาราง milestone ก่อนหน้า ต่างจาก M3 ที่ไม่แตะตาราง M2
เลย) ตรวจ row count ก่อนรัน migration ยืนยัน `Project:0` แถว จึงเพิ่มคอลัมน์ `key` แบบ required
(ไม่มี default) ได้อย่างปลอดภัยโดยไม่ต้อง backfill

**บล็อกเกอร์เครื่องมือที่เจอ**: `prisma migrate dev` ปฏิเสธรันเพราะ environment เป็น
non-interactive (มี warning เรื่อง unique constraint ที่ปกติต้อง confirm ผ่าน TTY) แก้ด้วยการใช้
`prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --script` สร้าง
SQL ดิบแทน (เทียบ DB จริงกับ schema ตรงๆ ไม่ต้องใช้ shadow database) แล้วสร้างโฟลเดอร์ migration เอง
ตาม convention ของ Prisma (`<timestamp>_<name>/migration.sql`) ก่อนรัน `prisma migrate deploy`
(คำสั่งที่ออกแบบมาสำหรับ non-interactive CI/deploy โดยเฉพาะ ไม่ต้อง confirm) — ยืนยัน SQL ที่ได้
ตรงกับที่ `migrate dev` ควรสร้างเป๊ะก่อนรัน (ตรวจเองว่ามีแต่ `CREATE TYPE`/`CREATE TABLE`/
`ALTER TABLE ... ADD COLUMN`/`CREATE INDEX`/`ADD FOREIGN KEY` ไม่มีอะไร destructive)

**ตรวจสอบผลกระทบ migration**: query Neon จริงยืนยัน 13 ตาราง (9 เดิม + 4 ใหม่), คอลัมน์ใหม่บน
`Project` ตรงตาม design (`key` text NOT NULL ไม่มี default, `issueCounter` integer NOT NULL
default 0), FK cascade rule ทุกจุดตรงตามที่ออกแบบ (`Issue.assignee`→SetNull,
`Issue.reporter`/`Comment.author`→Restrict, ที่เหลือ Cascade) row count ทุกตารางที่เกี่ยวข้องยังคง
0

**ปัญหาที่ต้องตัดสินใจ**: เพิ่มคอลัมน์ `Project.key` แบบ required ทำให้ `pnpm typecheck` พังที่จุด
เดียว (`project.repository.ts`'s `create()` + route ที่เรียกมัน เพราะยังไม่มีที่ไหน generate ค่า
`key`) ถามผู้ใช้ว่าจะแก้แบบ minimal ตอนนี้หรือปล่อยแดงไปจนกว่าจะถึง Increment 2 — **ผู้ใช้เลือกแก้
แบบ minimal ทันที** เพิ่ม `src/lib/issue-key.ts` (`deriveIssueKey()` — pure function แปลงชื่อ
project เป็น prefix ตัวพิมพ์ใหญ่ เช่น "Design System"→"DS", "Orbit"→"ORB", รูปแบบเดียวกับ
`slug.ts` เป๊ะ) + unit test 6 ตัว, เพิ่ม `projectRepository.findByWorkspaceAndKey` (mirror
`findByWorkspaceAndName`), แก้ route `POST /api/workspaces/[workspaceId]/projects` ให้ derive
key จากชื่อ + เช็ค collision คืน 409 `key_taken` (ไม่มี auto-retry-with-suffix — mirror พฤติกรรม
จริงของ `slug_taken` ที่มีอยู่แล้ว ไม่ใช่ของใหม่), เพิ่ม `key` เข้า `toProjectResponse` ให้ตรงกับ
field ที่มีจริงในโมเดล (field ที่ต้อง generate เอง เช่น การให้ user แก้ key ได้ ยังไม่ทำ — รอ
increment ถัดไปตามที่ตกลง)

**Quality Gate**: `lint` ✅ `typecheck` ✅ `build` ✅ `test` ✅ 48/48 (unit, +6 จาก
`issue-key.test.ts`) `test:integration` ✅ 70/70 (ไม่มี test ใหม่ของ Issue/Label/Comment รอบนี้
ตามสโคป — Increment 1 คือ schema เท่านั้น) `test:e2e` ✅ 34/34 (รันกับ production build ตาม
บทเรียนจาก M3 เรื่อง Turbopack dev-server flakiness) ตรวจ Neon จริงหลังรันทุก suite:
`user:0 workspace:0 project:0 issue:0 label:0 comment:0` สะอาด 100%

ยังไม่ commit (รอทำครบทุก increment ตาม pattern M2/M3) รายงานผลแล้วรออนุมัติก่อนเริ่ม Increment 2

### Increment 2 — Repositories + Zod Schemas + Response Mappers ✅

ผู้ใช้อนุมัติ Increment 1 สั่งทำเฉพาะ Increment 2 ตามสโคป: repository สำหรับ Issue/Label/Comment,
zod schemas, response mapper — **ห้ามมี API route/UI/hooks รอบนี้** ไม่มี integration/e2e test
(ยังไม่มี route ให้ test เรียก) มีแค่ unit test สำหรับ schema ที่มี logic จริงคุ้มค่าจะ test

**Repositories** (`repositories/issue/{issue,label,comment}.repository.ts`) — mirror
`repositories/workspace/` เป๊ะ (หนึ่งไฟล์ต่อหนึ่ง model):

- `issueRepository.create()` ใช้ `prisma.$transaction` ห่อ 2 ขั้นตอน (increment
  `Project.issueCounter` แล้ว insert `Issue` ด้วยเลขนั้น) — ต่างจาก
  `workspaceRepository.createWithOwner` ที่ใช้ nested-create เพราะ Project มีอยู่แล้วไม่ได้ถูกสร้าง
  พร้อมกัน แต่ยังเป็น "หนึ่ง atomic domain operation แตะสองตาราง" แบบเดียวกัน — ยึดหลักการเดียวกับที่
  M3 วางไว้แล้ว ไม่ใช่ pattern ใหม่
- `issueRepository.findManyByProject()` เรียง `[status, position]` — ใช้ประโยชน์จากที่ Postgres
  เรียง enum column ตามลำดับที่ประกาศไว้ใน schema.prisma (ซึ่งตั้งใจเรียงให้ตรงกับลำดับคอลัมน์บน
  Kanban board อยู่แล้ว) query เดียวได้ผลลัพธ์จัดกลุ่มตามคอลัมน์บอร์ดถูกต้องทันที ไม่ต้อง sort เพิ่ม
  ฝั่ง client
- `commentRepository` ทุก method ที่คืนค่า include `author: true` (mirror
  `workspaceMemberRepository.findManyByWorkspace`) กัน response ต้อง query User แยก
- **ตั้งใจไม่เพิ่ม repository สำหรับ `IssueLabel`** (join table) รอบนี้ — ยังไม่มีอะไรเรียกใช้
  (ไม่มี label-assignment API จนกว่าจะถึง Increment 4) เพิ่มตอนนี้จะเป็น unused scaffolding ขัดกับ
  กติกาใน `development-guide.md`

**Zod schemas** (`features/issue/schemas/`) — mirror pattern `create-workspace`/`update-workspace`
เป๊ะ: `ISSUE_PRIORITIES` (export จาก `create-issue.schema.ts`, ใช้ร่วมกับ update) กับ
`ISSUE_STATUSES` (export จาก `update-issue.schema.ts` เท่านั้น เพราะ status ไม่ settable ตอน
create) ผ่าน `satisfies` เช็คตรงกับ enum จริงเหมือนที่ `PROJECT_STATUSES` ทำไว้ `updateIssueSchema`
ใช้ `assigneeId: z.uuid().nullable().optional()` แยกกรณี "ไม่แตะ" (field ไม่มีใน payload) กับ "ยกเลิก
มอบหมาย" (`null` ชัดเจน) ออกจากกัน — เขียน unit test ล็อกพฤติกรรมนี้ไว้โดยเฉพาะเพราะเป็นจุดที่ผิดพลาด
ง่ายและ repository layer ต้องพึ่งพา distinction นี้ตรงๆ `create-label.schema.ts` export
`hexColorSchema` ให้ update ใช้ร่วม (mirror `workspaceSlugSchema`) `create-comment.schema.ts` ใช้
schema เดียวกันทั้ง create/edit (comment มี field เดียวที่ required เสมอ ไม่มี partial-update shape
ที่ต่างจาก create ให้แยกไฟล์)

**Response mappers** (`features/issue/{issue,label,comment}-response.ts`) — `toIssueResponse`
รับ `projectKey` เป็น parameter แยก เพราะ `key` ของ issue ("ORB-123") คำนวณจาก `project.key` +
`issue.number` ไม่ได้เก็บเป็นคอลัมน์ (single source of truth เหมือนทุก mapper ก่อนหน้า)
`toCommentResponse` ไม่ spread ทั้ง `User` row (กัน `passwordHash` หลุด mirror
`toWorkspaceMemberResponse`)

**ปัญหาที่ต้องตัดสินใจซ้ำจาก Increment 1**: ไม่มีรอบนี้ — งานอยู่ในสโคปที่ตกลงไว้ล่วงหน้าครบ ไม่มี
fallout ที่กระทบไฟล์เดิมเหมือน Increment 1

**Quality Gate**: `lint` ✅ `typecheck` ✅ `build` ✅ (ไม่มี route ใหม่ ตามสโคป route list เหมือน
Increment 1 เป๊ะ) `test` ✅ 62/62 (unit, +14 จาก `create-label.schema.test.ts` (6) และ
`update-issue.schema.test.ts` (8)) — ไม่รัน `test:integration`/`test:e2e` เพราะยังไม่มี route ให้
เทส (ตามสโคปที่ตกลง ไม่ใช่ข้าม)

ยังไม่ commit (รอทำครบทุก increment ตาม pattern M2/M3) รายงานผลแล้วรออนุมัติก่อนเริ่ม Increment 3

### Increment 3 — Issue API Routes ✅

ผู้ใช้อนุมัติ Increment 2 สั่งทำเฉพาะ Increment 3 ตามสโคป: Issue API routes/validation/repository
integration/RBAC/response mapper — **ห้าม UI/hooks/middleware/schema เปลี่ยน/migration ใหม่/
Label API/Comment API/integration test/e2e test รอบนี้**

**Routes** (2 ไฟล์ 5 handler รวม): `POST/GET /api/projects/[projectId]/issues` (list+create),
`GET/PATCH/DELETE /api/issues/[issueId]` (detail/update/delete) — mirror pattern
`/api/projects/[projectId]/route.ts` เป๊ะ (resolve child resource ก่อน แล้ว derive workspaceId
จากมัน ไม่ใช่รับ workspaceId ตรงจาก URL แบบ list/create ของ Project) 404-not-403 ทุกจุด (เช็คซ้ำ
ด้วยการอ่าน error message ให้ตรงกับ resource: "Project not found" สำหรับ issues list/create,
"Issue not found" สำหรับ detail/update/delete)

**RBAC** (Decision Point G): MEMBER+ ดู/สร้าง/แก้ issue ได้ (ต่างจาก Project ที่สร้าง/แก้ต้อง
ADMIN+ — เหตุผลเดิม: issue เป็นงานประจำวันของ contributor ไม่ใช่โครงสร้าง workspace) ADMIN+ ลบ
เท่านั้น (ตรงกับ bar ของ Project delete)

**จุดออกแบบใหม่ที่ไม่มีใน M3 มาก่อน**:

1. **Assignee ต้องเป็น workspace member** — ไม่มี FK บังคับ cross-table ได้ เช็คด้วย
   `resolveWorkspaceMembership(project.workspaceId, data.assigneeId)` เองใน route (POST และ
   PATCH) คืน 400 `invalid_assignee` ถ้าไม่ใช่ — ตรงกับ Risk 5 ที่ระบุไว้ตั้งแต่ Architecture
   Review เช็คด้วย `if (data.assigneeId)` ตัวเดียวครอบทั้ง 3 กรณี (null=unassign ข้ามเช็ค,
   undefined=ไม่แตะข้ามเช็ค, string จริง=validate) เพราะ falsy check ครอบคลุมพอดี
2. **Position คำนวณฝั่ง server ตอนสร้าง** — เพิ่ม `issueRepository.findMaxPositionInStatus()`
   (aggregate query ใหม่) หา max position ของ column BACKLOG ในโปรเจกต์นั้น แล้ว `+1000` (gap
   ใหญ่ๆ เผื่อ increment ในอนาคตที่มี drag-and-drop ต้องคำนวณ midpoint) ไม่ต้องรอ increment
   ถัดไป เพราะ POST ต้องมีค่านี้ใช้งานได้จริงตั้งแต่รอบนี้ ถึงแม้ drag-and-drop เองจะ defer อยู่
   (Decision Point C)

**Quality Gate**: `lint` ✅ `typecheck` ✅ `build` ✅ (route ใหม่ 2 เส้นทางปรากฏถูกต้อง:
`/api/issues/[issueId]`, `/api/projects/[projectId]/issues`) `test` ✅ 62/62 (ไม่มี unit test
ใหม่รอบนี้ตามสโคป — ไม่มี helper/schema ใหม่ให้ test มีแต่ route ซึ่งเทสผ่าน integration/e2e ที่
defer ไป) ไม่รัน `test:integration`/`test:e2e` ตามคำสั่งชัดเจนของผู้ใช้รอบนี้

ยังไม่ commit (รอทำครบทุก increment ตาม pattern M2/M3) รายงานผลแล้วรออนุมัติก่อนเริ่ม Increment 4

### Increment 4 — Label API + Comment API + IssueLabel Repository ✅

ผู้ใช้อนุมัติ Increment 3 สั่งทำเฉพาะ Increment 4 ตามสโคป: Label API, Comment API, IssueLabel
repository, repository integration, RBAC, response mapper — **ห้าม UI/hooks/schema เปลี่ยน/
migration ใหม่/integration test/e2e test/เริ่ม Kanban รอบนี้**

**IssueLabel repository ใหม่** (`repositories/issue/issue-label.repository.ts`) — ตามที่ defer
ไว้จาก Increment 2 ตอนนี้มี label-assignment API จริงให้เรียกใช้แล้ว ไม่มี response mapper แยก
เพราะ join row เองไม่มี field ที่มีความหมายนอกจาก 2 id (ตามที่ comment ใน schema.prisma บอกไว้
ตั้งแต่ Increment 1) — caller map ผ่าน `label` (`toLabelResponse`) แทน

**Routes** (6 ไฟล์ 10 handler รวม):

- `GET/POST /api/workspaces/[workspaceId]/labels` — list/create label definition (ADMIN+ สร้าง,
  Decision Point F)
- `PATCH/DELETE /api/workspaces/[workspaceId]/labels/[labelId]` — แก้/ลบ (ADMIN+) มี
  cross-workspace tampering guard เหมือน `members/[memberId]/route.ts` เป๊ะ
  (`resolveTargetLabel` เช็ค `label.workspaceId !== workspaceId`)
- `GET/POST /api/issues/[issueId]/labels` — list/attach label ให้ issue (**MEMBER+ ทั้งคู่** —
  ต่างจากการสร้าง label definition ที่ต้อง ADMIN+ เพราะ "ติด label ที่มีอยู่แล้ว" เป็นงาน triage
  ประจำวัน ไม่ใช่งานโครงสร้าง) เช็คว่า label เป็นของ workspace เดียวกับ issue ก่อนเสมอ (คนละ
  workspace → 404 เหมือน label ไม่มีอยู่จริง)
- `DELETE /api/issues/[issueId]/labels/[labelId]` — detach (MEMBER+)
- `GET/POST /api/issues/[issueId]/comments` — list/สร้าง comment (MEMBER+, Decision Point H)
- `PATCH/DELETE /api/comments/[commentId]` — แก้ (author เท่านั้น) / ลบ (author หรือ ADMIN+,
  Decision Point H) — flat route แก้ตาม `commentId` อย่างเดียว ต้อง resolve
  comment→issue→project→workspace เองในฟังก์ชัน `resolveCommentContext` (รูปแบบเดียวกับที่
  `/api/issues/[issueId]/route.ts` resolve issue→project) ก่อนเช็คสิทธิ์ได้

**Schema ใหม่ 1 ไฟล์**: `attach-label.schema.ts` (`{labelId: uuid}`) — payload ใหม่ที่ยังไม่มี
schema รองรับจาก Increment 2 (create-comment schema ถูกใช้ซ้ำสำหรับ PATCH comment ตามที่ออกแบบไว้
ตั้งแต่ต้น ไม่ต้องสร้างใหม่)

**Quality Gate**: `lint` ✅ `typecheck` ✅ `build` ✅ (route ใหม่ 6 เส้นทางปรากฏถูกต้อง) `test`
✅ 62/62 (ไม่มี unit test ใหม่ — `attachLabelSchema` เป็น single-field uuid validation ธรรมดา
ไม่มี edge-case logic ที่คุ้มค่าจะ test แยก ตรงกับที่ตัดสินใจไว้ตั้งแต่ Increment 2 สำหรับ schema
แบบเดียวกัน) ไม่รัน `test:integration`/`test:e2e` ตามคำสั่งชัดเจนของผู้ใช้รอบนี้

ยังไม่ commit (รอทำครบทุก increment ตาม pattern M2/M3) รายงานผลแล้วรออนุมัติก่อนเริ่ม Increment 5

### Increment 5A — TanStack Query Hooks (Issue/Label/Comment) ✅

ผู้ใช้อนุมัติ Increment 4 สั่งทำเฉพาะ Increment 5A ตามสโคป: React Query hooks สำหรับ Issue/Label/
Comment เท่านั้น — **ห้าม UI/Kanban/dialog/routing/schema เปลี่ยน/API เปลี่ยน/middleware เปลี่ยน
รอบนี้** เป็น increment แรกของ M4 ที่แตะ client-side code แต่ยังไม่ใช่ UI จริง

**16 hook ไฟล์ใหม่** ใน `features/issue/hooks/` mirror pattern จาก M3 เป๊ะทุกจุด:

- **Issue** (5): `use-issues` (list, query key `["issues", projectId]`), `use-issue` (detail,
  `["issue", issueId]`), `use-create-issue`, `use-update-issue`, `use-delete-issue`
  — update/delete รับทั้ง `issueId` และ `projectId` เพราะ route `PATCH/DELETE
/api/issues/[issueId]` ไม่มี `projectId` ใน URL แต่ query ของ list ต้องถูก invalidate ด้วย
  (เหตุผลเดียวกับที่ `use-update-member-role.ts` รับ `{memberId, data}` แยกจาก `workspaceId`
  ใน M3)
- **Label** (workspace definition, 4): `use-labels`, `use-create-label`, `use-update-label`
  (`{labelId, data}` mutate arg, mirror `use-update-member-role.ts`), `use-delete-label`
  (mirror `use-remove-member.ts`)
- **Issue-Label** (attach/detach, 3): `use-issue-labels` (query key แยก `"issue-labels"`
  ไม่ปนกับ `"labels"` เพราะเป็นคนละ resource — labels ที่ติดอยู่กับ issue หนึ่งอัน vs label
  ทั้งหมดของ workspace), `use-attach-label`, `use-detach-label`
- **Comment** (4): `use-comments`, `use-create-comment`, `use-update-comment` (รับ `{commentId,
data}` เพราะ route แบน `/api/comments/[commentId]` ไม่มี `issueId` ใน URL, reuse
  `CreateCommentInput` type เหมือนที่ route เอง reuse schema), `use-delete-comment`

**ตัดสินใจสำคัญ**: ทุก mutation hook ของ Issue/Label/Comment มี `invalidateQueries` (ต่างจาก
`use-create-project.ts`/`use-update-project.ts` ของ M3 ที่ **ไม่มี** invalidation เพราะหน้า
project เป็น Server Component อ่านตรงจาก repository) เหตุผล: Kanban board (Increment 5B) เป็น UI
ที่โต้ตอบถี่มาก (เปลี่ยนสถานะบ่อย, comment เพิ่มบ่อย) เหมาะกับ client-side cache + invalidate
มากกว่า router.refresh() แบบเต็มหน้า — ตัดสินใจไว้ล่วงหน้าก่อนเขียน UI จริงเพื่อให้ Increment 5B
ไม่ต้องมาตัดสินใจสถาปัตยกรรมกลางทาง

**Quality Gate**: `lint` ✅ `typecheck` ✅ `build` ✅ (route list ไม่เปลี่ยน ตามคาด — hook ไม่ใช่
route) `test` ✅ 62/62 ไม่เปลี่ยน (hook ที่เป็นแค่ wrapper รอบ useQuery/useMutation ไม่มี logic ให้
unit test — ตรงกับที่ M3 ไม่เคย unit test hook ไฟล์ไหนเลยสักตัว) ไม่รัน `test:integration`/
`test:e2e` ตามคำสั่งชัดเจนของผู้ใช้รอบนี้

ยังไม่ commit (รอทำครบทุก increment ตาม pattern M2/M3) รายงานผลแล้วรออนุมัติก่อนเริ่ม Increment 5B

### Increment 5B — Kanban Board Shell, Columns, Issue Cards ✅

ผู้ใช้อนุมัติ Increment 5A พร้อมตัดสินใจเรื่อง label ที่ค้างไว้ล่วงหน้า: **embed labels เข้าไปใน
Issue response เลย ไม่ให้ board fetch label แยกต่อ card** (เพื่อให้ board โหลดด้วย request เดียว)
สั่งทำเฉพาะ Increment 5B ตามสโคป — **ห้าม issue detail page/comments UI/label management UI/
drag-and-drop/dialog/filter/routing เปลี่ยน/schema เปลี่ยน/API endpoint ใหม่รอบนี้** (ขยาย response
shape ได้เท่าที่จำเป็น)

**Extend Issue response ให้ embed labels** (ตามคำสั่ง): เพิ่ม `WITH_LABELS` constant
(`{labels: {include: {label: true}}}`) ใน `issue.repository.ts` ใช้ร่วมกันทั้ง 4 method ที่คืน
Issue (`create`/`findById`/`findManyByProject`/`update`) เพื่อให้ type ที่ป้อนเข้า
`toIssueResponse` สอดคล้องกันไม่ว่าจะมาจาก method ไหน `toIssueResponse` เพิ่ม `labels:
LabelResponse[]` โดย map ผ่าน `toLabelResponse` ที่มีอยู่แล้ว (reuse ไม่สร้าง mapper ใหม่)
อัปเดต `IssueResponse` (client type ใน `use-issues.ts`) ให้ตรงกัน — **ไม่มี API route ใหม่**
ตามที่สั่ง เป็นแค่ response shape ขยาย

**Constants ใหม่**: `src/constants/issue.ts` (`ISSUE_STATUS_COLOR`/`ISSUE_PRIORITY_COLOR`) —
การใช้งานจริงครั้งแรกของโฟลเดอร์ `constants/` ที่ folder-structure.md จองไว้ตั้งแต่ Foundation
("status colors/labels, role hierarchy") ค่าอ้างอิง CSS custom property ที่ล็อกไว้ตั้งแต่ Phase 3
(`--color-status-*`/`--color-priority-*`) ซึ่งไม่เคยถูกใช้ในโค้ดจริงมาก่อนจนถึงตอนนี้ ใช้ inline
`style` (ไม่ใช่ Tailwind class) เพราะสีต้องคำนวณจากค่า dynamic (status/priority ของแต่ละ issue) —
Tailwind JIT compiler ตรวจจับ class name แบบ static เท่านั้น class ที่สร้างจาก string
interpolation ใช้ไม่ได้จริง

**Components 3 ไฟล์ใหม่** ใน `features/issue/components/`:

- `kanban-board.tsx` (Client Component, `"use client"`) — เรียก `useIssues(projectId)` ครั้งเดียว
  แบ่งกลุ่มตาม status ฝั่ง client (`.filter()`) ไม่ query แยกต่อ column, มี loading skeleton (6
  คอลัมน์) และ empty state (ยังไม่มี issue เลยในโปรเจกต์)
- `kanban-column.tsx` — แสดง header (จุดสีตาม `ISSUE_STATUS_COLOR` + ชื่อ status ดิบ เช่น
  "BACKLOG" ไม่แปลไทย ตรงกับ precedent ของ ProjectStatus ใน M3 ที่แสดง "ACTIVE"/"ON_HOLD" ดิบ
  เหมือนกัน) + จำนวน issue + list ของ `IssueCard`
- `issue-card.tsx` — key (font-mono ตาม typography spec Phase 3 ที่กำหนด JetBrains Mono ไว้
  สำหรับ "issue key" โดยเฉพาะ), priority badge (ซ่อนถ้า NONE), title, label badge (ถ้ามี) ทั้งหมด
  ใช้ Badge/Card เดิม ไม่สร้าง UI primitive ใหม่

**Mount บนหน้าเดิม ไม่สร้าง route ใหม่**: เพิ่ม `<KanbanBoard>` ต่อท้ายเนื้อหาเดิมของ
`/w/[slug]/projects/[projectId]/page.tsx` (Server Component เดิมจาก M3 อ่าน project info ตรงจาก
repository) — ไม่ลบ/แก้เนื้อหาเดิม (ชื่อ/description/status/owner/created date/ปุ่มแก้ไข) แค่เพิ่ม
section "Issue" ต่อท้าย ตรงกับที่ proposal เดิมเคยเสนอไว้ว่า "project detail page evolves into
Kanban board" แต่ทำแบบ additive ไม่ใช่แทนที่ทั้งหมด

**ยืนยันด้วย browser จริง**: สมัคร user จริง→สร้าง workspace/project จริง→ยืนยันหน้าว่างแสดง empty
state ถูกต้อง→สร้าง label + 2 issue (priority ต่างกัน) + ย้าย 1 issue ไป IN_PROGRESS ผ่าน API
ตรง (ยังไม่มี UI สร้าง issue ใน increment นี้) → reload หน้า → **ยืนยันด้วย
`read_network_requests` ว่ามี `GET .../issues` แค่ครั้งเดียวต่อการโหลดหน้า ไม่มี request แยกต่อ
label** ตรงตามข้อกำหนดเรื่อง efficiency ที่สั่งไว้ → เห็น DS-1 (URGENT + label "Bug") อยู่ใน
BACKLOG, DS-2 (LOW) อยู่ใน IN_PROGRESS ถูกต้องครบทั้ง 6 คอลัมน์เรียงลำดับ BACKLOG→CANCELLED
ตามที่ตั้งใจ ลบข้อมูลทดสอบหมดหลังยืนยัน (`workspace.delete` cascade ลบ project/issue/label ให้
อัตโนมัติ)

**ข้อจำกัดที่ทราบแล้ว ไม่ได้แก้รอบนี้**: หน้า project detail อยู่ใน container `max-w-3xl` (กำหนด
ไว้ที่ `w/[slug]/layout.tsx` ใช้ร่วมกับทุกหน้าใน route group) ทำให้ board แคบกว่าที่ Kanban ควรจะ
เป็นในจอกว้าง ต้อง scroll แนวนอนเร็วกว่าที่ควร — ไม่แก้ layout ที่ใช้ร่วมกันตอนนี้เพราะจะกระทบทุก
หน้าอื่นด้วย (settings/members/dashboard) ไม่ใช่แค่หน้านี้ และ "ห้าม routing เปลี่ยน" ตามสโคป
รอตัดสินใจว่าจะขยาย container เฉพาะหน้านี้หรือทั้ง route group เมื่อไหร่ที่เหมาะสม ไม่ใช่ตอนนี้ /
ตาม Phase 3 UI/UX doc มือถือควรเห็น List view + bottom tab bar แทน Kanban แต่ increment นี้สร้าง
แค่ desktop Kanban (scroll แนวนอนได้บนจอเล็กแต่ไม่ใช่ mobile-optimized list view จริง) — ยังไม่ทำ
ตามสโคปที่ไม่ได้ระบุไว้

**Quality Gate**: `lint` ✅ `typecheck` ✅ `build` ✅ (route list ไม่เปลี่ยน ตามสโคป "ไม่มี API
endpoint ใหม่") `test` ✅ 62/62 ไม่เปลี่ยน (component ใหม่ไม่มี unit test — เป็น UI component ที่
ต้องมี browser/RTL setup ถึงจะเทสได้จริง ยืนยันด้วย manual browser test แทนตามที่ทำเสมอสำหรับ UI
increment) ไม่รัน `test:integration`/`test:e2e` ตามคำสั่งชัดเจนของผู้ใช้รอบนี้

ยังไม่ commit (รอทำครบทุก increment ตาม pattern M2/M3) รายงานผลแล้วรออนุมัติก่อนเริ่ม Increment 6

### Increment 6 — Issue Detail Page, Edit/Status/Label/Comment UI ✅

ผู้ใช้อนุมัติ Increment 5B สั่งทำเฉพาะ Increment 6 ตามสโคป: Create Issue dialog, Edit Issue UI,
Issue detail panel/page, Comment UI, Label assignment UI, Status change UI — **reuse hook จาก
Increment 5A ทั้งหมด ห้ามสร้าง API endpoint ใหม่นอกจากจำเป็นจริงๆ ห้าม drag-and-drop** สุดท้ายไม่ต้อง
เพิ่ม API endpoint ใหม่แม้แต่ตัวเดียว — ทุกอย่างต่อกับ 15 endpoint ที่มีอยู่แล้วจาก Increment 3/4

**Textarea primitive ใหม่** (`components/ui/textarea.tsx`) — shadcn ไม่เคยถูกติดตั้งให้มี textarea
มาก่อน (Foundation ติดตั้งแค่ Button/Input/Card/Badge/Skeleton/Dialog) เขียนเองมิเรอร์ style ของ
`input.tsx` เป๊ะ (ไม่เพิ่ม dependency ใหม่) จำเป็นเพราะ description ของ issue และ comment body เป็น
ข้อความหลายบรรทัด ใช้ `Input` บรรทัดเดียวจะแย่มากด้าน UX

**Component ใหม่ 6 ไฟล์** ใน `features/issue/components/`:

- `create-issue-dialog.tsx` — Dialog แบบ controlled state เดียวกับที่ `MemberList`'s ปุ่มลบใช้อยู่
  (ไม่ใช้ `DialogTrigger asChild` เพราะ codebase ยังไม่เคยใช้ pattern นั้นเลย) ฟอร์ม title/
  description/priority/assignee เรียก `useWorkspaceMembers`(M3)+`useCreateIssue`(5A) ตรงๆ
- `edit-issue-form.tsx` — title/description/priority/assignee พร้อมปุ่ม "บันทึก" **ไม่มี `status`**
  ในฟอร์มนี้โดยตั้งใจ เพื่อไม่ให้มีสอง control แก้ field เดียวกันพร้อมกัน (ดูข้อถัดไป) ทุก MEMBER
  แก้ได้ (Decision Point G) ไม่มี role gate เหมือน `EditProjectForm`
- `issue-status-select.tsx` — instant-apply select (onChange ยิงทันที ไม่มีปุ่ม save) มิเรอร์
  `MemberList`'s role `<select>` เป๊ะ — คือ "status control (ปุ่ม/dropdown)" ที่ Decision Point C
  เสนอไว้แทน drag-and-drop
- `issue-label-section.tsx` — แสดง label ที่ติดอยู่ (`useIssueLabels`) พร้อมปุ่ม detach ต่อป้าย
  (MEMBER+ ตาม Decision Point F), dropdown แนบ label ที่มีอยู่แล้ว (MEMBER+), และฟอร์มสร้าง label
  ใหม่แบบย่อ (**ADMIN+ เท่านั้น** ตรงกับ bar ของ `POST /api/workspaces/[id]/labels`) — ตัดสินใจเอง
  ว่ารวม "สร้าง label ใหม่" เข้าไปด้วยแม้ผู้ใช้เขียนสโคปว่า "Label assignment UI" เฉยๆ เพราะไม่งั้น
  workspace ที่ยังไม่มี label เลยจะ "แนบ" อะไรไม่ได้เลย — ระบุไว้ชัดเจนในรายงานนี้เผื่อไม่ตรงตามที่
  ตั้งใจไว้
- `comment-section.tsx` — list + สร้าง comment + แต่ละแถวมี "แก้ไข" (author เท่านั้น) / "ลบ"
  (author หรือ ADMIN+ ตาม Decision Point H) พร้อม confirm dialog ก่อนลบ มิเรอร์ pattern เดียวกับ
  `MemberList`'s remove-confirm เป๊ะ
- `issue-detail-panel.tsx` — client orchestrator ตัวเดียวที่เรียก `useIssue()` ครั้งเดียว
  แล้วส่ง initial value ไปให้ `EditIssueForm` เป็น prop (มิเรอร์วิธี initialize-from-resolved-data
  ไม่ใช้ effect แบบ `ProfileFields`/`EditProjectForm` — ต่างกันแค่ตรงที่ resolve ผ่าน client query
  แทน Server Component prop เพราะสั่งให้ reuse hook)

**Route ใหม่ 1 เส้นทาง**: `app/w/[slug]/projects/[projectId]/issues/[issueId]/page.tsx`
(Server Component) — resolve session→workspace(`resolveWorkspaceForRequest`)→project
(เช็ค `project.workspaceId !== workspace.id`)→issue (เช็ค `issue.projectId !== project.id`) 404
ทุกจุดแบบเดียวกับ project detail page เป๊ะ แล้วส่ง id ต่างๆ ลงไปให้ `IssueDetailPanel` (client)
ดึงข้อมูลจริงเองผ่าน `useIssue` — หน้าเต็มธรรมดา ไม่ใช่ slide-over ตาม Decision Point D

**Kanban card เชื่อมไปหน้า detail**: `issue-card.tsx` เพิ่ม prop `slug` ห่อทั้ง Card ด้วย `<Link
href="/w/{slug}/projects/{projectId}/issues/{id}">` (thread ผ่าน `kanban-column.tsx`/
`kanban-board.tsx`) project detail page (`page.tsx`) เพิ่มปุ่ม "Issue ใหม่" (`CreateIssueDialog`)
ข้างหัวข้อ "Issue"

**Quality Gate**: `lint` ✅ 0 error (autofix แค่ import order) `typecheck` ✅ 0 error `build` ✅
(route ใหม่ปรากฏถูกต้อง: `/w/[slug]/projects/[projectId]/issues/[issueId]`, ไม่มี API route ใหม่
ตามที่ตั้งใจ) `test` ✅ 62/62 ไม่เปลี่ยน (component ใหม่ไม่มี unit test — เหตุผลเดียวกับ Increment
5B) ไม่รัน `test:integration`/`test:e2e` ตามสโคปที่ยังไม่ถึง Increment 7-9

**Manual Verification ผ่าน browser จริง** (สมัคร 2 user จริง, Neon จริง, ใช้ `next dev --webpack`
เพราะ Turbopack ชน OneDrive junction-point bug เดิมที่เจอตั้งแต่ M2 อีกครั้งพอดี — ยืนยันว่าไม่ใช่
บั๊กจากโค้ด Increment 6 เพราะ error เกิดตอนใช้ Turbopack ล้วนๆ ก่อนแม้แต่จะแตะหน้าใหม่): สร้าง
workspace+project→สร้าง issue "DPQ-1" ผ่าน dialog (priority HIGH, assignee ตัวเอง)→คลิกการ์ดเข้า
หน้า detail→เปลี่ยนสถานะเป็น IN_PROGRESS ทันทีไม่ต้องกด save→สร้าง label "Bug" ใหม่ (สีแดง)→แนบเข้า
issue→ลบออก (detach)→แนบกลับ→แก้ title/priority(URGENT)/assignee(unassign)ผ่าน Edit form กด
บันทึก→เห็น toast→เพิ่ม comment→แก้ไข comment ตัวเอง→ลบ comment ตัวเอง (พร้อม confirm dialog)→กลับไป
หน้า Kanban ยืนยันการ์ดย้ายไปคอลัมน์ IN_PROGRESS พร้อม title/priority/label ใหม่ถูกต้องครบ (fresh
page load ไม่ใช่ cache) → เชิญ user คนที่สอง "Member Tester" เป็น MEMBER (ไม่ใช่ ADMIN) → login
สลับเป็น Member Tester ยืนยัน: **ไม่เห็นฟอร์ม "สร้าง label ใหม่"** (ADMIN+ เท่านั้น) แต่ยังแนบ/ถอด
label ได้ (MEMBER+), แก้ไข issue ได้เต็มที่ (Decision Point G) → Member Tester คอมเมนต์ →
สลับกลับ Owner ยืนยัน: เห็นปุ่ม "ลบ" อย่างเดียวบน comment ของ Member Tester (ไม่เห็น "แก้ไข" — author
เท่านั้นแก้ได้) กดลบ (moderate) สำเร็จ — ครบทุกกฎ RBAC ของ Decision Point F/G/H

**Cleanup**: ลบ workspace ทดสอบ + user ทดสอบทั้ง 2 คนผ่านสคริปต์ชั่วคราว `_manual-cleanup.ts`
(ลบทิ้งทันทีหลังใช้ ไม่เคย commit มิเรอร์ pattern เดียวกับที่ M3 เคยทำ) ยืนยันด้วย `_check-clean.ts`
ว่าทุกตารางกลับสู่ 0 แถว (`user/workspace/project/issue/label/comment: 0`) ลบสคริปต์ทั้งสองทิ้งแล้ว
พร้อมลบ `.claude/launch.json` ที่สร้างเองระหว่าง manual verification (บทเรียนเดียวกับที่ M2 เจอ)

ยังไม่ commit/tag/push ใดๆ ตามคำสั่ง — รายงานผลแล้วหยุดตามคำสั่ง ไม่เริ่ม Increment 7

## Milestone 4 — Architecture & Code Audit (ก่อน Increment 7)

ผู้ใช้สั่งให้ทำ audit ล้วนๆ (ห้ามแก้โค้ด ห้าม commit ห้ามเริ่ม Increment 7) ทบทวนทุกอย่างที่ทำใน
Increment 1–6: schema, repository 4 ไฟล์, API route handler 15 ไฟล์, response mapper 4 ไฟล์,
zod schema 6 ไฟล์, hook 16 ไฟล์, component 11 ไฟล์ เทียบกับ pattern ที่ M2/M3 วางไว้ ยืนยันด้วย
`grep` จริงหลายจุด (ไม่ใช่แค่อ่านแล้วสรุปเอง) เช่นยืนยันว่า `prisma.` ไม่มีนอก `repositories/` เลย
ทั้ง `src/app` และ `src/features`

**สรุปผล**:

- **จุดแข็ง**: repository isolation 100% (grep ยืนยัน), response mapper เป็น single source of
  truth ทุกจุด (ไม่มี raw Prisma object หลุดไปหา client, `Comment.author` ไม่ spread ทั้งแถว), RBAC
  Decision Point F/G/H ถูก enforce ตรงกันทั้ง server และ UI (ยืนยันด้วย manual test จริงตอน
  Increment 6), transaction ของ `issueRepository.create` atomic ถูกต้อง, error handling
  (`try/catch → handleApiError`) กับ 404-not-403 enumeration-safety สม่ำเสมอทุก route ใหม่,
  naming convention คงเส้นคงวาทั้ง 6 increment
- **ปัญหาที่พบ 9 ข้อ** พร้อม severity:
  1. **[Medium]** duplicated issue-context resolution — บล็อก `issueRepository.findById →
projectRepository.findById → resolveWorkspaceMembership` (พร้อม 404 3 จุด) ถูก copy-paste
     ซ้ำใน **8 handler function** ข้าม 4 ไฟล์ (`issues/[issueId]/route.ts` ×3,
     `issues/[issueId]/labels/route.ts` ×2, `issues/[issueId]/labels/[labelId]/route.ts` ×1,
     `issues/[issueId]/comments/route.ts` ×2) — ~70 บรรทัดซ้ำ
  2. **[Medium]** label ที่ embed ใน Issue response ค้าง (stale) — `useAttachLabel`/
     `useDetachLabel` (Increment 5A) invalidate แค่ `["issue-labels", issueId]` ไม่แตะ
     `["issue", issueId]`/`["issues", projectId]` ทำให้ Kanban board (5B ฝัง label ใน
     IssueResponse) ยังโชว์ label เก่าจนกว่า staleTime 30s จะหมดหรือ reload หน้าใหม่
  3. **[Medium]** duplicated assignee-membership validation — บล็อก "เช็คว่า assigneeId เป็น
     workspace member" เหมือนกันเป๊ะซ้ำใน `POST /api/projects/[projectId]/issues` กับ
     `PATCH /api/issues/[issueId]`
  4. **[Low]** dead code — `issueRepository.findByProjectAndNumber` (เพิ่มไว้ Increment 2) ไม่มี
     route ไหนเรียกใช้เลย ตรงกับ pattern "unused scaffolding" ที่ Standing Rules เตือนไว้ (และ
     Increment 3 review เคยจับ+ลบ `countByWorkspaceAndRole` แบบเดียวกันมาก่อน)
  5. **[Low]** dead code — `useDeleteIssue` (Increment 5A) ไม่มี component ไหน import เลย (ไม่มี
     Delete Issue UI ตามสโคป Increment 6 ที่ระบุไว้)
  6. **[Low]** `DELETE /api/issues/[issueId]` เรียก `resolveWorkspaceMembership` +
     `requireWorkspaceRole` แยกกัน 2 ครั้งแทนที่จะเรียก `requireWorkspaceAccess` ตัวเดียวที่ทำงาน
     เหมือนกันเป๊ะ (ยังไม่แก้รอบนี้ — ไม่อยู่ใน scope cleanup ที่อนุมัติ)
  7. **[Low]** หน้า Issue detail's Server Component fetch issue หนึ่งครั้งแค่ validate URL nesting
     แล้วทิ้ง ให้ `IssueDetailPanel` fetch ซ้ำฝั่ง client ผ่าน `useIssue` — เป็น trade-off ที่ตั้งใจ
     (ทำตามคำสั่ง "reuse existing hooks") ไม่ใช่บั๊ก
     8-9. **[Low, cosmetic]** ป้าย "Priority"/"Assignee"/"Label" เป็นภาษาอังกฤษปนใน UI ที่ส่วนใหญ่เป็น
     ไทย (สืบทอดมาจาก M3's "Role" label ไม่ใช่ของใหม่) และ className ของ `<select>` ถูก copy-paste
     ซ้ำ ~10 จุดข้าม M3+M4 (ไม่มี shared primitive) — ทั้งคู่ไม่ใช่ปัญหาเฉพาะ M4 ไม่แก้รอบนี้

**คำแนะนำ**: extract `resolveIssueContext()`/`validateAssignee()` + แก้ cache invalidation (ข้อ
1-3) ก่อนเข้า Increment 7 (กัน test ไป bake ความซ้ำซ้อนเข้าไปด้วย) ส่วนข้อ 4-9 ปล่อยไว้ตามที่เป็น
(ข้อ 4/5 ผู้ใช้สั่งชัดว่า "ห้ามลบ reserved code ตอนนี้")

**Verdict**: ไม่มีข้อไหนเป็น correctness/security/data-integrity bug — RBAC, transaction, response
shape ถูกต้องหมด พร้อมเข้า Increment 7 ได้ทันที แต่แนะนำให้ทำ cleanup เล็กๆ ก่อน — ผู้ใช้อนุมัติ audit
และสั่งทำ cleanup ตามข้อ 1-3 ก่อนเริ่ม Increment 7

## Milestone 4 — Cleanup Pass (หลัง audit ก่อน Increment 7)

สโคปแคบมาก 3 ข้อจาก audit (Medium severity ทั้งหมด) — **ห้าม feature ใหม่ ห้าม API เปลี่ยน ห้าม UI
เปลี่ยน (เชิงพฤติกรรม) ห้ามลบ dead code ที่ intentionally reserved (ข้อ 4/5 ของ audit) รักษา
behavior เดิมทุกจุด**

### 1) Extract `resolveIssueContext(issueId, userId)`

เพิ่มใน `lib/auth/workspace-membership.ts` (บ้านเดียวกับ `resolveWorkspaceMembership`/
`requireWorkspaceAccess`/`resolveWorkspaceForRequest` อยู่แล้ว) คืน `{issue, project, membership}
| null` — null เมื่อ issue ไม่มีจริง, project ของมันหาย, หรือผู้ใช้ไม่ใช่ workspace member (เหมือน
`resolveCommentContext` ที่มีอยู่แล้วใน comments route แต่เป็น local function ไฟล์เดียว) แทนที่
บล็อก 3 ขั้นตอนที่ซ้ำใน 8 จุดของ 4 ไฟล์ (`issues/[issueId]/route.ts` GET/PATCH/DELETE,
`issues/[issueId]/labels/route.ts` GET/POST, `issues/[issueId]/labels/[labelId]/route.ts` DELETE,
`issues/[issueId]/comments/route.ts` GET/POST) ด้วยการเรียก helper ตัวเดียว — response body/status
code ของทุก 404 เหมือนเดิมทุกประการ (ยืนยันด้วย manual test: `GET /api/issues/<uuid ปลอม>` คืน
`{"error":"not_found","message":"Issue not found"}` เหมือนก่อนแก้เป๊ะ)

### 2) Extract `validateAssignee(workspaceId, assigneeId)`

เพิ่มในไฟล์เดียวกัน คืน `boolean` (`true` ทันทีถ้า `assigneeId` เป็น null/undefined — ไม่มีอะไรต้อง
validate, มิเรอร์ semantics ของ `if (data.assigneeId)` เดิม) แทนที่บล็อกซ้ำใน
`POST /api/projects/[projectId]/issues` กับ `PATCH /api/issues/[issueId]` — เก็บการสร้าง
NextResponse (`invalid_assignee`/400) ไว้ที่ route เดิม (ไม่ดึงเข้า helper) เพื่อไม่ผูก error-shape
เข้ากับ helper โดยไม่จำเป็น

### 3) แก้ cache invalidation ของ label attach/detach

`useAttachLabel`/`useDetachLabel` เพิ่ม parameter `projectId` (มิเรอร์ pattern เดียวกับ
`useUpdateIssue(issueId, projectId)`) แล้ว invalidate `["issue", issueId]` และ
`["issues", projectId]` เพิ่มจาก `["issue-labels", issueId]` เดิม — เพราะ label ถูก embed เข้า
`IssueResponse` ตั้งแต่ Increment 5B ทั้งสอง query key นี้ต้องถูก invalidate ด้วยไม่งั้น Kanban
board ค้าง thread prop `projectId` ผ่าน `IssueLabelSection` (`issue-detail-panel.tsx` มี
`projectId` อยู่แล้วในฐานะ prop เดิม ไม่ต้องเพิ่ม fetch ใหม่)

### Quality Gate

`lint` ✅ 0 error (autofix ไม่มีอะไรต้องแก้) `typecheck` ✅ 0 error `build` ✅ **route list เหมือน
เดิมทุกตัวอักษร** เทียบกับก่อน cleanup (ยืนยันว่าไม่มี API เปลี่ยน) `test` ✅ 62/62 ไม่เปลี่ยน

### Manual Verification — ยืนยัน behavior ไม่เปลี่ยนจริง

เปิดระบบจริง (`next dev --webpack`, บั๊ก OneDrive junction-point เดิมโผล่มาอีกตอนใช้ Turbopack
ธรรมดา — ใช้ workaround เดิม) สมัคร user จริง 1 คน สร้าง workspace/project/issue จริง:

- **ทดสอบจุดสำคัญที่สุด (ข้อ 3 — cache fix)**: คลิกการ์ด issue เข้าหน้า detail (client-side nav
  รักษา QueryClient เดิมข้ามหน้า), สร้าง+แนบ label ใหม่ → ยืนยันด้วย `read_network_requests` ว่า
  หลัง `POST .../labels` มี `GET /api/issues/[issueId]` ยิงตามทันที (การ invalidate `["issue",
issueId]` ที่เพิ่มใหม่ทำงานจริง) → คลิก breadcrumb กลับไปหน้า project (client-side nav อีกครั้ง
  ไม่ hard reload) → **เห็น label ใหม่บนการ์ด Kanban ทันทีโดยไม่ต้อง reload หน้า** (ก่อนแก้ต้องรอ
  staleTime 30 วิ หรือ reload) ยืนยันด้วย network log ว่า `GET .../projects/[id]/issues` ยิงซ้ำหลัง
  navigate กลับจริง (ไม่ใช่ใช้ cache เดิม)
- **ทดสอบ resolveIssueContext ผ่าน PATCH**: เปลี่ยนสถานะทันที (IssueStatusSelect) + แก้ assignee
  เป็นตัวเอง (Edit form) → `PATCH /api/issues/[issueId]` คืน 200 ทั้งคู่ (validateAssignee ผ่าน
  เพราะ assignee เป็น workspace member จริง)
- **ทดสอบ 404 enumeration-safety**: `GET /api/issues/00000000-0000-0000-0000-000000000000` (uuid
  ปลอม) คืน `{"error":"not_found","message":"Issue not found"}` — **ตรงกับ body ก่อนแก้เป๊ะทุก
  ตัวอักษร**

**ไม่ได้ทดสอบ DELETE /api/issues/[issueId] ด้วยมือ** (ไม่มี UI เรียก ตามที่ตั้งใจไว้ตั้งแต่
Increment 6) แต่ตรรกะเหมือน GET/PATCH ทุกจุด (แค่ `resolveIssueContext` + `requireWorkspaceRole`
เดิม ไม่ได้แก้อะไรเพิ่ม) มั่นใจว่าไม่กระทบจาก static review + GET/PATCH ที่ยืนยันแล้วว่า
`resolveIssueContext` ทำงานถูกต้อง

**Cleanup**: ลบ workspace/user ทดสอบผ่านสคริปต์ชั่วคราว (ลบทิ้งทันที ไม่เคย commit) ยืนยัน Neon
กลับสู่ 0 แถวทุกตาราง ลบ `.claude/launch.json` เฉพาะไฟล์ (ระวังไม่ลบทั้งโฟลเดอร์ซ้ำปัญหาเดิม — รอบ
Increment 6 เคยพลาด `rm -rf .claude` ไปครั้งหนึ่งแล้วต้อง `git checkout` กู้ `settings.local.json`
คืน รอบนี้ตรวจสอบไม่ให้เกิดซ้ำ)

ยังไม่ commit/tag/push ใดๆ ตามคำสั่ง — หยุดตามคำสั่ง ไม่เริ่ม Increment 7

## Milestone 4 — Increment 7: Tests ✅

ผู้ใช้อนุมัติ cleanup pass สั่งทำเฉพาะ Increment 7 ตามสโคป: unit/integration/repository/API/RBAC/
concurrency test ครอบคลุม Issue/Label/Comment/IssueLabel ทั้งหมด — **ห้ามเปลี่ยน architecture ห้าม
refactor โค้ดที่ไม่เกี่ยวข้อง ห้าม feature ใหม่ ห้ามแก้ UI (ยกเว้นจำเป็นจริงๆ เพื่อ accessibility —
ไม่เจอกรณีแบบนั้นเลยรอบนี้) reuse helper/pattern จาก Milestone 3 ทั้งหมด**

**Unit tests**: ไม่เพิ่มไฟล์ใหม่ — ตรวจสอบแล้วว่า schema ที่เหลือของ M4 ที่ยังไม่มีเทส
(`create-issue.schema.ts`, `create-comment.schema.ts`, `attach-label.schema.ts`,
`update-label.schema.ts`) มีแต่ constraint ธรรมดา (min/max length, uuid, hex ที่ reuse
`hexColorSchema` ซึ่งเทสไว้แล้ว) ตรงกับ pattern เดิมของ M3 ที่ไม่เคยเขียนเทสแยกให้
`create-project.schema.ts`/`update-project.schema.ts`/`update-workspace.schema.ts`/
`update-member-role.schema.ts` เลยเช่นกัน (มีแต่ schema ที่มี logic จริง เช่น slug regex หรือ
role-escalation check ถึงจะได้เทสแยก) — 62 unit test เดิม (`issue-key.test.ts` ×6,
`create-label.schema.test.ts` ×6, `update-issue.schema.test.ts` ×8 จาก Increment 1-2 + ของเดิม
42 จาก M2/M3) ถือว่าครอบคลุม unit-level logic ของ M4 ครบแล้วตาม bar เดียวกับที่ M2/M3 ใช้

**Integration tests — ไฟล์ใหม่ 4 ไฟล์ (55 test ใหม่)**, ทุกไฟล์มิเรอร์ pattern ของ M3 เป๊ะ
(`vi.mock("@/lib/auth/auth")`, `sessionFor`/`uniqueEmail`/`uniqueSlug`/`deleteTestWorkspace`/
`deleteTestUser` จาก `./helpers` เดิม ไม่แก้ไฟล์นั้นเลย, `jsonRequest`/`*Ctx` helper local ต่อไฟล์
ตาม convention เดิม, ลำดับ cleanup `workspaceIds` ก่อน `emails` เสมอเพราะ `Issue.reporter`/
`Comment.author` เป็น `onDelete: Restrict`):

- `tests/integration/issue.integration.test.ts` (15 test) — Issue CRUD ครบ (POST/GET
  list, GET/PATCH/DELETE detail), RBAC (MEMBER+ สร้าง/แก้ได้แม้ไม่ใช่ reporter/assignee ตาม
  Decision Point G, ADMIN+ เท่านั้นลบได้), invalid_assignee ทั้งตอนสร้างและ reassign (ยืนยันด้วยว่า
  assignee ไม่ถูกเปลี่ยนจริงใน DB เมื่อ reject), แยกกรณี "ไม่ส่ง assigneeId" (ไม่แตะ) กับ
  "`assigneeId: null`" (ยกเลิกมอบหมายจริง) ที่ระดับ integration ไม่ใช่แค่ schema — บวก **describe
  block แยกสำหรับ concurrency test** ("Concurrent issue creation (atomic numbering)"): เรียก
  `issueRepository.create()` ตรงๆ (repository-level, ไม่ผ่าน route) พร้อมกัน 10 ครั้งด้วย
  `Promise.all`, ยืนยันว่า `number` ที่ได้ไม่ซ้ำกันเลยสักตัว (`Set` size = 10) และเรียงต่อเนื่อง
  1-10 ไม่มีช่องว่าง พร้อมยืนยัน `Project.issueCounter` สุดท้ายตรงกับจำนวนจริง — พิสูจน์ atomicity
  ของ `$transaction` ที่ `issueRepository.create` ใช้ (Milestone 4 Increment 2's ประกัน "Postgres's
  row-level UPDATE x = x + 1 is atomic") ตรงตามที่ผู้ใช้สั่งให้มี concurrency test สำหรับ issue
  numbering โดยเฉพาะ
- `tests/integration/label.integration.test.ts` (14 test) — workspace Label CRUD (ADMIN+
  สร้าง/แก้/ลบ, ทุก MEMBER อ่านได้ตาม Decision Point F), name_taken 409 ทั้งตอนสร้างและ rename,
  invalid hex color 400, cross-workspace tampering guard ทั้ง PATCH/DELETE (มิเรอร์
  `workspace-member.integration.test.ts`'s memberId guard เป๊ะ)
- `tests/integration/issue-label.integration.test.ts` (9 test) — attach/detach (ทุก MEMBER+
  ทำได้ตาม Decision Point F ต่างจากการสร้าง label definition), already_attached 409, label จาก
  workspace อื่น 404 (enumeration-safe เหมือน label ไม่มีอยู่จริง), detach ของที่ไม่เคยแนบ 404
- `tests/integration/comment.integration.test.ts` (11 test) — Comment CRUD, เรียงลำดับ
  oldest-first ยืนยันจริง (ไม่ใช่แค่เชื่อ comment ว่าเรียงถูก), แก้ได้เฉพาะ author (ADMIN+ ก็แก้
  ของคนอื่นไม่ได้), ลบได้ทั้ง author หรือ ADMIN+ แต่ MEMBER ธรรมดาที่ไม่ใช่ author ลบไม่ได้
  (Decision Point H ครบทั้ง 2 แกน)

**แก้ไฟล์เดิม 2 ไฟล์ (เพิ่ม test ไม่แตะ logic เดิม)**:

- `tests/integration/project.integration.test.ts` — เพิ่ม 2 test: ยืนยัน `deriveIssueKey`
  ทำงานถูกต้องผ่าน route จริง ("Design System" → key `"DS"`), และยืนยัน `key_taken` 409 เมื่อชื่อ
  ต่างกันแต่ derive คีย์ซ้ำกัน ("Design System" vs "Data Store" ทั้งคู่ได้ "DS") — gap ที่ audit
  ไม่ได้ระบุตรงๆ แต่ผู้ใช้สั่งชัดใน scope Increment 7 ("verify duplicate project key... behavior")
- `tests/integration/workspace-isolation.integration.test.ts` — ขยาย `setupTwoWorkspaces()`
  ให้สร้าง issue+label ใน workspace B ด้วย (ผ่าน `issueRepository`/`labelRepository` ตรงๆ) เพิ่ม
  4 test ใหม่: สมาชิก workspace A ได้ 404 ทั้งดึง issue ของ B ตรงๆ, ดึง label ของ issue นั้น, ดึง
  comment ของ issue นั้น, และดึง label list ทั้ง workspace ของ B — ครบทุก resource ใหม่ของ M4 ใน
  isolation suite เดียวกับที่ M3 วางไว้ (ไม่สร้างไฟล์ isolation แยกใหม่)

**ไม่แตะ**: `tests/integration/helpers.ts` (helper เดิมพอสำหรับทุกไฟล์ใหม่ ไม่ต้องเพิ่ม), e2e
(Playwright — ไม่อยู่ใน scope ที่สั่งของ Increment 7 นี้เลย)

**Quality Gate**: `lint` ✅ 0 error `typecheck` ✅ 0 error `build` ✅ (route list เหมือนเดิมทุก
ตัวอักษร — ไม่มี API เปลี่ยน) `test` (unit) ✅ 62/62 ไม่เปลี่ยน `test:integration` ✅ **125/125**
(70 เดิม + 55 ใหม่) ยืนยัน Neon กลับสู่ 0 แถวทุกตารางหลังรันครบ (`user/workspace/project/issue/
label/comment: 0`)

ยังไม่ commit/tag/push ใดๆ ตามคำสั่ง — หยุดตามคำสั่ง ไม่เริ่ม Increment 8

## Milestone 4 — Increment 8: Playwright E2E ✅

ผู้ใช้อนุมัติ Increment 7 สั่งทำเฉพาะ Increment 8 ตามสโคป: e2e เต็ม user workflow ครอบ
scenario ที่ระบุไว้ทั้งหมด reuse helper/pattern จาก M3 ทั้งหมด **ห้ามแก้ production code เว้นแต่
เจอบั๊กจริง ห้าม refactor โค้ดที่ไม่เกี่ยวข้อง ห้าม feature ใหม่**

**ไฟล์ใหม่ 2 ไฟล์** ใน `tests/e2e/`, ทั้งคู่ reuse `registerViaUi`(`actions.ts`) และ
`deleteTestUser`/`deleteTestWorkspace`/`uniqueEmail`/`uniqueSlug`(`db-helpers.ts`) เดิมทั้งหมด
ไม่แก้ไฟล์เหล่านั้นเลย:

- `tests/e2e/issue-flow.spec.ts` — session เดียวต่อเนื่อง (มิเรอร์ `project-flow.spec.ts`)
  ครอบ: สร้าง workspace→project→issue (dialog)→เปิดหน้า detail→เปลี่ยนสถานะทันที (ยืนยันคงอยู่
  หลัง reload และหลังกลับไป board)→แก้ไข title/priority→สร้าง label ใหม่จากหน้า detail→แนบ→ถอด→
  comment CRUD ครบ (สร้าง/แก้/ลบ)→**ลบ issue** ผ่าน `page.request.delete()` ตรงไปที่
  `DELETE /api/issues/[issueId]` (ไม่มี Delete Issue UI จริงในแอป — audit ข้อ 5 ยืนยันแล้วว่า
  `useDeleteIssue` ยังไม่ถูกใช้ที่ไหนและไม่ได้อยู่ใน scope Increment 6 — ยิง request ตรงผ่าน
  browser context ที่ login อยู่แล้ว แทนที่จะสร้างปุ่มใหม่ซึ่งจะเป็นการเพิ่ม feature นอกสโคป) แล้ว
  ยืนยันทั้งหน้า detail 404 และ board ไม่แสดง issue นั้นอีก
- `tests/e2e/issue-permissions.spec.ts` — 3 browser context พร้อมกัน (owner/member/outsider,
  มิเรอร์ pattern `member-management.spec.ts`) ครอบ: เชิญ member, member แก้ไข issue ได้ทั้งที่
  ไม่ใช่ reporter/assignee (Decision Point G), member ไม่เห็นฟอร์มสร้าง label แต่แนบ label ที่มี
  อยู่แล้วได้ (Decision Point F), member เห็น comment ของ owner แต่ไม่มีปุ่มแก้ไข/ลบ (ไม่ใช่ author
  ไม่ใช่ ADMIN+) ในขณะที่ comment ของตัวเองแก้ไข/ลบได้เต็มที่, owner (ADMIN+) moderate-ลบ comment
  ของ member ได้ (Decision Point H ครบทั้ง 2 แกน), member เรียก `DELETE /api/issues/[id]` เอง
  ผ่าน API ตรงได้ 403 (RBAC verification จริง ไม่ใช่แค่ UI ซ่อนปุ่ม), outsider ที่มี workspace
  แยกต่างหากของตัวเอง (ไม่ใช่แค่ user ที่ไม่เคย login) เปิด URL ของ issue นี้ตรงๆ ได้ 404
  (cross-workspace access — มิเรอร์ pattern การสร้าง "คนละ workspace จริง" จาก
  `tests/integration/workspace-isolation.integration.test.ts`)

**บั๊กที่พบระหว่างทำ — เป็นบั๊กใน test ที่เขียนเอง ไม่ใช่ production code**: setup test ทั้งสองไฟล์
ใช้ regex `/w/{slug}/projects/[^/]+$` เช็ค URL หลังกด "สร้างโปรเจกต์" — เป็น pattern เดียวกับที่
`project-flow.spec.ts` ใช้อยู่แล้วและผ่านมาตลอด แต่ `[^/]+` ก็ matched คำว่า **"new"** ได้พอดี
(URL ก่อน submit คือ `/projects/new`) ทำให้ assertion อาจ resolve true จาก URL เดิมก่อน
client-side redirect (`router.push`) จะทำงานจริงเสร็จ — `project-flow.spec.ts` ไม่เคยเจอปัญหานี้
เพราะไม่เคยเก็บ `page.url()` ไปใช้ต่อ แต่ `issue-flow.spec.ts` เก็บไว้ในตัวแปร `projectUrl` เพื่อ
กลับมาใช้ทีหลัง เจอ URL ผิด (`/projects/new`) หลุดเข้ามา ทำให้ test ปลายทาง
("the issue is still visible on the Kanban board after navigating back") หา element ไม่เจอ
(หน้าจริงที่ไปถึงคือหน้า "สร้างโปรเจกต์ใหม่" ไม่ใช่หน้า project) **แก้โดยเปลี่ยน regex ให้ match
เฉพาะรูปแบบ UUID** (`[0-9a-f-]{36}$`) ซึ่งไม่มีทาง match คำว่า "new" ได้ พร้อมเพิ่มการรอ heading
ของ project ก่อนอ่าน `page.url()` แก้ทั้ง 2 ไฟล์ที่มี pattern เดียวกัน (ไม่แก้ `project-flow.spec.ts`
เพราะไม่ได้อยู่ใน scope ของ Increment นี้และไม่เคยแสดงอาการจริง — รายงานเป็นความเสี่ยงแฝงไว้ในหัวข้อ
technical debt แทน)

**ยืนยันด้วย production build ตามบทเรียนจาก M2/M3**: รันรอบแรกผ่าน `pnpm dev` (Turbopack) เจอ 3
test fail (1 ของตัวเอง + 2 ของเดิมจาก M3 คือ `project-flow.spec.ts`'s "ON_HOLD" กับ
`issue-permissions.spec.ts`'s setup) — ตรงกับ pattern OneDrive+Turbopack concurrent-load
flakiness ที่บันทึกไว้ตั้งแต่ M2/M3 เป๊ะ สลับไปรันกับ **production build** (`pnpm build && pnpm
start`, ปล่อยให้ Playwright's `reuseExistingServer` ใช้ server ที่รันอยู่แทนที่จะ spawn `pnpm dev`
เอง — ไม่แก้ `playwright.config.ts` เลย) ทั้งสองบั๊ก M3 หายไปทันที (ยืนยันว่าเป็น dev-server
artifact ไม่ใช่บั๊กจริง) เหลือแค่บั๊ก regex ของตัวเองที่ยัง fail ซ้ำ (deterministic ไม่ใช่ flaky —
เป็นสัญญาณว่าเป็นบั๊กจริงไม่ใช่ timing) แก้ตามที่อธิบายข้างต้นแล้วรันซ้ำ **ผ่าน 59/59 สองรอบติดกัน**

**Quality Gate**: `lint` ✅ 0 error `typecheck` ✅ 0 error `build` ✅ (route list เหมือนเดิมทุก
ตัวอักษร — ไม่มี production code เปลี่ยนเลยนอกจาก 2 ไฟล์ test) `test` (unit) ✅ 62/62 `test:e2e`
✅ **59/59 × 2 รอบติดกัน** (production build) ยืนยัน Neon กลับสู่ 0 แถวทุกตารางหลังรันครบ
(`user/workspace/project/issue/label/comment: 0`)

ยังไม่ commit/tag/push ใดๆ ตามคำสั่ง — หยุดตามคำสั่ง ไม่เริ่ม Increment 9

## Milestone 4 — สรุปความคืบหน้าโดยย่อ (อ่านเร็วๆ ไม่ต้องไล่ทุก increment ด้านบน)

| Increment | เนื้อหา                                                                         | ไฟล์หลักที่เพิ่ม/แก้                                                                                                                                                                                                                          | สถานะ                           |
| --------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Planning  | Architecture proposal + Decision Points A–H                                     | (ไม่มีโค้ด)                                                                                                                                                                                                                                   | ✅ อนุมัติแล้ว                  |
| 1         | Schema + migration                                                              | `schema.prisma`, migration, `issue-key.ts`                                                                                                                                                                                                    | ✅ อนุมัติแล้ว                  |
| 2         | Repository + zod schema + response mapper                                       | `repositories/issue/*`, `features/issue/schemas/*`, `*-response.ts`                                                                                                                                                                           | ✅ อนุมัติแล้ว                  |
| 3         | Issue API (5 endpoint)                                                          | `api/projects/[id]/issues`, `api/issues/[id]`                                                                                                                                                                                                 | ✅ อนุมัติแล้ว                  |
| 4         | Label API + Comment API + `IssueLabel` repo (10 endpoint)                       | `api/workspaces/[id]/labels/*`, `api/issues/[id]/labels/*`, `api/issues/[id]/comments`, `api/comments/[id]`                                                                                                                                   | ✅ อนุมัติแล้ว                  |
| 5A        | TanStack Query hooks (16 ไฟล์)                                                  | `features/issue/hooks/*`                                                                                                                                                                                                                      | ✅ อนุมัติแล้ว                  |
| 5B        | Kanban board (shell/column/card) + embed labels ใน Issue response               | `features/issue/components/*`, `constants/issue.ts`, mount บน project detail page เดิม                                                                                                                                                        | ✅ อนุมัติแล้ว                  |
| 6         | Create/Edit/Status/Label/Comment UI + Issue detail page                         | `features/issue/components/{create-issue-dialog,edit-issue-form,issue-status-select,issue-label-section,comment-section,issue-detail-panel}.tsx`, `app/w/[slug]/projects/[projectId]/issues/[issueId]/page.tsx`, `components/ui/textarea.tsx` | ✅ อนุมัติแล้ว                  |
| Audit     | Architecture & code audit (read-only, 9 findings)                               | (ไม่มีโค้ด)                                                                                                                                                                                                                                   | ✅ อนุมัติแล้ว                  |
| Cleanup   | Extract `resolveIssueContext`/`validateAssignee` + fix label cache invalidation | `lib/auth/workspace-membership.ts`, 5 route files, `use-attach-label.ts`/`use-detach-label.ts`, `issue-label-section.tsx`/`issue-detail-panel.tsx`                                                                                            | ✅ อนุมัติแล้ว                  |
| 7         | Unit/Integration/Repository/API/RBAC/Concurrency tests (55 test ใหม่)           | `tests/integration/{issue,label,issue-label,comment}.integration.test.ts` (ใหม่), `project.integration.test.ts`/`workspace-isolation.integration.test.ts` (แก้)                                                                               | ✅ อนุมัติแล้ว                  |
| 8         | Playwright e2e (2 ไฟล์ใหม่, 59/59 ผ่าน ×2 รอบ)                                  | `tests/e2e/{issue-flow,issue-permissions}.spec.ts`                                                                                                                                                                                            | ✅ อนุมัติแล้ว                  |
| 9         | Docs (architecture.md/folder-structure.md/README.md/development-guide.md)       | (ไม่มีโค้ด production)                                                                                                                                                                                                                        | ✅ อนุมัติแล้ว — รอ final audit |

**Route ที่มีจริงตอนนี้** (จาก `pnpm build` ล่าสุด, ไม่เปลี่ยนจาก Increment 4 — ทั้ง Increment 6
และ cleanup pass ไม่เพิ่ม/ลบ API endpoint เลย): `GET/POST /api/projects/[projectId]/issues`,
`GET/PATCH/DELETE /api/issues/[issueId]`, `GET/POST /api/issues/[issueId]/labels`,
`DELETE /api/issues/[issueId]/labels/[labelId]`, `GET/POST /api/issues/[issueId]/comments`,
`PATCH/DELETE /api/comments/[commentId]`, `GET/POST /api/workspaces/[workspaceId]/labels`,
`PATCH/DELETE /api/workspaces/[workspaceId]/labels/[labelId]`

**UI ที่มีจริงตอนนี้**: Kanban board (คลิกการ์ดเข้าหน้า issue detail ได้แล้ว) + ปุ่ม "Issue ใหม่"
เปิด dialog สร้าง issue บนหน้า project detail + หน้า issue detail เต็มรูปแบบ (status instant-apply,
แก้ไข title/description/priority/assignee, แนบ/ถอด/สร้าง label, comment CRUD) — ครบทุก UI ของ
Milestone 4 ตามแผนเดิมแล้ว

**Test coverage ตอนนี้**: unit 62 + integration 125 + e2e 59 (ครบ Issue/Label/Comment/
IssueLabel API, RBAC, workspace isolation, invalid assignee, duplicate project key, concurrency
ของ issue numbering ที่ระดับ integration และครบ full user workflow จริงผ่าน browser ที่ระดับ e2e)

## Milestone 4 — Increment 9: Documentation ✅

ผู้ใช้อนุมัติ Increment 8 สั่งทำเฉพาะ Increment 9 ตามสโคป: อัปเดต `architecture.md`,
`folder-structure.md`, `README.md` (ตามความจำเป็น), `development-guide.md` (ถ้าจำเป็น),
`coding-standards.md` (เฉพาะถ้าล้าสมัยจริง), `session-log.md` (ไฟล์นี้) — **ห้ามแก้โค้อด production
ยกเว้นจำเป็นจริงเพื่อแก้ความไม่ตรงกันของเอกสาร ห้าม feature ใหม่ ห้าม refactor โค้ดที่ไม่เกี่ยวข้อง
ห้ามแก้ test ใดๆ ห้ามเปลี่ยน production behavior**

**วิธีทำ**: อ่านโค้ดจริงทั้งหมดของ M4 ก่อนเขียนเอกสาร (ไม่ใช้ความจำ) — `prisma/schema.prisma`,
`repositories/issue/*.ts` ทั้ง 4 ไฟล์, `lib/auth/workspace-membership.ts`
(`resolveIssueContext`/`validateAssignee`), route handler ตัวอย่างจากทุก resource
(`issues/[issueId]/route.ts`, `projects/[projectId]/issues/route.ts`,
`issues/[issueId]/labels/route.ts`, `comments/[commentId]/route.ts`,
`workspaces/[workspaceId]/labels/route.ts`), `features/issue/issue-response.ts`,
`constants/issue.ts`, `lib/issue-key.ts` พร้อมยืนยันด้วย `find`/`Glob` ตรงว่าทุกไฟล์/route/folder
ที่จะเขียนถึงมีอยู่จริง (ไม่ใช่เขียนจากที่จำได้จาก session-log เดิมเฉยๆ)

**`docs/architecture.md`**: เพิ่มหัวข้อใหม่ "Issue tracking core (Milestone 4)" ครอบ Decision
Point ทั้ง 8 ข้อที่ implement จริง (`Project.key`/`deriveIssueKey`/unique ทั้ง workspace,
atomic `issueCounter` ผ่าน `$transaction`, `Issue.position` เป็น `Float` เผื่อ drag-and-drop
ในอนาคต, label workspace-scoped, MEMBER+ แก้ issue ได้ทุกคน, comment moderation,
`validateAssignee`/`resolveIssueContext` ที่ไม่มี FK ให้พึ่ง, label embed ใน Kanban response)
แก้ "Current state" ท้ายไฟล์จาก "M2+M3" เป็น "M2+M3+M4" และลบ "task/issue tracking" ออกจาก
รายการ "ยังไม่สร้าง" (ของจริงตอนนี้คือ AI copilot/GitHub integration/drag-and-drop/activity feed)

**`docs/folder-structure.md`**: เพิ่ม 4 หัวข้อใหม่ — `features/issue/` (schema/hook/component
ครบตามที่มีจริง, เปรียบเทียบกับ `features/project/` ที่ไม่มี cache invalidation),
`repositories/issue/` (รวม `issue-label.repository.ts` ที่ตั้งใจสร้างทีหลังใน Increment 4),
`constants/` (การใช้งานจริงครั้งแรกของโฟลเดอร์ที่จองไว้ตั้งแต่ Foundation),
`components/ui/textarea.tsx` (เหตุผลที่เขียนเองไม่ใช้ `shadcn add`) แก้รายการหน้าใต้
`app/w/[slug]/` ให้รวม `projects/[projectId]/issues/[issueId]/page.tsx` ที่ขาดไปก่อนหน้านี้

**`README.md`**: แก้ "Status" ที่ค้างอยู่ที่ "Milestone 2 complete" มาตั้งแต่หลัง M3 commit (ปัญหาที่
บันทึกไว้แล้วใน "Next Steps" ของรายงานก่อนหน้า) เป็นสถานะจริงตอนนี้ (M2/M3 ขึ้น GitHub แล้ว, M4
code-complete รอ final review/commit) เพิ่มหัวข้อ "Features" สรุป 3 milestone แบบผู้ใช้อ่านเร็วๆ ได้

**`docs/development-guide.md`**: เพิ่มหัวข้อ "Testing structure" ใหม่ทั้งหมด (ไม่เคยมีมาก่อนตั้งแต่
M2 ทั้งที่มี unit/integration/e2e จริงมาตลอด) อธิบาย unit/integration/e2e แต่ละชั้นทำหน้าที่อะไร,
pattern การ extend ไฟล์เดิมแทนสร้างใหม่, และคำเตือนเรื่อง Turbopack dev-server flakiness
(รัน production build ก่อนสรุปว่าเป็นบั๊กจริง) — เป็น gap เอกสารที่มีมาตั้งแต่ M2 ไม่ใช่ของ M4 โดยตรง
แต่ M4's Increment 7/8 ทำให้เห็นชัดว่าไม่เคยมีที่ไหนอธิบาย testing convention ไว้เป็นทางการเลย

**`docs/coding-standards.md`**: ตรวจแล้วไม่พบความไม่ตรงกัน (ตัวอย่าง commit message
`feat(issues): ...` ยังใช้ได้จริงพอดี, ไม่มีข้อความอ้างอิง milestone ใดที่ผิดจากปัจจุบัน) — **ไม่แก้**

**สิ่งที่ตั้งใจไม่แตะ (นอกสโคปที่สั่งชัดเจน)**: `CHANGELOG.md` (ไม่อยู่ในรายการไฟล์ที่สั่งให้แก้ —
ยังค้างที่ `[0.2.0]` ตั้งแต่หลัง M3 commit ตามที่เคยรายงานไว้แล้ว), `docs/setup-guide.md` (พบว่า
ตาราง "Common commands" ขาด `pnpm test:integration` ไปเลย — เป็น gap ตั้งแต่ M2 ไม่ใช่ของ M4 และ
ไม่อยู่ในรายการไฟล์ที่สั่ง — รายงานเป็น documentation debt แทนที่จะแก้เอง), `docs/auth-flow.md`/
`docs/security.md` (ไม่เกี่ยวกับ M4 เลย ไม่แตะ)

**ไม่แก้ production code เลยแม้แต่บรรทัดเดียว** — ตรวจสอบแล้วไม่พบความไม่ตรงกันระหว่างเอกสารกับโค้ด
ที่ต้องใช้ trivial fix ใดๆ (พฤติกรรมจริงตรงกับที่ audit/increment ก่อนหน้ารายงานไว้ทุกจุด)

**Validation ที่ทำก่อนเขียนเอกสาร**:

- ยืนยัน route ทุกเส้นทางที่จะเขียนถึงมีไฟล์จริง (`find`/`Glob` บน `src/app/api/issues`,
  `src/app/api/comments`, `src/app/api/workspaces/[workspaceId]/labels`,
  `src/app/api/projects/[projectId]/issues`, `src/app/w/[slug]/**`) — ครบทุกเส้นทางตรงตามที่
  session-log เดิมบันทึกไว้ ไม่มีตกหล่น/ไม่มีของที่เขียนถึงแต่ไม่มีจริง
- ยืนยันโฟลเดอร์ `repositories/issue/`, `features/issue/`, `constants/` มีไฟล์ตรงตามที่จะเขียนถึง
- ยืนยัน `tests/integration/` และ `tests/e2e/` มีไฟล์ M4 ทั้งหมดที่ Increment 7/8 รายงานไว้จริง
  (`issue`/`label`/`issue-label`/`comment.integration.test.ts`, `issue-flow`/
  `issue-permissions.spec.ts`)
- ไม่พบ reference ที่ล้าสมัยจาก Milestone 3 ในเอกสารที่แก้ (ตรวจ `architecture.md`/
  `folder-structure.md` ทั้งไฟล์ก่อนแก้ — ของเดิมเขียนถูกต้องตามยุคของมัน แค่ขาดหัวข้อ M4 เพิ่มเข้ามา
  ไม่มีข้อความผิดที่ต้องลบ)

**Quality Gate**: `lint` ✅ 0 error `typecheck` ✅ 0 error `build` ✅ (ไม่มีไฟล์ production
เปลี่ยนเลย — แก้แค่ `.md` 4 ไฟล์: `architecture.md`/`folder-structure.md`/`README.md`/
`development-guide.md`) `test` (unit) ✅ 62/62 ไม่เปลี่ยน — ไม่รัน `test:integration`/`test:e2e`
ซ้ำรอบนี้ (ไม่มีอะไรเปลี่ยนที่จะกระทบผลลัพธ์ ตามคำสั่ง "ห้ามแก้ test ใดๆ")

ยังไม่ commit/tag/push ใดๆ ตามคำสั่ง — **ยังไม่ทำ final audit** ตามคำสั่ง หยุดหลัง Increment 9
รอคำสั่งก่อนเริ่ม final completion audit + commit + tag `v0.4.0` + push

## Next Steps (เมื่อได้รับอนุมัติ)

1. **Increment 9 (docs) เสร็จแล้ว** ✅ — รอคำสั่งเริ่ม **final completion audit** ของ Milestone 4
   ทั้งก้อน (เทียบ Architecture Proposal เดิม + Decision Point A-H กับโค้ดจริงทีละหัวข้อ แบบเดียวกับ
   Milestone 3 Completion Review ที่เคยทำก่อน commit `v0.3.0`) ก่อน commit+tag+push
2. เมื่อ final audit ผ่าน → commit+tag (`v0.4.0`)+push (ห้าม commit ก่อนได้รับคำสั่งชัดเจน)
3. **Documentation debt ที่เจอระหว่าง Increment 9 แต่นอกสโคปที่สั่ง ไม่ได้แก้**:
   `docs/setup-guide.md`'s ตาราง "Common commands" ขาด `pnpm test:integration` มาตั้งแต่ M2
   (ไม่ใช่ปัญหาของ M4 แต่ยังไม่เคยแก้)
4. (นอกขอบเขต — พิจารณาแยกทีหลัง) `CHANGELOG.md` ยังไม่อัปเดตหลัง M3 commit (ค้างที่ `[0.2.0]`),
   ThemeToggle hydration mismatch (M2), tag `v0.1.0` ยังไม่ push, ชื่อโปรเจกต์ "Orbit" vs
   "TeamFlow", ownership-transfer action, TOCTOU race บน uniqueness check, project detail page
   container กว้างไม่พอสำหรับ Kanban บนจอใหญ่, ยังไม่มี mobile list-view สำหรับ board ตาม Phase 3
   UI/UX doc, ยังไม่มี Delete Issue UI (`useDeleteIssue` hook จาก 5A ยังไม่ถูกใช้ที่ไหนเลย —
   audit ข้อ 5, ตั้งใจไม่ลบตามคำสั่ง), `issueRepository.findByProjectAndNumber` ไม่มีใครเรียก
   (audit ข้อ 4, ตั้งใจไม่ลบตามคำสั่ง), `DELETE /api/issues/[issueId]` ยังไม่เปลี่ยนไปใช้
   `requireWorkspaceAccess` ตัวเดียว (audit ข้อ 6, low severity ไม่อยู่ใน scope cleanup รอบนี้),
   `<select>` styling ซ้ำข้าม M3+M4 ยังไม่มี shared primitive (audit ข้อ 9),
   `project-flow.spec.ts`'s `/projects/[^/]+$` regex มีความเสี่ยงแฝงแบบเดียวกับที่เจอใน
   Increment 8 (match คำว่า "new" ได้ด้วย) แต่ยังไม่เคยแสดงอาการจริงและไม่ได้แก้ตามสโคป — ควรพิจารณา
   แก้พร้อมกันถ้ามีโอกาสแตะไฟล์นั้นอีกในอนาคต
