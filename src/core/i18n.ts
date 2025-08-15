export function t(key?: string, fallback?: string): string {
  if (!key) return fallback ?? "";
  try {
    return (globalThis as any).game?.i18n?.localize?.(key) ?? fallback ?? key;
  } catch {
    return fallback ?? key;
  }
}
