import { PARTY_FIELDS, validateKeys } from "../catalog";
import { Settings } from "@/core/settings";
import { calculPercentage, libStatToIcon } from "@/utils/functions";
import { t } from "@/core/i18n";
import { MODULE_ID } from "@/utils/constants";
import { DockPanel } from "../view";
import { openDockPartyConfig } from "../config-app";

type PartyCard = {
  id: string;
  name: string;
  img: string;
  hp?: { actual: string; total: string; percent: number; class: string };
  inspi?: string;
  stats: Array<{ key: string; label: string; icon: string; value: string }>;
};

const getHPColorByPercent = (prc: number): string => {
  if (prc <= 25) return "critical";
  if (prc <= 50) return "wounded";
  if (prc <= 75) return "scratch";
  return "healthy";
};

const buildPartyCard = (actor: DnD5e.Actor5e): PartyCard => {
  const selected = validateKeys(Settings.get("dmDock.party.fields") as string[] | undefined);
  const selectedStats = PARTY_FIELDS.filter((field) => selected.includes(field.key));

  const result: any = {};
  selectedStats.forEach((s) => {
    const stat = s.read(actor);
    const key = s.key;
    if (key === "hp") {
      const pv = (stat as string).split("/");
      const pct = calculPercentage(Number(pv[0] ?? 0), Number(pv[1] ?? 0));
      result.hp = {
        actual: pv[0],
        total: pv[1],
        percent: pct,
        class: getHPColorByPercent(pct),
      };
    } else if (key === "inspi" && stat === "true") {
      result.inspi = stat as string;
    }
  });

  const filteredStats = selectedStats
    .filter((stat) => stat.key !== "hp" && stat.key !== "inspi")
    .map((stat) => ({
      key: stat.key,
      label: t(stat.label),
      icon: libStatToIcon(stat.key),
      value: stat.read(actor),
    }));

  const card: PartyCard = {
    id: actor.id ?? "",
    name: actor.name ?? "—",
    img: (actor.img as string) ?? actor?.prototypeToken?.texture?.src ?? "",
    ...result,
    stats: filteredStats,
  };
  return card;
};

export const partyPanel: DockPanel = {
  id: "party",
  template: `modules/${MODULE_ID}/templates/core/party.hbs`,

  async getContext() {
    const pcs = ((game as any)?.actors?.contents ?? [])
      .filter((a: DnD5e.Actor5e) => a?.type === "character" && a?.hasPlayerOwner)
      .map((a: DnD5e.Actor5e) => buildPartyCard(a));

    return { pcs };
  },

  bind(root: HTMLElement) {
    root.addEventListener("click", (event) => {
      const element = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (!element) return;

      const action = element.dataset.action;

      if (action === "open-sheet") {
        const btn = (event.target as HTMLElement)?.closest<HTMLButtonElement>(".pj-card");
        if (!btn) return;
        (game as any)?.actors?.get?.(btn.dataset.actorId)?.sheet?.render?.(true);
      }

      if (action === "open-party-config") {
        openDockPartyConfig();
        return;
      }
    });
  },
};
