/* eslint-disable @typescript-eslint/no-explicit-any */
import { MODULE_ID } from "@/utils/constants";
import { getHbAppCtor, v2Title } from "@/core/compat";
import { t } from "@/core/i18n";
import { getDefinitions } from "./api";
import { requestTransfer } from "./transfer";
import type { HbAppCtor } from "@/types/appv2-shim";

const HbApp = getHbAppCtor() as HbAppCtor;
const TEMPLATE = `modules/${MODULE_ID}/templates/features/currency/transfer.hbs`;

type ActorLike = any;

function listRecipientActors(excludeActorId?: string): { id: string; name: string }[] {
  const actors = (game as any).actors;
  const users = (game as any).users;
  if (!actors || !users) return [];

  const activePlayers = users.filter((u: any) => !u.isGM && u.active);
  const activeIds = new Set(activePlayers.map((u: any) => String(u.id)));

  const out: { id: string; name: string }[] = [];
  for (const a of actors) {
    if (!a || String(a.id) === String(excludeActorId)) continue;
    if (a.type !== "character") continue;
    let hasActiveOwner = false;
    if (a.ownership?.forEach) {
      a.ownership.forEach((lvl: number, uid: string) => {
        if (lvl >= 3 && activeIds.has(String(uid))) hasActiveOwner = true;
      });
    } else if (a.ownership && typeof a.ownership === "object") {
      for (const [uid, lvl] of Object.entries(a.ownership)) {
        if (Number(lvl) >= 3 && activeIds.has(String(uid))) {
          hasActiveOwner = true;
          break;
        }
      }
    }
    if (hasActiveOwner) out.push({ id: String(a.id), name: String(a.name ?? "Actor") });
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export class CurrencyTransferForm extends HbApp {
  static PARTS = { main: { template: TEMPLATE } };
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-currency-transfer`,
    classes: ["cs-currency-transfer"],
    tag: "form",
    window: { title: v2Title(t("CS.Currency.Transfer.Title", "Donner de la monnaie")) },
    position: { width: 520, height: "auto" },
    form: {
      handler: CurrencyTransferForm.onSubmit as any,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: { inc: CurrencyTransferForm.onInc as any, dec: CurrencyTransferForm.onDec as any },
  };

  #actor: ActorLike;

  constructor(options: any = {}) {
    super(options);
    this.#actor = options.actor;
  }

  async getData(): Promise<any> {
    return this._prepareContext();
  }

  async _prepareContext(): Promise<any> {
    const defs = getDefinitions()
      .filter((d) => d.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const targets = listRecipientActors(String(this.#actor?.id));

    return {
      labels: {
        header: t("CS.Currency.Transfer.Title", "Donner de la monnaie"),
        recipient: t("CS.Currency.Transfer.Recipient", "Destinataire"),
        select: t("CS.Currency.Transfer.Select", "Sélectionner…"),
        amount: t("CS.Common.Amount", "Quantité"),
        send: t("CS.Currency.Transfer.Send", "Envoyer"),
        none: t("CS.Currency.Transfer.NoTargets", "Aucun destinataire connecté"),
        incTitle: t("CS.Common.Increment", "Increment"),
        decTitle: t("CS.Common.Decrement", "Decrement"),
      },
      rows: defs.map((d) => ({ id: d.id, name: d.name || d.id, icon: d.icon ?? "" })),
      targets,
    };
  }

  static async onSubmit(this: any, _ev: SubmitEvent, formEl: HTMLFormElement, _fd: any) {
    const sel = formEl.querySelector<HTMLSelectElement>('select[name="toActorId"]');
    const toActorId = sel?.value?.trim() || "";
    if (!toActorId) {
      (ui as any)?.notifications?.warn?.(
        t("CS.Currency.Transfer.SelectWarn", "Choisis un destinataire.")
      );
      return;
    }

    const rows = Array.from(formEl.querySelectorAll<HTMLDivElement>("[data-row]"));
    const items = rows
      .map((r) => {
        const id = String(r.getAttribute("data-row") ?? "");
        const inp = r.querySelector<HTMLInputElement>('input[name="qty"]');
        const n = Math.floor(Number(inp?.value ?? 0));
        return { currencyId: id, amount: Number.isFinite(n) && n > 0 ? n : 0 };
      })
      .filter((it) => it.amount > 0);

    if (!items.length) {
      (ui as any)?.notifications?.warn?.(
        t("CS.Currency.Transfer.Empty", "Entre au moins une quantité.")
      );
      return;
    }

    await requestTransfer({
      fromActorId: String(this.#actor?.id ?? ""),
      toActorId,
      fromName: String(this.#actor?.name ?? ""),
      items,
    });
  }

  static onInc(this: any, _ev: MouseEvent, target: HTMLElement) {
    const row = target.closest<HTMLDivElement>("[data-row]");
    if (!row) return;
    const input = row.querySelector<HTMLInputElement>('input[name="qty"]');
    if (!input) return;
    const cur = Number(input.value ?? 0);
    const next = Number.isFinite(cur) ? Math.max(0, Math.floor(cur) + 1) : 1;
    input.value = String(next);
  }

  static onDec(this: any, _ev: MouseEvent, target: HTMLElement) {
    const row = target.closest<HTMLDivElement>("[data-row]");
    if (!row) return;
    const input = row.querySelector<HTMLInputElement>('input[name="qty"]');
    if (!input) return;
    const cur = Number(input.value ?? 0);
    const next = Number.isFinite(cur) ? Math.max(0, Math.floor(cur) - 1) : 0;
    input.value = String(next);
  }
}
