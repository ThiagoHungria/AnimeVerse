/**
 * FASE 2.2-K — real product validation harness.
 *
 * Seeds a clearly-labelled test user with a coherent taste profile (shounen
 * action-heavy, with a few off-genre entries) plus an unseen candidate pool, so
 * the recommendation engine has something to rank even if Jikan is unavailable
 * (the durable-pool fallback reads these rows from the `Anime` table).
 *
 * Usage (from the `server` directory):
 *   npx ts-node scripts/taste-test.ts seed       # create user + data
 *   npx ts-node scripts/taste-test.ts validate   # print For You / Taste / SmartFeeds
 *   npx ts-node scripts/taste-test.ts cleanup     # remove the test user (cascade)
 *
 * Nothing here touches scoring, weights or API contracts — it only reads/writes
 * data and calls the existing services.
 */

import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const EMAIL = "taste-test@animeverse.dev";
const NAME = "Taste Tester";
const PASSWORD = "TasteTest123!";

interface SeedAnime {
  id: number;
  title: string;
  genres: string[];
  themes?: string[];
  score: number;
}

/** Watch history (oldest → newest). K-On! is last so it becomes the anchor. */
const WATCHED: SeedAnime[] = [
  { id: 20, title: "Naruto", genres: ["Action", "Adventure", "Fantasy"], themes: ["Martial Arts"], score: 8.0 },
  { id: 1735, title: "Naruto: Shippuuden", genres: ["Action", "Adventure", "Fantasy"], themes: ["Martial Arts"], score: 8.3 },
  { id: 21, title: "One Piece", genres: ["Action", "Adventure", "Fantasy"], score: 8.7 },
  { id: 269, title: "Bleach", genres: ["Action", "Adventure", "Supernatural"], score: 7.9 },
  { id: 40748, title: "Jujutsu Kaisen", genres: ["Action", "Supernatural"], themes: ["School"], score: 8.6 },
  { id: 16498, title: "Shingeki no Kyojin", genres: ["Action", "Drama"], themes: ["Military", "Survival"], score: 8.5 },
  { id: 38000, title: "Kimetsu no Yaiba", genres: ["Action", "Supernatural"], themes: ["Historical"], score: 8.5 },
  { id: 31964, title: "Boku no Hero Academia", genres: ["Action"], themes: ["School", "Super Power"], score: 7.9 },
  { id: 11061, title: "Hunter x Hunter (2011)", genres: ["Action", "Adventure", "Fantasy"], score: 9.0 },
  { id: 5114, title: "Fullmetal Alchemist: Brotherhood", genres: ["Action", "Adventure", "Drama", "Fantasy"], score: 9.1 },
  { id: 1535, title: "Death Note", genres: ["Supernatural", "Suspense"], themes: ["Psychological"], score: 8.6 },
  { id: 44511, title: "Chainsaw Man", genres: ["Action", "Supernatural"], themes: ["Gore"], score: 8.5 },
  { id: 30276, title: "One Punch Man", genres: ["Action", "Comedy"], themes: ["Super Power", "Parody"], score: 8.5 },
  { id: 32182, title: "Mob Psycho 100", genres: ["Action", "Supernatural"], themes: ["School", "Super Power"], score: 8.5 },
  { id: 37521, title: "Vinland Saga", genres: ["Action", "Adventure", "Drama"], themes: ["Historical", "Gore"], score: 8.7 },
  { id: 34572, title: "Black Clover", genres: ["Action", "Fantasy"], themes: ["Magic"], score: 8.1 },
  { id: 22319, title: "Tokyo Ghoul", genres: ["Action", "Horror", "Supernatural"], themes: ["Psychological", "Gore"], score: 7.8 },
  { id: 23273, title: "Shigatsu wa Kimi no Uso", genres: ["Drama", "Romance"], themes: ["Music", "School"], score: 8.6 },
  { id: 4224, title: "Toradora!", genres: ["Comedy", "Romance"], themes: ["School"], score: 8.1 },
  { id: 5680, title: "K-On!", genres: ["Comedy", "Slice of Life"], themes: ["Music", "School", "CGDCT"], score: 7.8 },
];

