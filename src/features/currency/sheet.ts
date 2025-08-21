// src/features/currency/sheet.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import log from "@/utils/logger";
import { Settings } from "@/core/settings";
import { t } from "@/core/i18n";
import { MODULE_ID } from "@/utils/constants";
import { getDefinitions, getLedger, totalReference, type CurrencyDefinition } from "./api";
import { CurrencyAdjustForm } from "./adjust.form";

type ActorLike = any;

const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/features/currency/compact.hbs`;

const nf = () => {
  const lang = (game as any)?.i18n?.lang ?? "en";
  return new Intl.NumberFormat(lang, { maximumFractionDigits: 0 });
};

async function renderHbs(path: string, data: unknown): Promise<string> {
  const foundryNS = (globalThis as any)?.foundry;

  // v13+: API officielle
  const hbs = foundryNS?.applications?.handlebars;
  if (typeof hbs?.renderTemplate === "function") {
    return await hbs.renderTemplate(path, data);
  }

  // Fallback: compile + exécute
  const getT = hbs?.getTemplate ?? foundryNS?.utils?.getTemplate;
  if (typeof getT === "function") {
    const tpl = await getT(path);
    return typeof tpl === "function" ? tpl(data) : String(tpl ?? "");
  }

  // Très vieux runtime (global)
  const rtLegacy = (globalThis as any)?.renderTemplate;
  if (typeof rtLegacy === "function") return await rtLegacy(path, data);

  throw new Error("No template renderer available (handlebars).");
}

function getHtmlElement(html: unknown): HTMLElement | null {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  const jq0 = (html as any)[0];
  if (jq0 instanceof HTMLElement) return jq0;
  const el0 = (html as any)?.element?.[0];
  return el0 instanceof HTMLElement ? el0 : null;
}

function canEditActorCurrency(actor: ActorLike): boolean {
  const user = (game as any)?.user;
  if (user?.isGM) return true;
  const playersCan = !!Settings.get("currency.permissions.playerEditSelf");
  return playersCan && !!(actor as any)?.isOwner;
}

function findNativeCurrencyContainer(root: HTMLElement): HTMLElement | null {
  const sels = [
    ".currency",
    "section.currency",
    '[data-tab="inventory"] .currency',
    ".tab.inventory .currency",
  ];
  for (const s of sels) {
    const el = root.querySelector<HTMLElement>(s);
    if (el) return el;
  }
  return null;
}

function pickInventoryHost(root: HTMLElement): HTMLElement {
  return (
    root.querySelector<HTMLElement>('[data-tab="inventory"]') ||
    root.querySelector<HTMLElement>(".tab.inventory") ||
    root
  );
}

function wireManageButton(container: HTMLElement, actor: ActorLike): void {
  // Supporte soit data-action="manage", soit .cs-currency__manage (selon le template)
  const btn =
    container.querySelector<HTMLButtonElement>('[data-action="manage"]') ??
    container.querySelector<HTMLButtonElement>(".cs-currency__manage");

  if (!btn) return;
  if (btn.dataset.csWired === "1") return;
  btn.dataset.csWired = "1";

  if (!canEditActorCurrency(actor)) {
    btn.disabled = true;
    btn.title = t("CS.Common.GM", "GM only");
    return;
  }
  btn.addEventListener("click", () => {
    new (CurrencyAdjustForm as any)({ actor }).render(true);
  });
}

async function renderCurrencyBlock(actor: ActorLike, host: HTMLElement): Promise<void> {
  if (host.querySelector('[data-cs-currency="1"]')) return; // idempotent

  const defs = (getDefinitions() as CurrencyDefinition[])
    .filter((d) => d.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (!defs.length) {
    log.info("Currency: no definitions; skip render.");
    return;
  }

  const ledger = getLedger(actor);
  const totRef = totalReference(actor);

  const model = {
    coins: defs.map((d) => {
      const qty = Number.isFinite(ledger[d.id]) ? ledger[d.id] : 0;
      return {
        id: d.id,
        name: d.name,
        abbr: d.abbr ?? d.name,
        icon: d.icon ?? "",
        color: d.color ?? "",
        order: d.order ?? 0,
        qty,
        qtyFmt: nf().format(qty),
      };
    }),
    manageLabel: t("CS.Currency.UI.Manage", "Manage"),
    showTotal: totRef !== null,
    totalLabel: t("CS.Currency.UI.TotalReference", "Approx. value"),
    totalFmt: totRef != null ? nf().format(totRef) : "",
  };

  // Rend le fragment (Handlebars)
  let inner = "";
  try {
    inner = await renderHbs(TEMPLATE_PATH, model);
  } catch (e) {
    // Fallback ultra simple au cas où
    inner = `<div class="cs-currency__header">
      <div class="cs-currency__title">${t("CS.Currency.UI.Header", "Currency")}</div>
      <button type="button" class="cs-currency__manage">${model.manageLabel}</button>
    </div>
    <div class="cs-currency__items">
      ${model.coins
        .map(
          (c) => `<div class="cs-currency__pill" title="${c.name}">
          ${
            c.icon
              ? `<img class="cs-currency__pill-icon" src="${c.icon}" alt=""/>`
              : `<span class="cs-currency__pill-abbr"${
                  c.color ? ` style="color:${c.color};"` : ""
                }>${c.abbr}</span>`
          }
          <span class="cs-currency__pill-qty">${c.qtyFmt}</span>
        </div>`
        )
        .join("")}
    </div>
    <div class="cs-currency__footer${model.showTotal ? "" : " hidden"}">
      <span class="cs-currency__total-label">${model.totalLabel}</span>
      <span class="cs-currency__total">${model.totalFmt}</span>
    </div>`;
    log.warn("Currency: template render failed, used inline fallback.", e);
  }

  // Section wrapper
  const wrapper = document.createElement("section");
  wrapper.dataset.csCurrency = "1";
  wrapper.className = "cs-currency";
  wrapper.innerHTML = inner;

  // Place après le bloc natif DnD5e si présent, sinon en haut de l’onglet inventaire
  const native = findNativeCurrencyContainer(host);
  if (native?.parentElement) {
    native.style.display = "none";
    native.parentElement.insertBefore(wrapper, native.nextElementSibling);
  } else {
    pickInventoryHost(host).prepend(wrapper);
  }

  // Câble le bouton “Gérer” → dialog v2
  wireManageButton(wrapper, actor);
}

export function wireActorSheets(): void {
  const HOOKS = ["renderBaseActorSheet", "renderActorSheet"] as const;

  for (const hook of HOOKS) {
    Hooks.on(hook, async (app: any, html: unknown, data: any) => {
      const ctor = app?.constructor?.name ?? "<unknown>";
      const actor: ActorLike | undefined =
        app?.object?.documentName === "Actor" ? app.object : (data?.actor ?? app?.actor);

      try {
        // feature ON + système dnd5e
        if (!game.settings.get("calderis-suite", "currency.enabled")) return;
        if ((game as any).system?.id !== "dnd5e") return;
        if (!actor) return;

        // uniquement Character / NPC
        const type = (actor as any)?.type;
        if (type !== "character" && type !== "npc") return;

        const el = getHtmlElement(html);
        if (!el) return;

        await renderCurrencyBlock(actor, el);
      } catch (e) {
        log.warn(`Currency: handler failed on ${hook}`, e);
      }
    });
  }

  // Dev helper (optionnel)
  (globalThis as any).CalderisCurrencyDev = {
    injectAllOpen: async () => {
      for (const win of Object.values((ui as any)?.windows ?? {})) {
        const sheet = win as any;
        const isActor = sheet?.object?.documentName === "Actor";
        if (!isActor) continue;
        const root = (sheet.element?.[0] ?? sheet.element) as HTMLElement | undefined;
        if (root) await renderCurrencyBlock(sheet.object as ActorLike, root);
      }
      log.info("Currency: manual injectAllOpen done.");
    },
  };
}
