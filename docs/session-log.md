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

**สถานะตอนนี้ (ล่าสุด)**: Foundation (v0.1.0) และ Milestone 2 (v0.2.0, commit `1e9393b`)
commit+tag+push ขึ้น GitHub สำเร็จแล้ว (`https://github.com/Thanatheerawat/project-management-saas`,
branch `main`) — ปิด Milestone 2 สมบูรณ์ 100% **Milestone 3 (Workspace & Project Management
Core) เขียนโค้ดเสร็จครบตาม Architecture Proposal แล้ว** ทั้ง 9 ส่วน (Schema+Migration,
Repositories+RBAC+Schemas, API, Middleware, Workspace/Settings/Members/Projects UI ครบ,
Unit+Integration+E2E test ครบ, Docs อัปเดตแล้ว) ผ่าน Quality Gate ทุกข้อ (ดูหัวข้อ "Milestone 3
Final Quality Gate") — **ยังไม่ commit ใดๆ เลย** รอการอนุมัติ Final Review Report ก่อน
commit+tag `v0.3.0`+push

**ถ้าจะทำงานต่อ**: เช็ค `git status`/`git log` จริงก่อนเชื่อไฟล์นี้ทั้งหมดเสมอ — ขั้นต่อไปคือรอคำสั่ง
อนุมัติให้ทำ audit+commit+tag+push (หัวข้อ "Next Steps" ท้ายไฟล์)

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
  ใหม่) Role select ใช้ native `<select>` ธรรมดา (ไม่เพิ่ม UI primitive ใหม่) ปุ่มลบมี confirm ผ่าน
  `Dialog` เดิมจาก `components/ui/dialog.tsx` OWNER row ล็อกเสมอ (badge อย่างเดียว ไม่มี select/ปุ่ม
  ลบ) ไม่ว่าคนดูจะมี role อะไร ตรงกับ API ที่บล็อกแก้ role=OWNER เสมอ

### 3) Project UI

`app/w/[slug]/projects/{page,new/page}.tsx` (list — SSR ผ่าน `projectRepository` ตรง เหมือน
dashboard shell เดิม, create — client form) + `app/w/[slug]/projects/[projectId]/{page,edit/page}.tsx`
(detail — SSR + verify `project.workspaceId === workspace.id` ก่อนเสมอ กัน cross-workspace
mismatch ผ่าน URL, edit — client form พร้อม status dropdown) Export `PROJECT_STATUSES` จาก
`update-project.schema.ts` (เดิม private) ให้ UI reuse literal list เดียวกับ validation อัปเดต
`app/w/[slug]/page.tsx` (dashboard shell) ให้การ์ด project คลิกเข้า detail ได้ (เดิม comment บอกไว้
ว่า "ยังไม่มีหน้า detail" — ตอนนี้มีแล้ว) อัปเดต `WorkspaceSidebar` เพิ่ม nav item โปรเจกต์/สมาชิก/
ตั้งค่า (เดิม comment บอกไว้ว่า "เพิ่มทีหลังตอนมีหน้า" — ตอนนี้มีแล้วเช่นกัน)

**ยืนยันทั้ง 3 ส่วนด้วย browser จริง** (สมัคร user จริง 2 คน, สร้าง workspace/project จริง, ทดสอบ
add/promote/remove member, edit workspace settings, edit project status) ผ่านครบทุก flow ก่อน
เขียน automated test

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

## Next Steps (เมื่อได้รับอนุมัติ)

1. รอการอนุมัติ Final Milestone 3 Review Report
2. เมื่ออนุมัติ → audit+commit+tag (`v0.3.0`)+push ตาม pattern เดียวกับ M2 (ห้าม commit ก่อนได้รับ
   คำสั่งชัดเจน)
3. (นอกขอบเขต — พิจารณาแยกทีหลัง) ThemeToggle hydration mismatch ที่พบระหว่าง M2 manual
   verification, push tag `v0.1.0` ขึ้น GitHub ถ้าต้องการ, ชื่อโปรเจกต์ "Orbit" vs "TeamFlow",
   ownership-transfer action (ยังไม่ implement ตามที่ proposal ระบุไว้แต่แรก), TOCTOU race บน
   uniqueness check (risk ที่รับรู้แล้วตั้งแต่ Increment 3 review ไม่แก้เพราะต้อง consistent กับ M2)
