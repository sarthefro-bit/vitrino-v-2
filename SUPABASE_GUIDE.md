# Vitrino Supabase Setup & Troubleshooting Guide

This guide explains how Supabase integration works in Vitrino, how to resolve `nail_techs` table persistence issues, and how to use the secret diagnostic backlog panel.

---

## 1. Environment Variables Configuration

Ensure your `.env` file contains the required Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
# VITE_SUPABASE_ANON_KEY is also supported as an alias
```

---

## 2. Master SQL Fix Script for `nail_techs` & `designs`

If data is not persisting to Supabase, run this script in your **Supabase Dashboard -> SQL Editor**:

```sql
-- 1. Create nail_techs Table
CREATE TABLE IF NOT EXISTS public.nail_techs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT,
    instagram TEXT,
    whatsapp TEXT,
    telegram TEXT,
    avatar_url TEXT,
    mobile TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1b. Migration for existing installations (email OTP auth refactor)
ALTER TABLE public.nail_techs ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.nail_techs ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.nail_techs DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.nail_techs ALTER COLUMN mobile DROP NOT NULL;

-- 2. Create designs Table
CREATE TABLE IF NOT EXISTS public.designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tech_id UUID REFERENCES public.nail_techs(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    price NUMERIC DEFAULT 0,
    duration NUMERIC DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2b. Migration for existing designs tables missing timestamp columns
ALTER TABLE public.designs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE public.designs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 3. Enable RLS
ALTER TABLE public.nail_techs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- 4. Set RLS Policies for Public Access
DROP POLICY IF EXISTS "Public Select Nail Techs" ON public.nail_techs;
CREATE POLICY "Public Select Nail Techs" ON public.nail_techs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Upsert Nail Techs" ON public.nail_techs;
CREATE POLICY "Public Upsert Nail Techs" ON public.nail_techs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Select Designs" ON public.designs;
CREATE POLICY "Public Select Designs" ON public.designs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Designs" ON public.designs;
CREATE POLICY "Public Insert Designs" ON public.designs FOR ALL USING (true) WITH CHECK (true);

-- 5. Storage Buckets Setup
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('designs', 'designs', true) ON CONFLICT (id) DO NOTHING;

-- 6. Storage Policies
DROP POLICY IF EXISTS "Public Avatars Access" ON storage.objects;
CREATE POLICY "Public Avatars Access" ON storage.objects FOR ALL USING (bucket_id IN ('avatars', 'designs')) WITH CHECK (bucket_id IN ('avatars', 'designs'));
```

---

## 3. Authentication Setup (Email OTP + Google)

Vitrino now uses **Supabase Auth** with email one-time codes and Google sign-in.
There is no phone/password login anymore. Configure the following in your
Supabase Dashboard:

### Email OTP (6-digit code)

1. Go to **Authentication -> Providers -> Email** and make sure Email is enabled.
2. Go to **Authentication -> Email Templates** and edit **BOTH** of these
   templates (Supabase uses *Confirm signup* for first-time emails and
   *Magic Link* for returning users):
   - **Confirm signup**
   - **Magic Link**

   Include the code alongside (or instead of) the link:

   ```html
   <h2>کد ورود شما به ویترینو</h2>
   <p>کد تأیید: <strong>{{ .Token }}</strong></p>
   <p>یا روی این لینک بزنید: <a href="{{ .ConfirmationURL }}">ورود به ویترینو</a></p>
   ```

   The `{{ .Token }}` variable is required — without it users receive only a
   link instead of the 6-digit code the app asks for. (Keeping
   `{{ .ConfirmationURL }}` too lets users choose either method.)
3. (Optional) Tune OTP expiry under **Authentication -> Providers -> Email ->
   Email OTP Expiration** (default 1 hour; the app suggests 5 minutes).

### Google Sign-In

1. Create OAuth credentials in Google Cloud Console (Web application) and add
   `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorized
   redirect URI.
2. In Supabase go to **Authentication -> Providers -> Google**, enable it and
   paste the Client ID / Client Secret.
3. Add your app URL(s) (e.g. `http://localhost:3000`) to
   **Authentication -> URL Configuration -> Redirect URLs**. The app returns
   users to `/auth` after Google sign-in.

### Demo mode (no Supabase credentials)

When `VITE_SUPABASE_URL` / key are absent, the app runs fully offline:
the OTP code is generated locally and shown right on the verification screen,
and Google sign-in is disabled.

---

## 4. Secret Diagnostic Backlog Page

Access the secret diagnostic dashboard at:

`http://<your-app-domain>/secret-admin`

Features:
- Live Supabase connection test & table health report.
- Real-time event log backlog for all database queries and storage operations.
- 1-Click SQL fix copy button.
- Local vs Cloud record count comparison.
