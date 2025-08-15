import { MODULE_ID } from "@/utils/constants";

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_BADGE: Record<Level, string> = {
  debug: "background:#475569;color:#fff;padding:2px 6px;border-radius:6px 0 0 6px",
  info: "background:#2563eb;color:#fff;padding:2px 6px;border-radius:6px 0 0 6px",
  warn: "background:#ea580c;color:#fff;padding:2px 6px;border-radius:6px 0 0 6px",
  error: "background:#4dc2626;color:#fff;padding:2px 6px;border-radius:6px 0 0 6px",
};

const NAME_BADGE =
  "background:#0f172a;color:#fff;padding:2px 6px;border-radius:0 6px 6px 0;margin-right:6px;";

const DEBUG_KEY = `${MODULE_ID}:debug`;
let _debugEnabled = ((): boolean => {
  try {
    return localStorage.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
})();

const setDebugEnabled = (v: boolean) => {
  _debugEnabled = v;
  try {
    localStorage.setItem(DEBUG_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
};

const out = (level: Level, first: unknown, ...rest: unknown[]) => {
  if (level === "debug" && !_debugEnabled) return;
  const fn = console[level] ?? console.log;
  fn(`%c${level.toUpperCase()}%c${MODULE_ID}`, LEVEL_BADGE[level], NAME_BADGE, first, ...rest);
};

const tag = (level: Level) => {
  return (strings: TemplateStringsArray, ...expr: unknown[]) => {
    const msg = strings.reduce(
      (acc, s, i) => acc + s + (i < expr.length ? String(expr[i]) : ""),
      ""
    );
    out(level, msg);
  };
};

export const log = {
  setDebug: setDebugEnabled,
  isDebug: () => _debugEnabled,

  debug: (first: unknown, ...rest: unknown[]) => out("debug", first, ...rest),
  info: (first: unknown, ...rest: unknown[]) => out("info", first, ...rest),
  warn: (first: unknown, ...rest: unknown[]) => out("warn", first, ...rest),
  error: (first: unknown, ...rest: unknown[]) => out("error", first, ...rest),

  group(label: string) {
    console.group?.(`%c${MODULE_ID}%c ${label}`, NAME_BADGE, "");
  },

  groupEnd() {
    console.groupEnd?.();
  },

  d: tag("debug"),
  i: tag("info"),
  w: tag("warn"),
  e: tag("error"),
};

export default log;
