<div align="center">

# AnimeVerse

**An anime discovery engine with a custom recommendation & smart-tagging layer, powered by real MyAnimeList data.**

<p>
  <img src="https://img.shields.io/badge/Next.js-0D1117?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-0D1117?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-0D1117?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/React_Query-0D1117?style=flat-square&logo=reactquery&logoColor=white" alt="React Query" />
  <img src="https://img.shields.io/badge/Zustand-0D1117?style=flat-square&logo=react&logoColor=white" alt="Zustand" />
  <img src="https://img.shields.io/github/license/ThiagoHungria/AnimeVerse?style=flat-square&color=2563EB" alt="License" />
</p>

<a href="https://anime-verse-khaki.vercel.app"><img src="https://img.shields.io/badge/Live_Demo-2563EB?style=flat-square&logo=vercel&logoColor=white" alt="Live Demo" /></a>

</div>

---

## Overview

AnimeVerse is not "yet another catalog clone". It is a **discovery engine** built on top of real MyAnimeList data (via the Jikan API), with a proprietary **intelligence layer** for recommendations, similarity by tags, intent-based filters and human-readable tags — plus a decoupled provider architecture and an offline fallback.

## Highlights

- **Real data via MAL/Jikan** — trending, seasonal, search, genres, recommendations and episodes.
- **Anime Intelligence Layer**
  - **Smart tags** — turns `Action + Shounen` into _"High adrenaline"_ + _"Evolving protagonist"_.
  - **Personalized recommendations** based on genres, favorites and browsing history.
  - **Similar engine** (look-alike anime) by tags + score.
  - **Intent filters** — _Hidden gems_, _Binge-worthy_, _Underrated_, _High adrenaline_, _Emotional stories_, _Complex narratives_.
- **Decoupled architecture** — the UI only knows `animeService` (a facade). Swapping providers means changing 2 files.
- **Resilient fallback** — on API failure or rate-limit, the app degrades to a curated local dataset.
- **React Query** with aggressive caching + a custom **rate-limiter** to respect Jikan limits.
- Favorites, history and "continue watching" (LocalStorage), premium dark mode, PWA-ready.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **State:** Zustand (`persist`)
- **Data:** TanStack React Query · Jikan v4 (MyAnimeList) · optional MAL API v2
- **UI:** lucide-react · hls.js
- **Backend (optional):** NestJS + PostgreSQL + Redis (auth, sync, favorites)

## Architecture

The UI never calls a provider directly — everything flows through `animeService` (facade) + React Query.

```
UI (components / pages)
        │
   hooks (React Query)
        │
   services/animeService.ts   ← unified facade
        │
   ┌────────────┬────────────────┬─────────────────┐
 malApi.ts     jikanApi.ts       fallbackData.ts
 (MAL v2)      (Jikan v4 +       (local dataset)
               rate-limit)
        │
 domain/external.ts            ← neutral ExternalAnime model
 domain/anime.mapper.ts        ← maps to internal UI model
 domain/smartTags.ts           ← human tags
 services/intelligenceEngine.ts ← recommend · similar · ranking · filters
```

Feature-based organization with shared layers. To swap providers, write a new provider that returns `ExternalAnime` — mapper and UI stay untouched.

## Features

- Personalized recommendations and "hidden gems" rows.
- Advanced explore filters (genre, year, season, min score, status, type, ordering).
- Favorites, history and continue-watching, persisted locally.
- Premium dark UI, PWA-ready, resilient offline fallback.

## Getting Started

### Prerequisites

- Node.js 20+
- (Optional) Docker for the backend (PostgreSQL + Redis)

### Installation

```bash
git clone https://github.com/ThiagoHungria/AnimeVerse.git
cd AnimeVerse
npm install
```

### Environment

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | for auth/sync | NestJS API URL |
| `NEXT_PUBLIC_SITE_URL` | no | Public site URL (SEO/OG) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | no | Google OAuth (must match backend) |
| `NEXT_PUBLIC_MAL_CLIENT_ID` | no | Official MAL API; without it, Jikan is used |

> Without `NEXT_PUBLIC_MAL_CLIENT_ID`, the app runs 100% on Jikan — no setup required.

### Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the build
npm run lint     # lint
```

### Backend (optional)

```bash
npm run db:up          # Postgres + Redis via Docker
npm run db:migrate     # apply Prisma migrations
npm run dev:server     # API on http://localhost:3001
```

## Deploy

Deployed on **Vercel**: [anime-verse-khaki.vercel.app](https://anime-verse-khaki.vercel.app)

## Notes

- MAL/Jikan does not provide video sources; episodes are mapped over public sample clips so player/history/continue-watching stay functional. The real trailer (YouTube) is shown on the detail page.
- Images come from `cdn.myanimelist.net` (and YouTube trailer thumbnails); fallback uses `picsum.photos`. Hosts are configured in `next.config.ts`.

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE).

## Author

**Thiago Hungria** — Full Stack Developer
[GitHub](https://github.com/ThiagoHungria)
