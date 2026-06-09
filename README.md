# Outfit — Your Digital Wardrobe

A digital wardrobe app: catalog your clothes, build outfits on a drag‑and‑drop
canvas, discover auto‑generated combinations, plan what to wear on a calendar,
track wear history, and share looks with a public link. Hebrew‑first with a
full English translation and proper RTL/LTR support.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **Supabase** — Postgres, Auth, Storage (RLS on every table)
- **Tailwind CSS v4**, **Radix UI**, **lucide-react**
- **date-fns** for dates, **@imgly/background-removal** for in‑browser
  background removal (no server cost)

## Getting started

```bash
npm install
# create .env.local with the values below
npm run dev
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase publishable (anon) key |
| `NEXT_PUBLIC_WEATHER_API_KEY` | no | OpenWeatherMap key; falls back to a demo widget if unset |

## Project structure

```
src/
  app/
    (auth)/            login & signup
    (dashboard)/       wardrobe, outfits, discover, calendar,
                       wishlist, history, favorites, insights, profile
    share/[token]/     public, server-rendered shared outfit page
  components/          ui primitives, layout, weather widget
  lib/                 supabase clients, i18n (lang-context + translations),
                       utils, background removal
  types/               generated Supabase database types
  proxy.ts             auth gate (Next.js 16 proxy / middleware)
```

## Internationalization

All copy lives in `src/lib/translations.ts` (`he` + `en`, kept symmetric and
type‑checked). The active language is held in `lib/lang-context.tsx` and
persisted to both `localStorage` and a `lang` cookie, so the server can pick the
correct language and text direction on first paint (root layout and the public
share page both read the cookie). Layout uses logical CSS properties
(`start`/`end`, `ms`/`me`, `ps`/`pe`) so it mirrors correctly in RTL and LTR.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint
