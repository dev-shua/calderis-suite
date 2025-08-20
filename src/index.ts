import log from "@/utils/logger";
import { registerAllConfig, Settings } from "@/core/settings";
import { enableDistanceFeature } from "@/features/distance";
import { readyCurrencyFeature } from "./features/currency";
import { setupInlineFeatureSettings } from "./core/settings-ux";

if (!(Handlebars as any).helpers?.eq) {
  Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
}
if (!(Handlebars as any).helpers?.length) {
  Handlebars.registerHelper("length", (v: unknown) => {
    if (Array.isArray(v) || typeof v === "string") return (v as any).length ?? 0;
    if (v && typeof v === "object") return Object.keys(v as any).length;
    return 0;
  });
}
if (!(Handlebars as any).helpers?.replace) {
  Handlebars.registerHelper("replace", (str: unknown, search: unknown, repl: unknown) =>
    String(str ?? "")
      .split(String(search ?? ""))
      .join(String(repl ?? ""))
  );
}

Hooks.once("init", () => {
  log.info("init");
  const settings = game.settings;
  if (!settings) return;

  registerAllConfig(settings);
  setupInlineFeatureSettings();
});

Hooks.once("ready", () => {
  log.info("ready");

  const NS = `module.calderis-suite`; // vérifie que c’est bien ton MODULE_ID
  const s = (game as any).socket;
  console.info("[Calderis][DEBUG] socket present?", !!s, "user:", (game as any).user?.id);

  if (!s) return;
  // on enlève d'éventuels listeners fantômes puis on (re)branche
  try {
    s.off(NS);
  } catch {}
  s.on(NS, (msg: any) => {
    console.info("[Calderis][DEBUG][BOOT-LISTENER] recv", msg, "me:", (game as any).user?.id);
  });

  // expose un ping manuel pour test
  (globalThis as any).CS_TEST_PING = () => {
    s.emit(NS, { type: "__ping__", from: String((game as any).user?.id ?? "") });
    console.info("[Calderis][DEBUG] ping sent");
  };

  if (Settings.get("distance.enabled")) enableDistanceFeature();
  readyCurrencyFeature();
});

Hooks.on("renderActorSheet", (app: any, html: unknown) => {
  const actor = app?.actor ?? app?.object;
  log.info("[TRACE] renderActorSheet fired for:", actor?.name ?? "<unknown>");
});
