export function normalizeUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const normalized = decodeURIComponent(trimmed).toLowerCase();
    return normalized;
  } catch {
    return null;
  }
}
