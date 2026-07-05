/**
 * Anime Intelligence Layer — smart tagging.
 *
 * Transforms raw MAL taxonomy (genres / themes / demographics) plus statistics
 * into human, marketing-friendly categories. e.g. `Action + Shounen` becomes
 * "Alta adrenalina" + "Protagonista em evolução".
 */

/** Raw MAL label -> human tag. Covers genres, themes and demographics. */
const TAXONOMY_TAGS: Record<string, string> = {
  // Genres
  Action: "Alta adrenalina",
  Adventure: "Jornada épica",
  Comedy: "Diversão garantida",
  Drama: "Histórias emocionais",
  Fantasy: "Mundos fantásticos",
  "Sci-Fi": "Futurismo & tecnologia",
  Romance: "Romance envolvente",
  "Slice of Life": "Cotidiano relaxante",
  Mystery: "Mistérios intrigantes",
  Suspense: "Tensão constante",
  Thriller: "Tensão constante",
  Horror: "Puro suspense de terror",
  Supernatural: "Sobrenatural",
  Sports: "Espírito competitivo",
  "Avant Garde": "Experimental & ousado",
  "Award Winning": "Premiado",
  Ecchi: "Conteúdo picante",
  Gourmet: "Comida & sabor",
  // Themes
  Psychological: "Narrativas complexas",
  Military: "Batalhas estratégicas",
  "Strategy Game": "Batalhas estratégicas",
  "High Stakes Game": "Jogo de alto risco",
  "Super Power": "Poderes extraordinários",
  Mecha: "Robôs gigantes",
  Isekai: "Outro mundo (Isekai)",
  Reincarnation: "Segunda chance",
  "Time Travel": "Viagem no tempo",
  Music: "Trilha marcante",
  "Martial Arts": "Artes marciais",
  Samurai: "Espadas & honra",
  School: "Vida escolar",
  Historical: "Ambientação histórica",
  Mythology: "Mitologia & lendas",
  Space: "Aventura espacial",
  Vampire: "Criaturas da noite",
  Survival: "Sobrevivência extrema",
  Iyashikei: "Aconchegante",
  Detective: "Investigação afiada",
  Harem: "Comédia romântica",
  Gore: "Visceral & intenso",
  Parody: "Humor afiado",
  "Team Sports": "Trabalho em equipe",
  "Combat Sports": "Confrontos intensos",
  Workplace: "No mundo do trabalho",
  Medical: "Drama médico",
  Idols: "Brilho dos palcos",
  // Demographics
  Shounen: "Protagonista em evolução",
  Seinen: "Tom mais maduro",
  Shoujo: "Foco nas emoções",
  Josei: "Perspectiva adulta",
  Kids: "Para todas as idades",
};

export interface SmartTagInput {
  genres: string[];
  themes: string[];
  demographics: string[];
  rating: number;
  episodeCount: number;
  popularity?: number;
  rank?: number;
  members?: number;
  status: "ongoing" | "completed" | "upcoming" | "unknown";
  durationMinutes?: number;
}

/**
 * Build the enriched, de-duplicated smart tag list for an anime.
 * Combines taxonomy-derived tags with statistic-derived highlights.
 */
export function buildSmartTags(input: SmartTagInput): string[] {
  const tags = new Set<string>();

  // Statistic-derived highlights come first (they are the strongest signal).
  if (input.rating >= 8.5) tags.add("Aclamado pela crítica");
  if (input.rank && input.rank <= 50) tags.add("Top mundial");
  if (input.status === "ongoing") tags.add("Em lançamento");
  if (input.episodeCount > 0 && input.episodeCount <= 13) {
    tags.add("Maratonável em um dia");
  } else if (input.episodeCount >= 50) {
    tags.add("Longa jornada");
  }
  if (isHiddenGem(input)) tags.add("Joia escondida");

  // Taxonomy-derived tags.
  for (const label of [
    ...input.genres,
    ...input.themes,
    ...input.demographics,
  ]) {
    const tag = TAXONOMY_TAGS[label];
    if (tag) tags.add(tag);
  }

  return [...tags].slice(0, 6);
}

/**
 * Hidden gem heuristic: highly rated but comparatively under-discovered.
 * (Low popularity *rank* number = very popular; a high number = obscure.)
 */
export function isHiddenGem(input: {
  rating: number;
  popularity?: number;
  members?: number;
}): boolean {
  return (
    input.rating >= 7.7 &&
    ((input.popularity ?? 0) > 1200 ||
      (input.members !== undefined && input.members < 120_000))
  );
}
