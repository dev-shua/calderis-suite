import { MODULE_ID } from "@/utils/constants";
import { PANEL_ID } from "./app";
import { setDockTop } from "./layout";
import log from "@/utils/logger";
import { openDockPartyConfig } from "./config-app";
import { PARTY_FIELDS, validateKeys } from "./catalog";
import { Settings } from "../settings";
import { calculPercentage, libStatToIcon } from "@/utils/functions";
import { t } from "../i18n";

export const LAYOUT = `modules/${MODULE_ID}/templates/core/dock.hbs`;
export const TOOL_TEMPLATES: Record<string, string> = {
  party: `modules/${MODULE_ID}/templates/core/party.hbs`,
  tokens: `modules/${MODULE_ID}/templates/core/tokens.hbs`,
  tools: `modules/${MODULE_ID}/templates/core/tools.hbs`,
};

const getHPColorByPercent = (prc: number): string => {
  if (prc <= 25) return "critical";
  if (prc <= 50) return "wounded";
  if (prc <= 75) return "scratch";
  return "healthy";
};

async function hb() {
  return (foundry as any).applications.handlebars;
}

const getFormatedParams = (actor: DnD5e.Actor5e) => {
  const selected = validateKeys(Settings.get("dmDock.party.fields") as string[] | undefined);
  const selectedStats = PARTY_FIELDS.filter((field) => selected.includes(field.key));
  let result: any = {};

  selectedStats.forEach((s) => {
    const stat = s.read(actor);
    const key = s.key;
    if (key === "hp") {
      const pv = (stat as string).split("/");
      const pct = calculPercentage(Number(pv[0]), Number(pv[1]));
      const pvToDisplay = {
        actual: pv[0],
        total: pv[1],
        percent: pct,
        class: getHPColorByPercent(pct),
      };
      result.hp = pvToDisplay;
    } else if (key === "inspi" && stat === "true") {
      result.inspi = stat as string;
    }
  });

  const fileteredStats = selectedStats
    .filter((stat) => stat.key !== "hp" && stat.key !== "inspi")
    .map((stat) => ({
      key: stat.key,
      label: t(stat.label),
      icon: libStatToIcon(stat.key),
      value: stat.read(actor),
    }));
  result.stats = fileteredStats;
  log.info(result);
  return result;
};

export async function renderDock(tool: string): Promise<void> {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  const api = await hb();

  // Compile le sous-template de l’outil (ou fallback)
  const path = TOOL_TEMPLATES[tool] ?? TOOL_TEMPLATES["party"];
  const sub = await api.getTemplate(path);
  (Handlebars as any).registerPartial("content", sub);

  const pcs = ((game as any)?.actors?.contents ?? [])
    .filter((a: DnD5e.Actor5e) => a?.type === "character" && a?.hasPlayerOwner)
    .map((a: DnD5e.Actor5e) => {
      const formatedParams = getFormatedParams(a);
      return {
        id: a.id ?? "",
        name: a.name ?? "—",
        img: a.img ?? a?.prototypeToken?.texture?.src ?? "",
        // passivePerception: a.system.skills.per.passive,
        ...formatedParams,
      };
    });

  const html = await api.renderTemplate(LAYOUT, {
    tool,
    pcs,
    title: game?.i18n?.localize?.("CS.DMDock.Title") ?? "Dock MJ",
  });
  panel.innerHTML = html;

  // Interactions propres à certains sous-templates (ex: party -> ouvrir fiche PJ)
  panel.addEventListener(
    "click",
    (ev) => {
      const element = (ev.target as HTMLElement).closest<HTMLElement>("[data-action]");
      // if (!btn) return;
      if (!element) return;

      const action = element.dataset.action;

      if (action === "open-sheet") {
        const btn = (ev.target as HTMLElement)?.closest<HTMLButtonElement>(".pj-card");
        if (!btn) return;
        (game as any)?.actors?.get?.(btn.dataset.actorId)?.sheet?.render?.(true);
      }

      if (action === "open-party-config") {
        openDockPartyConfig();
        return;
      }
    }
    // { once: true }
  );
}

export function setDockOpen(open: boolean): void {
  const root = document.getElementById("calderis-dm-dock-root");
  const panel = document.getElementById(PANEL_ID);
  if (!root || !panel) return;
  panel.classList.toggle("is-open", open);
  root.setAttribute("aria-hidden", open ? "false" : "true");
}
