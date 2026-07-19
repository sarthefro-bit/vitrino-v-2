# Vitrino — Fix Log

Everything below was verified with `tsc -b`, `eslint .`, and `vite build` — all clean, zero errors.

## Removed: fake phone-mockup chrome
- `src/index.css`: `.phone-mockup-wrapper` no longer draws a black device
  bezel or locks to a fixed 840px height. On mobile it now just fills the
  real viewport (`100dvh`); on desktop it's a soft centered card, not a
  fake phone screenshot.
- Removed the simulated status bar (clock + wifi + battery icons) and its
  `setInterval` clock logic from **Setup.tsx**, **Vitrin.tsx**, and
  **Settings.tsx**. That was a Google AI Studio mockup artifact — real
  users get the real browser chrome, not a fake one on top of it.

## Fixed bugs

1. **Delete design didn't delete from Supabase.** `handleDeleteDesign` in
   Setup.tsx only wrote to `localStorage`; the row stayed alive in Supabase
   and kept showing on the public vitrin. Now calls `deleteDesign()` from
   `db.ts`, which handles both.

2. **"30 minutes" was saved as "3 hours".** The duration parser checked
   `.includes('۳')` before `.includes('۳۰')`, and `'۳۰ دقیقه'` contains
   `'۳'`, so it always matched the 3-hour branch first. Reordered the
   checks so the more specific `'۳۰'` is checked first.

3. **Slug collisions.** Two salons with the same/similar name got the
   exact same URL slug, and one profile silently shadowed the other.
   Added `slugify()` + `ensureUniqueSlug()` to `db.ts` — sanitizes Persian
   text into a safe slug and auto-appends `-2`, `-3`, etc. on collision.
   Wired into both registration steps in Setup.tsx.

4. **No mobile number validation.** Setup now requires a real
   `09xxxxxxxxx` format before letting you continue, so the `tel:` and
   WhatsApp `wa.me/` links on the public page don't break.

5. **Wide-open Supabase security policies.** The SQL script in Settings
   had `USING (true) WITH CHECK (true)` on every write — meaning anyone
   with the public anon key (visible in the shipped JS bundle) could edit
   or delete *any* nail tech's profile or designs. Fixed by:
   - Every browser now signs in anonymously via Supabase Auth
     (`ensureAnonymousSession()` in `supabaseClient.ts`, kicked off in
     `main.tsx`), giving each device a stable `auth.uid()`.
   - Added an `owner_id` column to both tables, stamped on insert.
   - New RLS policies: anyone can `SELECT` (the vitrin page is public),
     but only `auth.uid() = owner_id` can `INSERT`/`UPDATE`/`DELETE`.
   - **You need to enable "Anonymous Sign-Ins"** in your Supabase
     dashboard under Authentication → Providers, or all writes will be
     rejected. Re-run the updated SQL script from the Settings page in
     your Supabase SQL Editor (it safely drops the old open policies
     first).
   - If you already have rows created before this change, their
     `owner_id` will be `NULL` and you won't be able to edit/delete them
     through the app anymore — you'd need to backfill `owner_id` manually
     in the Supabase table editor, or just re-create the profile.

6. **Silent data loss when local storage fills up.** Offline mode stores
   photos as Base64 in `localStorage`, which typically caps around
   5–10MB total, while a single photo can be up to 5MB. A failed save
   used to be swallowed (`console.error` only) while the UI acted like it
   worked. `saveLocalTechs`/`saveLocalDesigns` now report success/failure,
   and Setup.tsx shows an actual error message when a save fails.

7. **Error messages were invisible inside the "Add Work Sample" modal.**
   The error banner only rendered on the page behind the modal overlay.
   Added the same error banner inside the modal itself, and clear stale
   errors when the modal opens.

8. **`.gitignore` didn't exclude `.env`.** Only `*.local` was ignored.
   Added explicit `.env` / `.env.*` rules (keeping `.env.example` tracked).

## Still worth doing (not blockers, didn't touch)
- The Instagram "search suggestions" in Setup.tsx are entirely mocked
  data (hardcoded sample profiles + a formula-generated follower count).
  It looks like a live lookup but validates nothing. Fine to leave as a
  cosmetic nicety, but consider labeling it or replacing it later so it
  doesn't feel deceptive to a nail tech testing with her real handle.
- No real login — "ownership" is tied to whichever browser created the
  profile. That's fine for a solo salon owner on one device/browser, but
  if you want her to manage her vitrin from her phone AND her laptop,
  you'll eventually want real Supabase Auth (email/password or magic
  link) instead of/alongside the anonymous session.
