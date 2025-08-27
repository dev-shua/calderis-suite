import log from "@/utils/logger";
import { registerAllConfig, Settings } from "@/core/settings";
import { enableDistanceFeature } from "@/features/distance";
import { readyCurrencyFeature } from "./features/currency";
import { setupInlineFeatureSettings } from "./core/settings-ux";
import { initDock } from "./core/dm-dock/app";
import { dockController } from "./core/dm-dock/controller";
import { LAYOUT, TOOL_TEMPLATES } from "./core/dm-dock/view";
import { wireDockPartyConfigClicks } from "./core/dm-dock/config-app";

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

Hooks.once("init", async () => {
  log.info("init");
  const settings = game.settings;
  if (!settings) return;

  registerAllConfig(settings);
  setupInlineFeatureSettings();

  const api = (foundry as any).applications.handlebars;
  await api.loadTemplates([LAYOUT, ...Object.values(TOOL_TEMPLATES)]);
});

Hooks.once("ready", async () => {
  log.info("ready");

  const NS = `module.calderis-suite`; // vérifie que c’est bien ton MODULE_ID
  const s = (game as any).socket;

  if (!s) return;
  // on enlève d'éventuels listeners fantômes puis on (re)branche
  try {
    s.off(NS);
  } catch {}
  s.on(NS, (msg: any) => {});

  if (game.user.isGM) {
    initDock();
    await dockController.init();
    wireDockPartyConfigClicks();
  }
  if (Settings.get("distance.enabled")) enableDistanceFeature();
  readyCurrencyFeature();
});
