const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2500;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, options);
      if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError ?? new Error("Network request failed");
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface AuthHandlers {
  getRefreshToken: () => string | null;
  onTokensRefreshed: (tokens: TokenPair) => void;
  onRefreshFailed: () => void;
}

/** Shared across all ApiClient instances — only one refresh in flight. */
let refreshPromise: Promise<TokenPair> | null = null;

/** @internal Resets in-flight refresh state between tests. */
export function resetRefreshPromiseForTests() {
  refreshPromise = null;
}

function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    typeof (err as ApiError).statusCode === "number"
  );
}

export class ApiClient {
  private accessToken: string | null = null;
  private authHandlers: AuthHandlers | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken() {
    return this.accessToken;
  }

  setAuthHandlers(handlers: AuthHandlers) {
    this.authHandlers = handlers;
  }

  private async ensureRefreshed(refreshToken: string): Promise<void> {
    if (!refreshPromise) {
      refreshPromise = this.refresh(refreshToken)
        .then((tokens) => {
          this.setAccessToken(tokens.accessToken);
          this.authHandlers?.onTokensRefreshed(tokens);
          return tokens;
        })
        .catch((err: unknown) => {
          if (isApiError(err) && err.statusCode === 401) {
            this.authHandlers?.onRefreshFailed();
          }
          throw err;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }
    await refreshPromise;
  }

  async request<T>(
    path: string,
    options: RequestInit = {},
    retried = false,
  ): Promise<T> {
    const hadAccessToken = Boolean(this.accessToken);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const res = await fetchWithRetry(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const error = {
        message: body.message ?? res.statusText,
        statusCode: res.status,
      } satisfies ApiError;

      if (
        res.status === 401 &&
        !retried &&
        !path.startsWith("/auth/") &&
        hadAccessToken &&
        this.authHandlers
      ) {
        const refreshToken = this.authHandlers.getRefreshToken();
        if (refreshToken) {
          try {
            await this.ensureRefreshed(refreshToken);
            return this.request<T>(path, options, true);
          } catch {
            throw error;
          }
        }
      }

      throw error;
    }

    return res.json() as Promise<T>;
  }

  // --- Auth ---
  register(data: { name: string; email: string; password: string }) {
    return this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  login(data: { email: string; password: string }) {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  googleLogin(idToken: string) {
    return this.request<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
  }

  refresh(refreshToken: string) {
    return this.request<TokenPair>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  logout(refreshToken: string) {
    return this.request<{ success: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  // --- User ---
  getProfile() {
    return this.request<UserProfile>("/user/profile");
  }

  updateProfile(data: { name?: string; avatar?: string | null; preferredGenres?: string[] }) {
    return this.request<UserProfile>("/user/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // --- Favorites ---
  addFavorite(animeId: number) {
    return this.request("/favorites", {
      method: "POST",
      body: JSON.stringify({ animeId }),
    });
  }

  removeFavorite(animeId: number) {
    return this.request(`/favorites/${animeId}`, { method: "DELETE" });
  }

  getFavorites(page = 1) {
    return this.request<Paginated<AnimeSummaryDto>>(`/favorites?page=${page}`);
  }

  // --- History ---
  recordHistory(data: HistoryPayload) {
    return this.request("/history", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getHistory(page = 1) {
    return this.request<Paginated<HistoryEntryDto>>(`/history?page=${page}`);
  }

  getContinueWatching() {
    return this.request<HistoryEntryDto[]>("/history/continue");
  }

  // --- Library ---
  upsertLibrary(animeId: number, list: "watching" | "completed" | "planned") {
    return this.request("/library", {
      method: "POST",
      body: JSON.stringify({ animeId, list }),
    });
  }

  removeLibrary(animeId: number) {
    return this.request(`/library/${animeId}`, { method: "DELETE" });
  }

  getLibrary(page = 1, list?: string) {
    const params = new URLSearchParams({ page: String(page) });
    if (list) params.set("list", list);
    return this.request<Paginated<LibraryEntryDto>>(`/library?${params}`);
  }

  // --- Recommendations ---
  getRecommendations(userId: string) {
    return this.request<AnimeSummaryDto[]>(`/recommendations/${userId}`);
  }

  // --- Anime (public) ---
  getTrending() {
    return this.request<AnimeSummaryDto[]>("/anime/trending");
  }

  health() {
    return this.request<{ status: string }>("/health");
  }
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile extends AuthUser {
  preferences?: {
    preferredGenres: string[];
    genreScores: Record<string, number>;
    totalWatchTime: number;
  };
  _count?: { favorites: number; watchHistory: number };
}

export interface AnimeSummaryDto {
  id: string;
  malId: number;
  title: string;
  titleEnglish?: string;
  description: string;
  image: string;
  banner: string;
  rating: number;
  genres: string[];
  themes?: string[];
  episodeCount: number;
  year?: number;
  season?: string;
  source: string;
}

export interface HistoryPayload {
  animeId: number;
  episodeId: string;
  episodeNumber: number;
  episodeTitle: string;
  progress: number;
  duration: number;
}

export interface HistoryEntryDto {
  animeId: string;
  episodeId: string;
  animeTitle: string;
  animeImage: string;
  episodeNumber: number;
  episodeTitle: string;
  progress: number;
  duration: number;
  updatedAt: number;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface LibraryEntryDto {
  list: "watching" | "completed" | "planned";
  anime: AnimeSummaryDto;
  updatedAt: number;
}

export const apiClient = new ApiClient();
