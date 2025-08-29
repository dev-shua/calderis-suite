import { MODULE_ID } from "@/utils/constants";
import { PANEL_ID } from "../app";
import type { DockPanel } from "../view";
import log from "@/utils/logger";

import { TOKENVIEW_PRESETS } from "@/features/token-view/presets";
import {
  applyPreset as applyPresetToToken,
  revert as revertToken,
} from "@/features/token-view/service";
import { t } from "@/core/i18n";

/** Si true, à chaque nouvelle sélection on supprime immédiatement les tokens qui ne passent pas les filtres */
const ENFORCE_FILTERS_ON_SELECT = false as const;

type FilterState = { pc: boolean; npc: boolean; hostile: boolean };
const filters: FilterState = { pc: true, npc: true, hostile: true };

const isTokensPanelOpen = () => !!document.querySelector(`#${PANEL_ID} [data-panel="tokens"]`);

const getControlledTokens = (): any[] => ((canvas as any)?.tokens?.controlled ?? []) as any[];

const isPC = (tok: any): boolean => {
  const a = tok?.document?.actor;
  return !!(a && a.type === "character" && a.hasPlayerOwner);
};

const isHostile = (tok: any): boolean => {
  const disp = tok?.document?.disposition;
  const HOSTILE = (globalThis as any).CONST?.TOKEN_DISPOSITIONS?.HOSTILE ?? -1;
  return disp === HOSTILE;
};

const applyFiltersOnCurrentSelection = () => {
  const ids = getControlledTokens()
    .filter(tokenPassesFilters)
    .map((token) => token.id as string);
  setSelectionByIds(ids);
};

function tokenPassesFilters(tok: any): boolean {
  const pc = isPC(tok);
  const npc = !pc;
  const hostile = isHostile(tok);
  if (!filters.pc && pc) return false;
  if (!filters.npc && npc) return false;
  if (!filters.hostile && hostile) return false;
  return true;
}

/** Baseline = sélection au moment où le panel s'ouvre */
const baselineIds = new Set<string>();

/** Anti-boucle : ignore les hooks provoqués par nos propres .control()/.release() */
let internalSelectionSync = false;

function setSelectionByIds(ids: string[]) {
  internalSelectionSync = true;
  try {
    (canvas as any).tokens?.releaseAll();
    ids.forEach((id) => (canvas as any).tokens?.get(id)?.control({ releaseOthers: false }));
  } finally {
    internalSelectionSync = false;
  }
}

const resetFilterAndBaseline = () => {
  filters.pc = true;
  filters.npc = true;
  filters.hostile = true;
  baselineIds.clear();
};

function selectOnlyPC() {
  const ids = getControlledTokens()
    .filter(isPC)
    .map((t) => t.id as string);
  setSelectionByIds(ids);
}

function excludeToken(tokenId: string) {
  (canvas as any).tokens?.get(tokenId)?.release?.();
}

/** Rendu léger : cartes + compteur + état visuel filtres */
function renderSelection(root: HTMLElement) {
  const sel = getControlledTokens();
  const emptyMsg = root.querySelector<HTMLElement>(".cs-empty");
  if (emptyMsg) {
    if (getControlledTokens().length > 0) emptyMsg.style.display = "none";
    else emptyMsg.style.display = "";
  }

  const cnt = root.querySelector<HTMLElement>('[data-el="sel-count"]');
  if (cnt) cnt.textContent = String(sel.length);

  const wrap = root.querySelector<HTMLElement>('[data-el="sel-cards"]');
  if (wrap) {
    const rows = sel.map((t) => {
      const img = t?.document?.texture?.src ?? t?.texture?.src ?? "";
      const pc = isPC(t);
      const hostile = isHostile(t);
      const hostileTag = hostile ? game.i18n.localize?.("CS.Hostile") || "Hostile" : "";
      return `
        <div class="cs-card" data-token-id="${t.id}">
          <img class="cs-card__img" alt="" src="${img}"/>
          <div class="cs-card__body">
            <div class="cs-card__title">${foundry.utils.escapeHTML(t.name ?? "—")}</div>
            <div class="cs-card__tags">${pc ? "PC" : "PNJ"}${
              hostile ? " · " + hostileTag : ""
            }</div>
          </div>
          <button class="cs-card__x" data-action="exclude-token" data-token-id="${t.id}" title="${
            game.i18n.localize?.("CS.Remove") || "Retirer"
          }">✕</button>
        </div>`;
    });
    wrap.innerHTML = rows.join("");
  }

  (root.querySelector('[data-filter="pc"]') as HTMLElement)?.setAttribute(
    "aria-pressed",
    String(!!filters.pc)
  );
  (root.querySelector('[data-filter="npc"]') as HTMLElement)?.setAttribute(
    "aria-pressed",
    String(!!filters.npc)
  );
  (root.querySelector('[data-filter="hostile"]') as HTMLElement)?.setAttribute(
    "aria-pressed",
    String(!!filters.hostile)
  );
}

