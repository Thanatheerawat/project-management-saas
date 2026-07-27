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

**สถานะตอนนี้ (ล่าสุด)**: Foundation (v0.1.0) commit+tag แล้ว (`73f6e4a`) Milestone 2
(Identity & Access Management) **เสร็จสมบูรณ์ 100%** — migrate บน Neon จริงสำเร็จ, integration
test (29 test), Playwright e2e test (11 test), manual verification ครบ 10 flow, security/DB/
cleanup validation ผ่านหมด, quality gate เขียวทั้ง 8 ข้อ — รายละเอียดทั้งหมดอยู่ในหัวข้อ
"Milestone 2 — Database Migration & Test Suites" และ "Milestone 2 — Manual Verification"
ด้านล่าง กำลังรอการอนุมัติ commit/tag เป็น `v0.2.0`

**ถ้าจะทำงานต่อ**: เช็ค `git status`/`git log` จริงก่อนเชื่อไฟล์นี้ทั้งหมดเสมอ — ถ้า `v0.2.0`
ถูก tag ไปแล้ว Milestone 2 ปิดแล้ว ให้เริ่ม Milestone 3 (Workspace) ตามแผนเดิมได้เลย โดยยังต้อง
อธิบายแผน+เหตุผล+โครงสร้างก่อนเขียนโค้ดเสมอตามกติกาเดิม

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

## Next Steps (เมื่อได้รับอนุมัติ)

Milestone 2 เสร็จสมบูรณ์ 100% ตามขอบเขตที่อนุมัติ ไม่มีสิ่งใดค้างทางเทคนิค

1. Repository audit (secret scan, ไฟล์ที่ไม่ควรอยู่ใน repo, docs sync) ก่อน commit
2. Commit เป็น milestone เดียว + tag `v0.2.0` (รอคำสั่งอนุมัติ)
3. Push branch + tag ไป remote (รอคำสั่งอนุมัติ)
4. เริ่ม Milestone 3 (Workspace) — ต้องอธิบายแผน+เหตุผล+โครงสร้างก่อนเขียนโค้ดเสมอตามกติกาเดิม
5. (นอกขอบเขต Milestone 2 — พิจารณาแยกทีหลัง) ThemeToggle hydration mismatch ที่พบระหว่าง manual
   verification
