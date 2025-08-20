/* eslint-disable @typescript-eslint/no-explicit-any */
import { getFormApplicationCtor } from "@/core/compat";
import { MODULE_ID } from "@/utils/constants";
import { t } from "@/core/i18n";
import { getDefinitions, getLedger, type ActorLike } from "./api";

const TEMPLATE = `modules/${MODULE_ID}/templates/features/currency/manage.hbs`;
const FormApplication = getFormApplicationCtor();

export class CurrencyManageForm extends (FormApplication as any) {
  #actor: ActorLike;
  constructor(actor: ActorLike, options?: any) {
    super(options);
    this.#actor = actor;
  }
  static get defaultOptions(): any {
    const base = (FormApplication as any).defaultOptions ?? {};
    return {
      ...base,
      id: `${MODULE_ID}-currency-manage`,
      title: t("CS.Currency.UI.ManageTitle") || "Manage Currency",
      template: TEMPLATE,
      width: 420,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
    };
  }
  async getData(): Promise<any> {
    const defs = getDefinitions()
      .filter((d) => d.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const ledger = getLedger(this.#actor);
    return {
      rows: defs.map((d) => ({
        id: d.id,
        name: d.name,
        icon: d.icon ?? "",
        abbr: d.abbr ?? d.name,
        color: d.color ?? "",
        qty: Number.isFinite(ledger[d.id]) ? ledger[d.id] : 0,
      })),
      labels: {
        name: t("CS.Common.Name") || "Name",
        qty: t("CS.Common.Quantity") || "Quantity",
        save: t("CS.Common.Save") || "Save",
      },
    };
  }
  async _updateObject(_ev: Event, formData: any): Promise<void> {
    // FormData → { qty.<id>: number }
    const next: Record<string, number> = {};
    for (const [k, v] of Object.entries(formData ?? {})) {
      if (!k.startsWith("qty.")) continue;
      const id = k.slice(4);
      const n = Math.max(0, Math.floor(Number(v)));
      next[id] = Number.isFinite(n) ? n : 0;
    }
    // Une seule mise à jour (flag complet)
    await (this.#actor as any).setFlag?.(MODULE_ID, "currency", next);
    Hooks.callAll("CalderisCurrencyUpdate", { actor: this.#actor, changes: next });
  }
}