function initialSelectionItems() {
  return getControlledTokens().map((t) => ({
    id: t.id as string,
    name: String(t.name ?? "—"),
    img: (t?.document?.texture?.src ?? t?.texture?.src ?? "") as string,
    isPC: isPC(t),
    isHostile: isHostile(t),
  }));
}

/** Helpers presets (ton schéma utilise `type`) */
function isVisionPreset(p: any) {
  return p?.type === "sight" || p?.type === "both";
}
function isLightPreset(p: any) {
  return p?.type === "light" || p?.type === "both";
}

export const tokensPanel: DockPanel = {
  id: "tokens",
  template: `modules/${MODULE_ID}/templates/core/tokens.hbs`,

  async getContext() {
    const all = Object.values(TOKENVIEW_PRESETS) as any[];

    const visionPresets = all.filter(isVisionPreset).map((p) => ({
      id: p.id,
      label: t(p.label) ?? p.id,
    }));

    const lightPresets = all.filter(isLightPreset).map((p) => ({
      id: p.id,
      label: t(p.label) ?? p.id,
    }));

    const selection = initialSelectionItems();
    return {
      count: selection.length,
      selection,
      filters,
      visionPresets,
      lightPresets,
      hasSelection: selection.length > 0,
    };
  },

  bind(root: HTMLElement) {
    // Snapshot baseline au moment de l'ouverture
    baselineIds.clear();
    getControlledTokens().forEach((t) => baselineIds.add(t.id as string));

    renderSelection(root);

    // Throttle (évite spam en drag-box)
    let raf = 0;
    const scheduleRender = () => {
      if (!isTokensPanelOpen()) return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        renderSelection(root);
      });
    };

    const hookId = Hooks.on("controlToken", () => {
      if (internalSelectionSync) return;

      const current = getControlledTokens();
      if (current.length === 0) {
        resetFilterAndBaseline();
      } else {
        if (baselineIds.size === 0) {
          baselineIds.clear();
          current.forEach((token) => baselineIds.add(token.id as string));
        }

        if (ENFORCE_FILTERS_ON_SELECT) {
          const ids = current.filter(tokenPassesFilters).map((token) => token.id as string);
          setSelectionByIds(ids);
        }
      }

      scheduleRender();
    });

    root.addEventListener("click", async (ev) => {
      const el = (ev.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (!el) return;
      const action = el.dataset.action;

      if (action === "toggle-filter") {
        const key = el.dataset.filter as keyof FilterState;
        if (!key) return;
        filters[key] = !filters[key];
        applyFiltersOnCurrentSelection();
        scheduleRender();
        return;
      }

      if (action === "select-only-pc") {
        selectOnlyPC();
        scheduleRender();
        return;
      }

      if (action === "select-all-by-filters") {
        applyFiltersOnCurrentSelection();
        scheduleRender();
        return;
      }

      if (action === "exclude-token") {
        const tokenId = el.dataset.tokenId!;
        excludeToken(tokenId);
        scheduleRender();
        return;
      }

      if (action === "toggle-section") {
        const target = el.dataset.target as "vision" | "light";
        const box = root.querySelector<HTMLElement>(`[data-el="${target}-grid"]`);
        if (box) box.toggleAttribute("hidden");
        return;
      }

      if (action === "apply") {
        const presetId = el.dataset.preset!;
        const preset = (TOKENVIEW_PRESETS as any)[presetId];
        if (!preset) {
          ui.notifications?.warn?.(`Preset inconnu: ${presetId}`);
          return;
        }
        const docs = getControlledTokens().map((t) => t.document);
        for (const d of docs) await applyPresetToToken(d, preset);
        ui.notifications?.info?.(`${docs.length} token(s) mis à jour.`);
        return;
      }

      if (action === "reset") {
        const slot = el.dataset.slot as "sight" | "light";
        const docs = getControlledTokens().map((t) => t.document);
        for (const d of docs) await revertToken(d, slot);
        ui.notifications?.info?.(`${docs.length} token(s) restauré(s).`);
        return;
      }
    });

    log.info("[Dock/Tokens] panel ready");

    // (Optionnel) expose un unbind si tu gères le changement d’onglet proprement :
    // return () => Hooks.off("controlToken", hookId);
  },
};