const FAVORITE_IDS = [20, 21, 269, 40748, 16498];

/** Unseen candidate pool so feeds populate even when Jikan is down. */
const POOL: SeedAnime[] = [
  { id: 50265, title: "Spy x Family", genres: ["Action", "Comedy"], themes: ["Childcare"], score: 8.5 },
  { id: 49596, title: "Blue Lock", genres: ["Sports"], themes: ["Team Sports"], score: 8.2 },
  { id: 20583, title: "Haikyuu!!", genres: ["Sports"], themes: ["Team Sports", "School"], score: 8.5 },
  { id: 52991, title: "Sousou no Frieren", genres: ["Adventure", "Drama", "Fantasy"], score: 9.3 },
  { id: 9253, title: "Steins;Gate", genres: ["Drama", "Sci-Fi", "Suspense"], themes: ["Time Travel"], score: 9.0 },
  { id: 1575, title: "Code Geass", genres: ["Action", "Award Winning", "Drama", "Sci-Fi"], themes: ["Mecha", "Military"], score: 8.7 },
  { id: 31240, title: "Re:Zero kara Hajimeru Isekai Seikatsu", genres: ["Drama", "Fantasy", "Suspense"], themes: ["Isekai"], score: 8.3 },
  { id: 813, title: "Dragon Ball Z", genres: ["Action", "Adventure", "Fantasy"], themes: ["Martial Arts"], score: 8.2 },
  { id: 6702, title: "Fairy Tail", genres: ["Action", "Adventure", "Fantasy"], themes: ["Magic"], score: 7.6 },
  { id: 11757, title: "Sword Art Online", genres: ["Action", "Adventure", "Fantasy", "Romance"], themes: ["Video Game"], score: 7.2 },
  { id: 918, title: "Gintama", genres: ["Action", "Comedy", "Sci-Fi"], themes: ["Gag Humor", "Historical", "Parody"], score: 8.9 },
  { id: 30, title: "Neon Genesis Evangelion", genres: ["Action", "Avant Garde", "Drama", "Sci-Fi"], themes: ["Mecha", "Psychological"], score: 8.3 },
  { id: 52034, title: "Oshi no Ko", genres: ["Drama", "Supernatural", "Suspense"], themes: ["Reincarnation", "Showbiz"], score: 8.5 },
  { id: 33352, title: "Violet Evergarden", genres: ["Drama", "Fantasy"], score: 8.7 },
  { id: 38680, title: "Fruits Basket (2019)", genres: ["Drama", "Romance", "Supernatural"], score: 8.3 },
  { id: 2167, title: "Clannad", genres: ["Drama", "Romance", "Slice of Life"], score: 8.0 },
  { id: 19, title: "Monster", genres: ["Drama", "Mystery", "Suspense"], themes: ["Psychological"], score: 8.8 },
  { id: 457, title: "Mushishi", genres: ["Adventure", "Mystery", "Slice of Life", "Supernatural"], score: 8.6 },
];

