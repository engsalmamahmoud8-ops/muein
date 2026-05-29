# Yemnak (يمناك) — Build Plan

## Stack adjustment (important)
Your spec asks for **Next.js + Netlify**. Lovable projects run on **TanStack Start (React 19 + Vite) + Cloudflare Workers**, with **Lovable Cloud** (Supabase under the hood) as the backend. I'll keep every functional and architectural requirement from your spec — only the framework/hosting layer changes:

- Next.js App Router → TanStack Start file-based routes under `src/routes/`
- Next.js API routes / Edge Functions → TanStack `createServerFn` (auth-protected) + server routes for webhooks
- Netlify → Lovable hosting (one-click publish, stable URLs)
- Supabase Auth/DB/Storage/Realtime/RLS → **Lovable Cloud** (same Supabase capabilities, zero setup)
- Folder layout adapted to `src/routes/` instead of `src/app/`, but every page from your spec is built.

Everything else (RTL Arabic-first UI, roles, request lifecycle, timeline, RLS, buckets, statuses, notifications) is built as specified.

## Scope — Phase 1 (this build)
To keep this first build shippable and reviewable, I'll deliver Phases 1–4 of your roadmap end-to-end, plus skeletons for 5–9. Concretely:

**Fully working:**
1. Project foundation: RTL Arabic layout, design tokens (teal primary + warm orange accent, soft gray bg, navy text), typography (Cairo for Arabic + Inter fallback), reusable UI (StatusBadge, RequestCard, Timeline, ImageUploader, EmptyState, LoadingSkeleton, DashboardStatsCard, Sidebar layout, Navbar, Toasts).
2. Lovable Cloud enabled + full SQL migration: `profiles`, `user_roles` (separate table, app_role enum), `service_categories`, `employees`, `employee_categories`, `service_requests`, `request_images`, `request_applications`, `request_history`, `request_notes`, `reviews`, `notifications`. Includes enums for request/application/image status, GRANTs, RLS policies per your security matrix, and `has_role()` security-definer. Triggers: auto-create profile on signup, auto-append `request_history` on status change, auto-reject other applications on accept, recalc employee avg rating on review insert, enforce single-review-per-request.
3. Storage buckets: `avatars`, `request-images`, `completion-proofs` with RLS + 5MB / image-type validation.
4. Auth pages: `/login`, `/register` (with role selection customer/employee), `/forgot-password`, `/reset-password`. Role-based redirect after login. `_authenticated` layout guard + per-role guards (`_customer`, `_employee`, `_admin`).
5. Public pages: `/` (hero with both Arabic CTAs, how-it-works, categories, trust, tracking explanation, footer), `/services`, `/about`, `/contact`. Each has unique SEO head tags.
6. Customer flow end-to-end: dashboard with stat cards, requests list with status filter, **new request form** (RHF + Zod: category/title/description≥20/location/images), request detail with timeline, applications list, accept/reject (server fn enforces business rules), notes, completion proof viewer, review form post-completion.
7. Employee flow: dashboard with availability toggle, nearby matching requests (filtered by category + location), request detail, apply form (message/ETA/price with Zod), assigned-request status update controls following allowed transition graph, progress/completion image upload, notes.
8. Server functions (auth-protected, RLS-respecting) for all business actions: `createServiceRequest`, `applyToRequest`, `acceptApplication`, `updateRequestStatus`, `completeRequest`, `submitReview`. Each validates input (Zod), checks authorization, writes the row, appends history, creates notifications.
9. In-app notifications: dropdown in navbar + Supabase Realtime subscription for new notifications, applications, status changes, notes.
10. LocationPicker / MapDisplay as **placeholder components** with a clean interface ready to swap in Google Maps or Mapbox later (lat/lng stored on request now).

**Skeleton only (clearly marked, navigable, returns empty states):**
- Admin section: `/admin/dashboard`, `/admin/users`, `/admin/employees` (with verify action wired), `/admin/categories` (CRUD wired), `/admin/requests`, `/admin/reviews`, `/admin/settings`. Stats cards render real counts; deeper admin analytics are stubbed.
- Employee `/employee/reviews`, `/employee/profile`, `/customer/profile` render data but advanced edit flows are minimal.

## Localization
- Arabic-first RTL (`<html dir="rtl" lang="ar">`), Cairo font for Arabic, Inter for Latin.
- Language switcher in navbar with **Arabic / English / Turkish**. Strings live in `src/lib/i18n/{ar,en,tr}.ts` with a typed `t()` hook. Arabic is default; switching toggles `dir` and font.

## Design direction
Trustworthy home-services aesthetic: deep teal primary (`oklch(~0.45 0.09 200)`), warm orange accent for CTAs, near-white background, white cards with soft shadow, navy text. Status badges use a clear, distinct color per request status (pending=gray, applications_received=blue, assigned=indigo, on_the_way=cyan, inspection_started=violet, quotation_provided=amber, customer_approved_quotation=lime, work_in_progress=orange, waiting_customer_response=yellow, completed=green, cancelled=red, disputed=rose). Rounded-2xl corners, generous spacing, mobile-first responsive, sidebar dashboard layout that collapses on mobile.

## Technical details
- **Routes**: flat dot convention under `src/routes/`, e.g. `_authenticated._customer.requests.$id.tsx`.
- **Data fetching**: TanStack Query + `useSuspenseQuery` reading from `createServerFn` handlers; loaders prefetch via `ensureQueryData`. Realtime subscriptions invalidate query keys.
- **Forms**: React Hook Form + Zod + shadcn `<Form>`.
- **Validation lives twice**: client (UX) and server fn handler (security).
- **Business rules enforced server-side**: only owner accepts, only assigned employee updates status, status transitions validated against allowed graph, no duplicate applications (DB unique constraint), single review per request (unique constraint), completion requires final note OR completion_proof image.
- **History is immutable**: `request_history` has INSERT-only policy, no UPDATE/DELETE policies.
- **Auth state**: `onAuthStateChange` listener at root invalidates router + query cache.
- **Bearer attacher** wired in `src/start.ts` so protected server fns receive the JWT.

## What I'll ask for after this plan is approved
- Confirmation that the **TanStack Start + Lovable Cloud** stack swap is acceptable (everything else stays).
- Confirmation on the Phase-1 scope above (full Phases 1–4 working, 5–8 working core flows, admin as skeleton). If you'd rather I go narrower-and-deeper or wider-and-shallower, say so.

After approval I'll enable Lovable Cloud, write the migration, then build top-down: tokens & layout → auth → public → customer → employee → admin shell.