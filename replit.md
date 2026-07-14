# Vitrino

A React + TypeScript + Vite app that lets nail technicians create a public portfolio page ("vitrin"). The UI is in Persian (RTL).

## Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4, DaisyUI, Vazirmatn font
- **Backend/DB:** Supabase (PostgreSQL + Storage)
- **Routing:** React Router v7

## Running the app

```
npm run dev
```

The dev server runs on port 5000. The workflow "Start application" handles this automatically.

## Required secrets

| Secret | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (with or without `https://`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public API key |

## Supabase schema

See `SUPABASE_GUIDE.md` for the full schema. Two tables required:
- `nail_techs` — nail technician profiles
- `designs` — design portfolio items

Two public storage buckets: `avatars` and `designs`.

## Pages

- `/setup` — onboarding form to create a profile and add designs
- `/vitrin/:slug` — public-facing portfolio page for a nail tech
- `/settings` — edit profile and manage designs

## User preferences
