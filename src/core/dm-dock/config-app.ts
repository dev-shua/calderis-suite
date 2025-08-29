import { HbAppCtor } from "@/types/foundry-v13-exports";
import { getHbAppCtor } from "../compat";
import { MODULE_ID } from "@/utils/constants";
import { t } from "../i18n";
import { FieldKey, PARTY_FIELDS, validateKeys } from "./catalog";
import { Settings } from "../settings";
import log from "@/utils/logger";

const HbApp = getHbAppCtor() as HbAppCtor;

export class DockConfigApp extends HbApp {
  static DEFAULT_OPTIONS = {
    id: "cs-dmdock-party-config",
    classes: ["cs-dock-config"],
    popOut: true,
    title: t("CS.DMDock.Config.Party.Title") ?? "Config Dock",
  };

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/core/party-config.hbs` },
  };

  async _prepareContext() {
    const selected = validateKeys(Settings.get("dmDock.party.fields") as string[] | undefined);
    return {
      chosen: PARTY_FIELDS.filter((field) => selected.includes(field.key)).map((field) => ({
        ...field,
        label: t(field.label),
      })),
      others: PARTY_FIELDS.filter((field) => !selected.includes(field.key)).map((field) => ({
        ...field,
        label: t(field.label),
      })),
    };
  }

  activatePartListeners(part: string, html: any): void {
    if (part !== "content") return; // on ne câble que la part "content"
    const root = (html?.[0] ?? html) as HTMLElement;

    // debug (tu dois le voir dès l’ouverture)
    // log.info("[CFG] activatePartListeners content", root);

    const onClick = async (event: Event) => {
      const el = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (!el) return;

      const action = el.dataset.action;

      if (action === "save") {
        const keys = root.querySelectorAll(".list.chosen [data-key]") as NodeListOf<HTMLLIElement>;
        const order = Array.from(keys, (li) => li.dataset.key!);
        await Settings.set("dmDock.party.fields", order);
        (Hooks as any).callAll("cs:dmdock:configChanged");
        this.close();
        return;
      }

      if (action === "toggle") {
        const li = el.closest("li");
        if (!li) return;
        const list = li.parentElement!;
        const target = list.classList.contains("chosen")
          ? root.querySelector(".list.others")!
          : root.querySelector(".list.chosen")!;
        target.appendChild(li);
        return;
      }

      if (action === "move") {
        const li = el.closest("li");
        if (!li) return;
        const dir = el.dataset.dir;
        if (dir === "up" && li.previousElementSibling) {
          li.parentElement!.insertBefore(li, li.previousElementSibling);
        } else if (dir === "down" && li.nextElementSibling) {
          li.parentElement!.insertBefore(li.nextElementSibling, li);
        }
        return;
      }
    };

    root.addEventListener("click", onClick);
    (this as any)._unbind = () => root.removeEventListener("click", onClick);
  }
}

let partyConfigInst: DockConfigApp | null = null;

export const openDockPartyConfig = () => {
  if (!partyConfigInst) partyConfigInst = new DockConfigApp({});
  partyConfigInst.render(true);
  return partyConfigInst;
};

let _wired = false;

export function wireDockPartyConfigClicks(): void {
  if (_wired) return;
  _wired = true;

  document.addEventListener("click", async (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    // 1) Ne réagit que si on est DANS la fenêtre de config
    const app = target.closest<HTMLElement>("#cs-dmdock-party-config");
    if (!app) return;

    // 2) Trouver l’élément porteur d’action
    const el = target.closest<HTMLElement>("[data-action]");
    if (!el) return;

    const action = el.dataset.action;

    if (action === "save") {
      const keys = app.querySelectorAll(".list.chosen [data-key]") as NodeListOf<HTMLLIElement>;
      const order: FieldKey[] = Array.from(keys, (li) => li.dataset.key as FieldKey);
      await Settings.set("dmDock.party.fields", order);
      (Hooks as any).callAll("cs:dmdock:configChanged");

      partyConfigInst?.close();
      partyConfigInst = null;

      // (app.querySelector(".header-button.close") as HTMLButtonElement)?.click();
      return;
    }

    if (action === "toggle") {
      const li = el.closest("li");
      if (!li) return;
      const from = li.parentElement!;
      const to = from.classList.contains("chosen")
        ? app.querySelector(".list.others")!
        : app.querySelector(".list.chosen")!;
      to.appendChild(li);
      return;
    }

    if (action === "move") {
      const li = el.closest("li");
      if (!li) return;
      const dir = el.dataset.dir;
      if (dir === "up" && li.previousElementSibling) {
        li.parentElement!.insertBefore(li, li.previousElementSibling);
      } else if (dir === "down" && li.nextElementSibling) {
        li.parentElement!.insertBefore(li.nextElementSibling, li);
      }
      return;
    }
  });
}
