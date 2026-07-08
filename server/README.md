# AnimeVerse Backend

NestJS + PostgreSQL + Prisma + JWT authentication + recommendation engine.

## Stack

- **NestJS 11** — modular REST API
- **PostgreSQL** — primary database
- **Prisma ORM** — schema + migrations
- **JWT** — access + refresh tokens
- **Redis** (optional) — response cache; falls back to in-memory
- **Zod** — request validation
- **Jikan API** — live anime catalog data

## Quick start

### 1. Start infrastructure

```bash
# From project root (requires Docker)
docker compose up -d
```

This starts PostgreSQL (`localhost:5432`) and Redis (`localhost:6379`).

### 2. Configure environment

```bash
# From server/ directory
cp .env.example .env
# Edit JWT_ACCESS_SECRET for production
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | — | Secret for signing access tokens |
| `JWT_ACCESS_TTL` | No | `900s` | Access token lifetime |
| `JWT_REFRESH_TTL` | No | `7d` | Refresh token lifetime |
| `GOOGLE_CLIENT_ID` | For Google login | — | Must match `NEXT_PUBLIC_GOOGLE_CLIENT_ID` on frontend |
| `CORS_ORIGINS` | Yes (prod) | `http://localhost:3000` | Comma-separated allowed origins |
| `REDIS_URL` | No | — | Redis cache; in-memory fallback when unset |
| `PORT` | No | `3001` | HTTP listen port |
| `NODE_ENV` | No | — | `development` or `production` |

### 3. Run migrations

```bash
npm install
npx prisma migrate deploy   # production / CI
# or
npx prisma migrate dev      # local development
```

### 4. Start the API

```bash
npm run start:dev
# → http://localhost:3001
```

Verify: `GET http://localhost:3001/health`

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/auth/register` | — | Register user |
| POST | `/auth/login` | — | Login (returns JWT) |
| POST | `/auth/refresh` | — | Refresh tokens |
| POST | `/auth/logout` | — | Revoke refresh token |
| GET | `/user/profile` | JWT | Get profile |
| PUT | `/user/profile` | JWT | Update profile / genres |
| GET | `/anime/trending` | — | Trending animes |
| GET | `/anime/search?q=` | — | Search animes |
| GET | `/anime/:id` | — | Anime details |
| POST | `/favorites` | JWT | Add favorite |
| DELETE | `/favorites/:animeId` | JWT | Remove favorite |
| GET | `/favorites` | JWT | List favorites (paginated) |
| POST | `/history` | JWT | Record watch progress |
| GET | `/history` | JWT | Watch history (paginated) |
| GET | `/history/continue` | JWT | Continue watching |
| GET | `/recommendations/:userId` | JWT | Personalized recommendations (userId must match authenticated user) |

## Architecture

```
src/
├─ modules/
│  ├─ auth/           JWT register/login/refresh
│  ├─ user/           Profile + preferences
│  ├─ anime/          Catalog (Jikan + cache)
│  ├─ favorites/      User favorites CRUD
│  ├─ history/        Watch history + continue
│  └─ recommendation/ Behavior-based engine
├─ services/
│  ├─ jikan.service.ts
│  └─ recommendation.service.ts   Pure scoring logic
├─ prisma/            PrismaService (global)
└─ common/            Cache, guards, pipes, pagination
```

## Database schema

- **User** — auth + profile
- **RefreshToken** — JWT refresh rotation
- **UserPreferences** — genre preferences + scores + watch time
- **Anime** — optional metadata cache
- **Favorite** — user ↔ anime
- **WatchHistory** — episode progress
- **RecommendationCache** — computed recommendations (TTL)

## Frontend integration

Set in the Next.js app (`.env.local`):

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

The frontend `apiClient` (`src/services/apiClient.ts`) and `auth.store` consume this API.

## Future-ready

The codebase is structured for:

- ML/AI recommendation swap (`services/recommendation.service.ts`)
- Social login (Google/Discord) via new auth strategies
- Multi-device sync (already server-backed)
- Real streaming sources (separate module)
- Official MAL API (`NEXT_PUBLIC_MAL_CLIENT_ID` on frontend; extend `malApi` on backend)
