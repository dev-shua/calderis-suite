/* eslint-disable @typescript-eslint/no-explicit-any */
import { MODULE_ID } from "@/utils/constants";
import { getHbAppCtor, v2Title } from "@/core/compat";
import { t } from "@/core/i18n";
import { getDefinitions, getLedger, set } from "./api";
import type { HbAppCtor } from "@/types/appv2-shim";
import { CurrencyTransferForm } from "./transfer.form";
import log from "@/utils/logger";

const HbApp = getHbAppCtor() as HbAppCtor;
const TEMPLATE = `modules/${MODULE_ID}/templates/features/currency/adjust.hbs`;

type ActorLike = any;

function clampInt(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), Number.MAX_SAFE_INTEGER);
}

export class CurrencyAdjustForm extends HbApp {
  static PARTS = { main: { template: TEMPLATE } };

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-currency-adjust`,
    classes: ["cs-currency-adjust"],
    tag: "form",
    window: { title: v2Title(t("CS.Currency.UI.ManageTitle", "Gérer la monnaie")) },
    position: { width: 520, height: "auto" },
    form: {
      handler: CurrencyAdjustForm.onSubmit as any,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      inc: CurrencyAdjustForm.onInc as any,
      dec: CurrencyAdjustForm.onDec as any,
      give: CurrencyAdjustForm.onGive as any,
    },
  };

  #actor: ActorLike;
  #hookIds: Array<{ hook: string; fn: (...args: any[]) => void }> = [];
  #socketFn?: (msg: any) => void;

  constructor(options: any = {}) {
    super(options);
    this.#actor = options.actor;
  }

  async getData(): Promise<any> {
    return this._prepareContext();
  }

  override async _prepareContext(): Promise<any> {
    const defs = getDefinitions()
      .filter((d) => d.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const ledger = this.#actor ? getLedger(this.#actor) : {};

    return {
      labels: {
        header: t("CS.Currency.UI.Header", "Currency"),
        save: t("CS.Common.Save", "Save"),
        give: t("CS.Currency.UI.Give", "Give…"),
        incTitle: t("CS.Common.Increment", "Increment"),
        decTitle: t("CS.Common.Decrement", "Decrement"),
      },
      rows: defs.map((d) => ({
        id: d.id,
        name: d.name || d.id,
        icon: d.icon ?? "",
        qty: clampInt(Number(ledger[d.id] ?? 0)),
      })),
    };
  }

  static async onSubmit(this: any, _ev: SubmitEvent, formEl: HTMLFormElement, _fd: any) {
    const actor: ActorLike = this.#actor;
    if (!actor) return;

    const rows = Array.from(formEl.querySelectorAll<HTMLDivElement>("[data-row]"));
    for (const r of rows) {
      const id = String(r.getAttribute("data-row") ?? "");
      const input = r.querySelector<HTMLInputElement>('input[name="qty"]');
      const qty = clampInt(Number(input?.value ?? 0));
      await set(actor, id, qty);
    }
  }

  static async onInc(this: any, _ev: MouseEvent, target: HTMLElement) {
    const row = target.closest<HTMLDivElement>("[data-row]");
    if (!row) return;
    const input = row.querySelector<HTMLInputElement>('input[name="qty"]');
    if (!input) return;
    const cur = clampInt(Number(input.value ?? 0));
    const next = cur + 1;
    input.value = String(next);
    await set(this.#actor, String(row.getAttribute("data-row") ?? ""), next);
  }

  static async onDec(this: any, _ev: MouseEvent, target: HTMLElement) {
    const row = target.closest<HTMLDivElement>("[data-row]");
    if (!row) return;
    const input = row.querySelector<HTMLInputElement>('input[name="qty"]');
    if (!input) return;
    const cur = clampInt(Number(input.value ?? 0));
    const next = Math.max(0, cur - 1);
    input.value = String(next);
    await set(this.#actor, String(row.getAttribute("data-row") ?? ""), next);
  }

  static onGive(this: any, _ev: MouseEvent, _target: HTMLElement) {
    const actor = this.#actor; // instance bound by AppV2 actions
    try {
      this.close({ force: true });
    } catch {
      /* no-op */
    }

    setTimeout(() => {
      new (CurrencyTransferForm as any)({ actor }).render(true);
    }, 0);
  }

  activateListeners(html: any): void {
    const root: HTMLElement = html instanceof HTMLElement ? html : (html?.[0] as HTMLElement);
    if (!root) return;
    root.dataset.actorId = String(this.#actor?.id ?? "");

    // Commit au blur / Enter (saisie directe)
    root.querySelectorAll<HTMLInputElement>('input[name="qty"]').forEach((inp) => {
      const commit = async () => {
        const row = inp.closest<HTMLDivElement>("[data-row]");
        if (!row) return;
        const id = String(row.getAttribute("data-row") ?? "");
        const v = clampInt(Number(inp.value ?? 0));
        inp.value = String(v);
        await set(this.#actor, id, v);
      };
      inp.addEventListener("blur", () => void commit());
      inp.addEventListener("keydown", (ev) => {
        if ((ev as KeyboardEvent).key === "Enter") {
          ev.preventDefault();
          void commit();
        }
      });
    });

    // ---- Live refresh : 2 sources
    // 1) notre hook custom si set/add est appelé côté même client
    const onLedgerChange = ({ actor, changes }: any) => {
      if (!actor || String(actor.id) !== String(this.#actor?.id)) return;
      for (const id of Object.keys(changes ?? {})) {
        const r = root.querySelector<HTMLDivElement>(`[data-row="${id}"]`);
        const input = r?.querySelector<HTMLInputElement>('input[name="qty"]');
        if (!input) continue;
        const val = clampInt(Number(actor?.getFlag?.(MODULE_ID, "currency")?.[id] ?? 0));
        input.value = String(val);
      }
    };

    // 2) updateActor (vient du GM / d’un autre client lors d’un don)
    const onActorUpdate = (doc: any, change: any, opts: any, userId: any) => {
      if (!doc || String(doc.id) !== String(this.#actor?.id)) return;
      log.info("[Calderis][Adjust] updateActor", {
        docId: String(doc?.id),
        change,
        opts,
        userId,
      });

      // Relit l’état *actuel* depuis le doc (ou fallback sur getLedger)
      const led =
        (typeof doc.getFlag === "function"
          ? (doc.getFlag(MODULE_ID, "currency") as Record<string, number>)
          : undefined) || getLedger(this.#actor);

      // Pousse les valeurs dans tous les champs visibles
      root.querySelectorAll<HTMLDivElement>("[data-row]").forEach((r) => {
        const id = String(r.getAttribute("data-row") ?? "");
        const input = r.querySelector<HTMLInputElement>('input[name="qty"]');
        if (!input) return;
        const val = Number(led?.[id] ?? 0);
        input.value = String(Number.isFinite(val) ? Math.floor(val) : 0);
      });
    };

    Hooks.on("CalderisCurrencyUpdate", onLedgerChange);
    Hooks.on("updateActor", onActorUpdate);
    this.#hookIds.push({ hook: "CalderisCurrencyUpdate", fn: onLedgerChange });
    this.#hookIds.push({ hook: "updateActor", fn: onActorUpdate });
  }

  async close(options?: any): Promise<void> {
    try {
      for (const { hook, fn } of this.#hookIds) Hooks.off(hook, fn);
      this.#hookIds = [];
    } catch {
      /* no-op */
    }

    const baseClose = (Object.getPrototypeOf(CurrencyAdjustForm.prototype) as any)?.close;
    if (typeof baseClose === "function") return baseClose.call(this, options);
    // Unbind socket
    const sock = (game as any)?.socket;
    if (sock && this.#socketFn) {
      sock.off?.(`module.${MODULE_ID}`, this.#socketFn);
      this.#socketFn = undefined;
    }
    return;
  }
}
