# Vitrino — Production Roadmap

Verified against the live Supabase project on 2026-07-21: tables and buckets
exist, but **anonymous sign-ins are disabled**, so all writes currently fail
RLS and silently fall back to localStorage.

## Phase 0 — Make the cloud backend actually work (do today, ~30 min)

- [ ] **Enable Anonymous Sign-Ins** — Supabase Dashboard → Authentication →
      Sign In / Providers → toggle "Anonymous sign-ins". Without this, nothing
      is saved to the cloud.
- [ ] **Apply the RLS policies** — run the SQL script embedded in the
      Settings page (`src/pages/Settings.tsx`) in the Supabase SQL Editor.
      It adds `owner_id` columns and owner-scoped write policies.
- [ ] **Verify end-to-end** — create a profile at `/setup`, then confirm the
      row appears in Supabase Table Editor (not just localStorage), and the
      avatar/design images land in the buckets.
- [ ] **Make cloud failures visible** — the localStorage fallback in
      `src/lib/db.ts` masks Supabase errors. Show a warning banner when the
      app is running in offline/local mode so failures are never silent.

## Phase 1 — Remove mocked functionality (~1 day)

- [ ] **Instagram search in Setup** (`getMockInstagramSuggestions` in
      `src/pages/Setup.tsx`) — remove the fake suggestion dropdown and the
      formula-generated follower counts. Replace with a plain handle input +
      format validation (letters, digits, dots, underscores, 1–30 chars) and
      a "preview on Instagram" link. Real verification comes in Phase 3, if ever.
- [ ] **Clean up stale docs** — `SUPABASE_GUIDE.md` and `README.md` still
      reference `.env.local` / `VITE_SUPABASE_ANON_KEY`; project now uses
      `.env` with `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Phase 2 — Real login for multi-device access (~2–4 days)

Ownership is currently tied to the browser that created the profile; the tech
can't manage her vitrin from both phone and laptop.

- [ ] **Phone OTP auth** via Supabase Auth with a custom SMS hook (Edge
      Function) wired to an Iranian gateway — Kavenegar or SMS.ir. Western
      providers (Twilio) don't deliver reliably to Iranian numbers.
- [ ] **Upgrade path** — convert the existing anonymous session to a
      permanent account (`supabase.auth.updateUser`) so early users keep
      their data; `owner_id` stays valid because the uid doesn't change.
- [ ] **Login/logout UI** + "manage my vitrin" entry point.

## Phase 3 — Real Instagram integration (optional — deprioritize)

Only via a Supabase Edge Function (server-side; the user's browser never
calls Meta). Honest assessment: Meta's Graph API requires a business/creator
account linked to a Facebook Page, a reviewed Meta app, and is practically
unreliable for an Iranian audience. Instagram OAuth login is not viable
(filtered authorization page + Meta policy). The Phase 1 handle validation +
link-out flow already covers 95% of the value.

- [ ] (If pursued) Edge Function `verify-instagram` that checks a handle
      exists and fetches the profile picture; store result on the profile.

## Phase 4 — Production hardening & launch (~2–3 days)

- [ ] **Storage write policies** — buckets are public-read (correct), but
      uploads should require an authenticated session and per-owner paths.
- [ ] **Hosting** — deploy the static build. For Iranian visitors, put it
      behind a CDN reachable in Iran (e.g. ArvanCloud) or host locally;
      Supabase API traffic from Iran generally works but test from a real
      Iranian connection early.
- [ ] **Shareability** — per-vitrin `<title>`/OpenGraph tags so links shared
      in Instagram bios/DMs unfurl nicely (needs prerendering or an edge
      rewrite, since this is a client-only SPA).
- [ ] **Decide the localStorage fallback's fate** — keep as explicit offline
      cache with a visible indicator, or remove to avoid split-brain data.
- [ ] Error monitoring (e.g. Sentry) + basic analytics.
