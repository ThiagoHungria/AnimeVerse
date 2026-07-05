/** Format a 0-10 rating to a single decimal string (e.g. "8.7"). */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/** Format seconds as "mm:ss" or "h:mm:ss". */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** Progress as a 0-100 percentage, clamped. */
export function progressPercent(progress: number, duration: number): number {
  if (!duration) return 0;
  return Math.min(100, Math.max(0, Math.round((progress / duration) * 100)));
}

/** Relative time like "2h ago" from a timestamp. */
export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;
  const months = Math.floor(days / 30);
  return `${months} mês(es) atrás`;
}
