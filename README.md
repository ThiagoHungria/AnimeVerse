# 🌐 AnimeVerse

**Anime discovery engine inteligente com curadoria automatizada.**

Plataforma de catálogo de animes construída com **Next.js + TypeScript + Tailwind**, alimentada por dados reais do **MyAnimeList** (via **Jikan API**) e com uma **camada de inteligência** própria (recomendações, similaridade por tags, filtros por intenção e tags humanas) por cima da API.

> Não é "mais um clone de catálogo": é um motor de descoberta com curadoria automática, arquitetura desacoplada de provedores e fallback offline.

## ✨ Destaques

- 🔌 **Dados reais via MAL/Jikan** — populares, em alta, temporada atual, busca, gêneros, recomendações e episódios.
- 🧠 **Anime Intelligence Layer**
  - **Tags inteligentes**: transforma `Action + Shounen` em _"Alta adrenalina"_ + _"Protagonista em evolução"_.
  - **Recomendação personalizada** com base em gêneros, favoritos e histórico de navegação.
  - **Similar Engine** (animes parecidos) por tags + nota.
  - **Filtros por intenção**: _Joias escondidas_, _Para maratonar_, _Top subestimados_, _Alta adrenalina_, _Histórias emocionais_, _Narrativas complexas_.
- 🧱 **Arquitetura desacoplada**: a UI só conhece o `animeService` (facade). Trocar de provedor = trocar 2 arquivos.
- 🛟 **Fallback resiliente**: se a API cair ou bater rate-limit, o app degrada para um dataset local curado.
- ⚡ **React Query** com cache agressivo + **rate-limiter** próprio para respeitar os limites do Jikan.
- ⭐ Favoritos, 📚 histórico e ▶️ "continuar assistindo" (LocalStorage), 🌙 dark mode premium, 📱 PWA-ready.

## 🧱 Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Zustand (`persist`) · TanStack React Query · hls.js · lucide-react · **Jikan v4 (MyAnimeList)**.

## 🏗️ Arquitetura em camadas

```
                 UI (components / pages)
                         │   (a UI só conhece o service)
                         ▼
   hooks (React Query)  ──►  services/animeService.ts   ← FACADE unificada
                                   │
              ┌────────────────────┼─────────────────────┐
              ▼ (1) primário       ▼ (2) fallback         ▼ (3) offline
     services/malApi.ts     services/jikanApi.ts   services/fallbackData.ts
     (MAL oficial, v2,       (Jikan v4 +            (dataset local mapeado)
      X-MAL-CLIENT-ID)        rate-limit + retry)
              └────────────────────┬─────────────────────┘
                                   ▼  cada provider normaliza para →
                       domain/external.ts  (ExternalAnime, neutro)
                                   ▼
                       domain/anime.mapper.ts  → mapExternalAnimeToInternal()
                       domain/smartTags.ts     → tags inteligentes
                                   ▲
                       services/intelligenceEngine.ts
                       (recomendação · similaridade · ranking próprio · filtros)
```

Organização **feature-based** + camadas compartilhadas:

```
src/
├─ app/                         # rotas (Home, explore, profile, search, anime/[id], watch, favorites, history)
├─ features/
│  ├─ anime/                    # components (Card, Carousel, Hero, EpisodeList, ...) + hooks/useAnimeQueries
│  ├─ recommendations/          # RecommendedRow, HiddenGemsRow + hooks/useRecommendations
│  ├─ explore/                  # ExploreFilters + hooks/useExplore (discover)
│  └─ profile/                  # ContinueWatchingRow
├─ services/
│  ├─ malApi.ts                 # provider MAL oficial (v2, via client id)
│  ├─ jikanApi.ts               # provider Jikan (fallback/default)
│  ├─ animeService.ts           # FACADE unificada (MAL → Jikan → local) + discover()
│  ├─ intelligenceEngine.ts     # engine de inteligência (recomendação/similar/ranking/filtros)
│  └─ fallbackData.ts           # dataset local mapeado
├─ domain/
│  ├─ external.ts               # ExternalAnime + normalização (status/duração/temporada)
│  ├─ anime.mapper.ts           # mapExternalAnimeToInternal() / buildAnimeDetail()
│  └─ smartTags.ts              # taxonomia MAL → tags humanas + heurísticas
├─ store/                       # favorites / history / profile (Zustand + LocalStorage)
├─ hooks/, components/{ui,layout,player,pwa,search}, types/, utils/, data/
```

