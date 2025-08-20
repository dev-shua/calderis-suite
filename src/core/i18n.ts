/* v13 — helpers i18n safe */
export function t(key: string, fallback?: string, vars?: Record<string, string | number>): string {
  const i18n: any = (globalThis as any).game?.i18n;
  let s = "";

  if (i18n?.has?.(key)) {
    s = String(i18n.localize(key) ?? "");
  } else if (i18n?.localize) {
    const loc = String(i18n.localize(key) ?? "");
    s = loc && loc !== key && !/^\[.+\]$/.test(loc) ? loc : "";
  }

  if (!s) s = fallback ?? key;
  if (vars && s) s = interpolateVars(s, vars);
  return s;
}

function interpolateVars(s: string, vars: Record<string, string | number>): string {
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`\\{${escapeRegExp(k)}\\}`, "g"), String(v));
  }
  return s;
}

function escapeRegExp(str: string): string {
  // échappe tous les métacaractères RegExp
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function tf(key: string, data?: Record<string, unknown>): string {
  try {
    const v = game.i18n.format(key, data ?? {});
    return v && v !== key ? v : key;
  } catch {
    return key;
  }
}

export function thas(key: string): boolean {
  try {
    return game.i18n.has(key);
  } catch {
    return false;
  }
}
