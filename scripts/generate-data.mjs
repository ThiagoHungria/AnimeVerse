/**
 * Deterministic mock-data generator for AnimeVerse.
 * Produces src/data/animes.json with realistic-looking animes + episodes.
 * Run with: node scripts/generate-data.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/animes.json");

// Public sample videos so the player works out of the box.
const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  // HLS stream to exercise the hls.js path.
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
];

const poster = (seed) => `https://picsum.photos/seed/${seed}/400/600`;
const banner = (seed) => `https://picsum.photos/seed/${seed}/1280/520`;
const thumb = (seed) => `https://picsum.photos/seed/${seed}/320/180`;

const ANIMES = [
  {
    id: "celestial-blades",
    title: "Celestial Blades",
    genres: ["Ação", "Fantasia", "Aventura"],
    rating: 9.1,
    year: 2024,
    status: "ongoing",
    studio: "Studio Aurora",
    episodes: 12,
    description:
      "Em um reino onde lâminas guardam fragmentos de estrelas caídas, a jovem espadachim Rin descobre que sua arma esconde o poder de reescrever o destino. Caçada por uma ordem secreta, ela precisa dominar a Lâmina Celeste antes que o céu desabe sobre o mundo.",
  },
  {
    id: "neon-syndicate",
    title: "Neon Syndicate",
    genres: ["Cyberpunk", "Ação", "Suspense"],
    rating: 8.8,
    year: 2023,
    status: "completed",
    studio: "Pixel Forge",
    episodes: 10,
    description:
      "Nas profundezas da megacidade de Akihabara 2099, um hacker fugitivo e uma androide com memórias proibidas se unem para derrubar o sindicato que controla a rede neural global. Cada escolha vale uma vida — ou a verdade.",
  },
  {
    id: "spirit-garden",
    title: "Spirit Garden",
    genres: ["Slice of Life", "Sobrenatural", "Drama"],
    rating: 8.5,
    year: 2022,
    status: "completed",
    studio: "Studio Komorebi",
    episodes: 13,
    description:
      "Após herdar uma estranha estufa de sua avó, Haru passa a enxergar os espíritos das plantas. Entre chás quentes e tardes preguiçosas, ele aprende que cuidar de algo pequeno pode curar feridas que ninguém mais vê.",
  },
  {
    id: "iron-vanguard",
    title: "Iron Vanguard",
    genres: ["Mecha", "Ação", "Guerra"],
    rating: 8.9,
    year: 2024,
    status: "ongoing",
    studio: "Mecha Dynamics",
    episodes: 11,
    description:
      "A última linha de defesa da humanidade são os Vanguardas: mechas pilotados por adolescentes sincronizados com IAs de combate. Quando o piloto número zero retorna do exílio, velhos segredos da guerra ameaçam quebrar a frágil aliança.",
  },
  {
    id: "tidecaller",
    title: "Tidecaller",
    genres: ["Aventura", "Fantasia", "Romance"],
    rating: 8.3,
    year: 2021,
    status: "completed",
    studio: "BlueWave Animation",
    episodes: 9,
    description:
      "Uma garota capaz de ouvir a voz do oceano embarca em uma jornada para encontrar a ilha que aparece apenas uma vez por geração. No caminho, ela enfrenta tempestades, piratas e o próprio coração indeciso.",
  },
  {
    id: "midnight-ramen",
    title: "Midnight Ramen",
    genres: ["Comédia", "Slice of Life", "Gastronomia"],
    rating: 8.0,
    year: 2023,
    status: "ongoing",
    studio: "Studio Komorebi",
    episodes: 8,
    description:
      "Uma barraca de ramen que só abre à meia-noite recebe clientes com histórias improváveis. Entre tigelas fumegantes, o misterioso chef serve mais do que comida: ele serve segundas chances.",
  },
  {
    id: "shadow-academy",
    title: "Shadow Academy",
    genres: ["Sobrenatural", "Ação", "Mistério"],
    rating: 8.7,
    year: 2024,
    status: "ongoing",
    studio: "Eclipse Works",
    episodes: 12,
    description:
      "Em uma academia escondida entre dimensões, estudantes treinam para conter criaturas que escapam dos sonhos humanos. Quando um novato manifesta uma sombra que ninguém consegue classificar, a escola inteira entra em alerta.",
  },
  {
    id: "stellar-melody",
    title: "Stellar Melody",
    genres: ["Música", "Drama", "Romance"],
    rating: 8.4,
    year: 2022,
    status: "completed",
    studio: "Aurora Sound",
    episodes: 10,
    description:
      "Uma banda escolar à beira do fim ganha uma última chance quando uma transferida com ouvido absoluto entra em cena. Juntos, eles transformam o medo do palco na melodia que pode mudar suas vidas.",
  },
  {
    id: "frostfang-saga",
    title: "Frostfang Saga",
    genres: ["Fantasia", "Ação", "Aventura"],
    rating: 9.0,
    year: 2023,
    status: "ongoing",
    studio: "Studio Aurora",
    episodes: 14,
    description:
      "No norte congelado, clãs de caçadores enfrentam lobos colossais que carregam o inverno em suas presas. Uma jovem caçadora jura proteger sua vila — mesmo que isso signifique domar a fera que matou seu pai.",
  },
  {
    id: "quantum-detective",
    title: "Quantum Detective",
    genres: ["Mistério", "Suspense", "Ficção Científica"],
    rating: 8.6,
    year: 2024,
    status: "ongoing",
    studio: "Pixel Forge",
    episodes: 11,
    description:
      "Um detetive capaz de revisitar os últimos cinco minutos de qualquer cena resolve crimes impossíveis. Mas quando ele começa a aparecer nas próprias investigações, a linha entre culpado e investigador se dissolve.",
  },
  {
    id: "petal-storm",
    title: "Petal Storm",
    genres: ["Romance", "Drama", "Slice of Life"],
    rating: 8.2,
    year: 2021,
    status: "completed",
    studio: "Studio Komorebi",
    episodes: 12,
    description:
      "Sob as cerejeiras de uma cidade litorânea, dois jovens prometem se reencontrar quando as pétalas voltarem a cair. Anos depois, o destino testa se promessas de infância resistem ao tempo.",
  },
  {
    id: "abyss-protocol",
    title: "Abyss Protocol",
    genres: ["Terror", "Suspense", "Ficção Científica"],
    rating: 8.5,
    year: 2024,
    status: "ongoing",
    studio: "Eclipse Works",
    episodes: 9,
    description:
      "Uma estação de pesquisa no fundo do oceano perde contato com a superfície. A equipe de resgate descobre que algo lá embaixo aprendeu a imitar vozes humanas — e está com fome de companhia.",
  },
];

const EPISODE_TITLES = [
  "O Começo",
  "Ecos do Passado",
  "A Promessa",
  "Tempestade Iminente",
  "Sob a Lua",
  "O Despertar",
  "Linhas Cruzadas",
  "Coração de Aço",
  "O Preço da Verdade",
  "Renascer",
  "Última Chance",
  "O Confronto",
  "Além do Horizonte",
  "Recomeço",
];

function buildEpisodes(animeId, count, seedBase) {
  return Array.from({ length: count }, (_, i) => {
    const number = i + 1;
    return {
      id: `${animeId}-ep-${number}`,
      number,
      title: EPISODE_TITLES[i % EPISODE_TITLES.length],
      videoUrl: SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length],
      thumbnail: thumb(`${seedBase}-ep-${number}`),
      duration: 1440, // ~24 min, typical anime episode
    };
  });
}

const data = ANIMES.map((a) => ({
  id: a.id,
  title: a.title,
  description: a.description,
  image: poster(`${a.id}-poster`),
  banner: banner(`${a.id}-banner`),
  rating: a.rating,
  genres: a.genres,
  year: a.year,
  status: a.status,
  studio: a.studio,
  episodes: buildEpisodes(a.id, a.episodes, a.id),
}));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Wrote ${data.length} animes to ${OUT}`);