## 🔌 Camada de dados (MAL oficial + Jikan)

- **Dois providers**, ambos normalizando para o modelo neutro `ExternalAnime`:
  - `malApi.ts` — **MyAnimeList API v2** (principal). Ativa quando `NEXT_PUBLIC_MAL_CLIENT_ID` está definido.
  - `jikanApi.ts` — **Jikan v4** (fallback/padrão), com **rate-limit** (~450ms, < 3 req/s) e **retry com backoff em 429**.
- `animeService.ts` orquestra a precedência **MAL → Jikan → dataset local** de forma transparente.
- **Regra de ouro**: nenhum componente chama provider direto — tudo passa pelo `animeService` + React Query (cache agressivo).

> Sem `NEXT_PUBLIC_MAL_CLIENT_ID` o app roda 100% via Jikan (sem setup). Para usar a MAL oficial, crie `.env.local` com `NEXT_PUBLIC_MAL_CLIENT_ID=<seu_id>`.

## 🔄 Mapeamento (obrigatório)

`domain/anime.mapper.ts` converte o modelo neutro no modelo interno limpo da UI, incluindo as `smartTags`:

```ts
mapExternalAnimeToInternal(external): AnimeSummary
buildAnimeDetail(external, episodes): Anime
```

Trocar de provedor = novo provider que produz `ExternalAnime`. Mapper e UI permanecem intactos.

## 🧠 Anime Intelligence Engine (diferencial)

`services/intelligenceEngine.ts` (funções puras):

- `recommend(pool, tasteProfile, { exclude, limit })` — recomendação personalizada (histórico + favoritos + gêneros).
- `findSimilar(target, pool)` / `similarityScore()` — similaridade por gênero + tema + nota.
- `animeVerseScore()` / `rankByAnimeVerseScore()` — **ranking próprio** (nota MAL + popularidade + engajamento + boost de joia escondida).
- `getHiddenGems()`, `smartFilters`, `buildDiscoveryCollections()` — descoberta por intenção.
- `generateSmartTags()` — tags humanas (`Action → "Alta adrenalina"`, `Psychological → "Narrativas profundas"`).

O **perfil de gosto** (`store/profile.store.ts`) aprende com favoritos (peso 3), visualizações (peso 1) e gêneros escolhidos no `/profile` (peso 5).

## 🔎 Explore com filtros avançados

`/explore` combina gênero, ano, temporada, nota mínima, status, tipo e ordenação (`features/explore`). Sem filtros ativos, exibe curadoria automática (recomendados + trending + coleções por intenção).

## 🚀 Como rodar

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # build de produção
npm run start    # servir o build
npm run lint     # lint
```

## 📝 Notas

- **Streaming**: MAL/Jikan não fornece (nem pode) fontes de vídeo. Para manter player, histórico e "continuar assistindo" funcionais, os episódios são mapeados sobre clipes públicos de exemplo. O **trailer real** do anime (YouTube) é exibido na página de detalhes.
- Imagens vêm do `cdn.myanimelist.net` (e thumbnails de trailer do YouTube); o fallback usa `picsum.photos`. Hosts configurados em `next.config.ts`.
- Persistência local: `animeverse:favorites`, `animeverse:history`, `animeverse:profile`.
- Sem chaves de API: o Jikan é público. Para usar a MAL API oficial no futuro, basta criar um novo provider e plugá-lo no `animeService`.
