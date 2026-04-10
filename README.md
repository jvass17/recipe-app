# Recipes PWA

## Overview

A Progressive Web App for browsing recipes from **TheMealDB** through a local **Express proxy**. The browser never talks to TheMealDB directly and never sees the API key. Favorites are stored in **IndexedDB** so they work fully offline (view, add from cached recipe details, remove).

## Features

- Search by name, browse categories, recipe detail with ingredients, instructions, tags, and YouTube link
- Favorite / unfavorite with `aria-pressed` and keyboard-accessible controls
- Offline favorites, offline toast, and a service worker with precaching + runtime caching (no Workbox)
- Theming (light/dark) via `next-themes`, toasts via **Sonner**, UI styled with **Tailwind** and **shadcn-style** primitives

## Tech stack

- **Client:** React 18, Vite 5, TypeScript, TanStack Query, React Router, Tailwind, Radix primitives, Sonner, idb, Lucide
- **Server:** Node.js, Express, Helmet, CORS, Compression, dotenv

## Setup

### 1. API proxy (Express)

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

The server listens on **http://localhost:5174** by default (`PORT` in `.env`).

### 2. Client (Vite)

In a second terminal:

```bash
cd client
npm install
npm run dev
```

The app runs at **http://localhost:5173**. Vite proxies `/api/*` to the Express server so the browser only calls same-origin `/api/*` (required for service worker caching in development).

## Environment variables (server)

| Variable | Purpose | Default |
|----------|---------|---------|
| `MEALDB_API_BASE` | Base URL for TheMealDB JSON API | `https://www.themealdb.com/api/json/v1` |
| `MEALDB_API_KEY` | API key segment in the path (never sent to the client) | `1` |
| `PORT` | HTTP port for Express | `5174` |

The proxy builds upstream URLs as: `{MEALDB_API_BASE}/{MEALDB_API_KEY}/search.php?...` (and similar for other endpoints).

## shadcn/ui (already scaffolded)

This repo includes shadcn-style components under `client/src/components/ui` and `client/components.json`. If you add more components in another checkout, the usual flow is:

```bash
cd client
npx shadcn@latest init
npx shadcn@latest add button card input badge dialog skeleton sonner
```

Tailwind, `postcss.config.cjs`, and `tailwind.config.cjs` are already wired; `globals.css` defines CSS variables for themes.

## PWA and offline testing

- **Manifest:** `client/public/manifest.webmanifest`
- **Service worker:** `client/src/sw.js` (copied to `dist/sw.js` on build; dev server serves `/sw.js` from the same file)
- **Offline HTML:** `client/public/offline.html`

### How to test

1. Run server + client as above.
2. Open the app, browse a few recipes so `/api/*` and images populate the SW caches.
3. In Chrome DevTools → **Application** → **Service Workers**, confirm registration.
4. Use **Offline** simulation and reload: shell and cached API responses should still load; favorites page should work from IndexedDB.

For production-like checks, run `cd client && npm run build && npm run preview` (still start the API server separately, or deploy API and set the client to the same origin).

## Caching strategies (service worker)

Defined in `client/src/sw.js` (see comments at top of the file):

| Kind | Strategy |
|------|-----------|
| App shell (`/`, `index.html`, `offline.html`, manifest, icons) | Precached on install (`CACHE_VERSION` bump invalidates) |
| `GET /api/categories` | Stale-while-revalidate |
| Other `GET /api/*` (search, meal, filter, random) | Network-first with cache fallback |
| `themealdb.com` images | Stale-while-revalidate |
| `/assets/*` (built JS/CSS) | Stale-while-revalidate |

To change behavior, edit `CACHE_VERSION` and the branches in `fetch` (e.g. shorten category SWR by updating the server `Cache-Control` and SW logic together).

## Build and deploy

- **Client:** `cd client && npm run build` → static output in `client/dist`. Suitable for **Netlify** or **Vercel** (configure SPA fallback to `index.html` for client routes).
- **Server:** `cd server && npm run build && npm start` → run `node dist/index.js`. Suitable for **Render**, **Fly.io**, **Railway**, etc. Set `MEALDB_*` and `PORT` in the host’s environment; do not commit `.env`.

For a single origin in production, put the API and static site behind one domain (reverse proxy) so `/api/*` and the PWA share an origin.

## Security

- The client only calls `/api/*` (relative URLs).
- `MEALDB_API_KEY` exists only on the server and is never embedded in the client bundle.

## Post-generation checklist

- [ ] Replace `client/public/icons/icon-192.png` and `icon-512.png` with real 192×192 and 512×512 assets (placeholders are minimal 1×1 PNGs).
- [ ] Optionally add more shadcn components via CLI (`npx shadcn@latest add ...`).
- [ ] After changing the service worker, bump `CACHE_VERSION` in `src/sw.js`.
- [ ] Configure production hosting: SPA rewrites + same-origin `/api` or CORS if API is on another subdomain (SW caching of `/api` works best same-origin).

## Scripts summary

| Location | Command | Purpose |
|----------|---------|---------|
| `server` | `npm run dev` | Dev API on port 5174 (tsx watch) |
| `server` | `npm run build` / `npm start` | Production compile + run |
| `client` | `npm run dev` | Vite dev server with `/api` proxy |
| `client` | `npm run build` | Typecheck + production build + copy `sw.js` |
| `client` | `npm run preview` | Preview production build |
