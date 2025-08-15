import log from "@/utils/logger";
import { registerAllConfig, Settings } from "@/core/settings";
import { enableDistanceFeature } from "./features/distance";
import { MODULE_ID } from "@/utils/constants";
import { FEATURES } from "@/core/registry";
import { moveEnabledRowToTop } from "./utils/functions";
import { elements } from "node_modules/fvtt-types/src/foundry/client/applications/_module.mjs";

if (!(Handlebars as any).helpers?.eq) {
  Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
}

Hooks.once("init", () => {
  log.info("init");
  const settings = game?.settings;
  if (!settings) return;
  registerAllConfig(settings);
});

Hooks.on("renderSettingsConfig", (_app, html) => {
  for (const f of FEATURES) {
    moveEnabledRowToTop(html, `${MODULE_ID}.${f.key}.enabled`);
  }
});

Hooks.once("ready", () => {
  log.info("ready");
  if (Settings.get("distance.enabled")) enableDistanceFeature();
});
