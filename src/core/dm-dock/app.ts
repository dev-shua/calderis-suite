import { Settings } from "@/core/settings"; // ou adapte à ton chemin réel
import { t } from "@/core/i18n";
import { MODULE_ID } from "@/utils/constants";
import { setDockTop } from "./layout";

export const ROOT_ID = "calderis-dm-dock-root";
export const PANEL_ID = "calderis-dm-dock";
export const RAIL_ID = "calderis-dm-dock-rail";

/** Calcule le top sous la barre d’outils FVTT v13 */
function baselineTop(): number {
  const nav = document.getElementById("controls");
  if (!nav) return 104;
  const r = nav.getBoundingClientRect();
  return Math.round(r.bottom + 8);
}

/** Crée root + rail si absents. Rien d’autre. */
export function initDock(): void {
  if (!Settings.get?.("dmDock.enabled")) return;

  // Root couvrant (non bloquant)
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    root.setAttribute("aria-hidden", "true");
    document.body.appendChild(root);
  }

  // Rail (colonne d’icônes)
  let rail = document.getElementById(RAIL_ID);
  if (!rail) {
    rail = document.createElement("nav");
    rail.id = RAIL_ID;
    rail.className = "dm-dock-rail";
    const top = Settings.get?.("dmDock.positionY") ?? baselineTop();
    rail.style.top = `${top}px`;
    rail.setAttribute("aria-label", t("CS.DMDock.Rail"));
    // Icônes par défaut (tu ajusteras)
    rail.innerHTML = `
      <button class="dock-drag" aria-label="${t("CS.DMDock.Rail")}" title="${t("CS.DMDock.Rail")}">⋮</button>
      <button class="dock-tool is-active" data-tool="party" aria-pressed="true" title="${t("CS.DMDock.Tool.Party")}"><i class="fas fa-users"></i></button>
      <button class="dock-tool" data-tool="tokens" aria-pressed="false" title="${t("CS.DMDock.Tool.Tokens")}"><i class="fas fa-chess-pawn"></i></button>
      <button class="dock-tool" data-tool="tools" aria-pressed="false" title="${t("CS.DMDock.Tool.Tools")}"><i class="fas fa-tools"></i></button>
    `;
    root.appendChild(rail);
  }

  // Panneau (conteneur du contenu, rendu par view.ts)
  if (!document.getElementById(PANEL_ID)) {
    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.className = "dm-dock-panel";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", t("CS.DMDock.Title"));
    root.appendChild(panel);
  }

  const top = Settings.get?.("dmDock.positionY") ?? baselineTop();
  setDockTop(top);
}