function toDb(a: SeedAnime) {
  return {
    id: a.id,
    title: a.title,
    synopsis: `Seed metadata for ${a.title}.`,
    image: `https://cdn.myanimelist.net/images/anime/${a.id}.webp`,
    score: a.score,
    genres: a.genres,
    themes: a.themes ?? [],
    episodes: 12,
    type: "TV",
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function seed() {
  const prisma = new PrismaClient();
  try {
    const all = [...WATCHED, ...POOL];
    for (const a of all) {
      await prisma.anime.upsert({
        where: { id: a.id },
        create: toDb(a),
        update: { ...toDb(a), cachedAt: new Date() },
      });
    }
    console.log(`✔ Upserted ${all.length} anime rows (${WATCHED.length} watched + ${POOL.length} pool).`);

    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    const preferredGenres = ["Action", "Adventure", "Supernatural", "Fantasy"];
    const user = await prisma.user.upsert({
      where: { email: EMAIL },
      update: {},
      create: {
        email: EMAIL,
        name: NAME,
        passwordHash,
        provider: "local",
        preferences: {
          create: {
            preferredGenres,
            genreScores: { Action: 6, Adventure: 4, Supernatural: 3, Fantasy: 3 },
          },
        },
      },
    });
    console.log(`✔ Test user ready: ${EMAIL} (id=${user.id})`);

    // Reset prior favorites/history so re-seeding is idempotent.
    await prisma.favorite.deleteMany({ where: { userId: user.id } });
    await prisma.watchHistory.deleteMany({ where: { userId: user.id } });

    for (const id of FAVORITE_IDS) {
      await prisma.favorite.create({ data: { userId: user.id, animeId: id } });
    }
    console.log(`✔ Created ${FAVORITE_IDS.length} favorites.`);

    // Sequential creates (oldest → newest) so updatedAt is monotonic and K-On!
    // ends up as the most recently watched (SmartFeeds anchor).
    for (const a of WATCHED) {
      await prisma.watchHistory.create({
        data: {
          userId: user.id,
          animeId: a.id,
          episodeId: `${a.id}-ep1`,
          episodeNumber: 1,
          episodeTitle: "Episode 1",
          progress: 1440,
          duration: 1440,
        },
      });
      await sleep(45);
    }
    console.log(`✔ Created ${WATCHED.length} watch-history entries (anchor = ${WATCHED[WATCHED.length - 1].title}).`);
    console.log("\nSeed complete. Run: npx ts-node scripts/taste-test.ts validate");
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanup() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (!user) {
      console.log(`No test user found (${EMAIL}). Nothing to clean up.`);
      return;
    }
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`✔ Deleted test user ${EMAIL} and all cascaded rows.`);
  } finally {
    await prisma.$disconnect();
  }
}

function topReason(reasons: Array<{ label: string }> | undefined) {
  return reasons && reasons.length > 0 ? reasons[0].label : "—";
}

async function validate() {
  const { NestFactory } = await import("@nestjs/core");
  const { AppModule } = await import("../src/app.module");
  const { RecommendationEngineService } = await import(
    "../src/modules/recommendation/recommendation.service"
  );
  const { SmartFeedEngineService } = await import(
    "../src/modules/recommendation/smart-feed-engine.service"
  );
  const { PrismaService } = await import("../src/prisma/prisma.service");

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "warn", "error"],
  });
  try {
    const prisma = app.get(PrismaService, { strict: false });
    const engine = app.get(RecommendationEngineService, { strict: false });
    const smart = app.get(SmartFeedEngineService, { strict: false });

    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (!user) {
      console.error(`Test user not found. Run 'seed' first.`);
      return;
    }

    const [forYou, taste, feeds] = await Promise.all([
      engine.getForUser(user.id),
      engine.getTasteForUser(user.id),
      smart.getFeedsForUser(user.id),
    ]);

    console.log("\n=== FOR YOU (top 10) ===");
    console.table(
      forYou.slice(0, 10).map((r, i) => ({
        "#": i + 1,
        malId: r.malId,
        title: r.title,
        genres: (r.genres ?? []).slice(0, 3).join(", "),
        reason: topReason(r.reasons),
      })),
    );

    console.log("\n=== TASTE BASED (top 10) ===");
    console.table(
      taste.slice(0, 10).map((r, i) => ({
        "#": i + 1,
        malId: r.malId,
        title: r.title,
        genres: (r.genres ?? []).slice(0, 3).join(", "),
        reason: topReason(r.reasons),
      })),
    );

    console.log("\n=== SMART FEEDS ===");
    if (feeds.length === 0) {
      console.log("(no sections)");
    }
    for (const section of feeds) {
      console.log(
        `\n▶ ${section.title}  [source: ${section.source?.title ?? "—"}]`,
      );
      console.table(
        section.items.slice(0, 8).map((r, i) => ({
          "#": i + 1,
          title: r.title,
          reason: topReason(r.reasons),
        })),
      );
    }
    console.log("");
  } finally {
    await app.close();
  }
}

async function main() {
  const mode = process.argv[2];
  switch (mode) {
    case "seed":
      await seed();
      break;
    case "validate":
      await validate();
      break;
    case "cleanup":
      await cleanup();
      break;
    default:
      console.log("Usage: npx ts-node scripts/taste-test.ts <seed|validate|cleanup>");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
