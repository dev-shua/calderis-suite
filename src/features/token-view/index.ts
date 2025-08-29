import { MODULE_ID } from "@/utils/constants";
import { TOKENVIEW_PRESETS } from "./presets";
import { applyPreset, revert } from "./service";
import { getSelectionWithPrototypes } from "./utils";

export const registerTokenView = () => {
  const api = { TOKENVIEW_PRESETS, applyPreset, revert, getSelectionWithPrototypes };
  const mod = game.modules.get(MODULE_ID);
  if (mod) (mod as any).api = api;
  (globalThis as any).Calderis = { ...((globalThis as any).Calderis || {}), ...api };
};
