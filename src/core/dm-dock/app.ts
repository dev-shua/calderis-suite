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

export const setRailActiveTool = (tool: string): void => {
  const rail = document.getElementById(RAIL_ID);
  if (!rail) return;
  rail.querySelectorAll<HTMLButtonElement>(".dock-tool").forEach((btn) => {
    const is = btn.dataset.tool === tool;
    btn.classList.toggle("is-active", is);
    btn.setAttribute("aria-pressed", is ? "true" : "false");
  });
};

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

    const savedTool = (Settings.get?.("dmDock.tool") as string) ?? "party";
    const btn = (tool: string, icon: string, titleKey: string) => {
      const active = tool === savedTool;
      const cls = `dock-tool${active ? " is-active" : ""}`;
      const pressed = active ? "true" : "false";
      const title = t(titleKey);
      return `<button class="${cls}" data-tool="${tool}" aria-pressed="${pressed}" title="${title}"><i class="${icon}"></i></button>`;
    };
    // Icônes par défaut (tu ajusteras)
    rail.innerHTML = `
      <button class="dock-drag" aria-label="${t("CS.DMDock.Rail")}" title="${t("CS.DMDock.Rail")}">⋮</button>
      ${btn("party", "fas fa-users", "CS.DMDock.Tool.Party")}
      ${btn("tokens", "fas fa-chess-pawn", "CS.DMDock.Tool.Tokens")}
      ${btn("tools", "fas fa-tools", "CS.DMDock.Tool.Tools")}
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
