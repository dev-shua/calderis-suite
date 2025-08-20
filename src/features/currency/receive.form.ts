/* eslint-disable @typescript-eslint/no-explicit-any */
import { MODULE_ID } from "@/utils/constants";
import { getHbAppCtor, v2Title } from "@/core/compat";
import { t } from "@/core/i18n";
import { getDefinitions } from "./api";
import type { HbAppCtor } from "@/types/appv2-shim";

const HbApp = getHbAppCtor() as HbAppCtor;
const TEMPLATE = `modules/${MODULE_ID}/templates/features/currency/receive.hbs`;

type Item = { currencyId: string; amount: number };

export class ReceiverNoticeForm extends HbApp {
  static PARTS = { main: { template: TEMPLATE } };
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-currency-received`,
    classes: ["cs-currency-received"],
    tag: "form",
    window: { title: v2Title(t("CS.Currency.UI.ReceivedTitle", "Monnaie reçue")) },
    position: { width: 440, height: "auto" },
    form: { handler: (_ev: any, _form: any) => {}, submitOnChange: false, closeOnSubmit: true },
  };

  #fromName = "";
  #items: Item[] = [];

  constructor(options: any = {}) {
    super(options);
    this.#fromName = String(options.fromName ?? "");
    this.#items = Array.isArray(options.items) ? options.items : [];
  }

  async getData(): Promise<any> {
    return this._prepareContext();
  }

  async _prepareContext(): Promise<any> {
    const defs = getDefinitions();
    const map = new Map(defs.map((d) => [d.id, d]));

    const rows = this.#items
      .filter((it) => Number.isFinite(it.amount) && it.amount > 0)
      .map((it) => {
        const def = map.get(it.currencyId);
        const nameKey = (def as any)?.nameKey as string | undefined;
        const label =
          (nameKey && (game as any)?.i18n?.has?.(nameKey)
            ? (game as any).i18n.localize(nameKey)
            : undefined) ||
          def?.name ||
          it.currencyId;
        return { id: it.currencyId, amount: Math.floor(Number(it.amount)), label };
      });

    const isMulti = rows.length > 1;

    let message = "";
    let lines: string[] = [];
    if (isMulti) {
      message = t("CS.Currency.UI.ReceivedMulti", "{from} vous a donné :", {
        from: this.#fromName,
      });
      lines = rows.map((r) =>
        t("CS.Currency.UI.ItemFmt", "{amount} × {currency}", {
          amount: r.amount,
          currency: r.label,
        })
      );
    } else if (rows.length === 1) {
      const r = rows[0];
      message = t("CS.Currency.UI.ReceivedSingle", "{from} vous a donné {amount} × {currency}", {
        from: this.#fromName,
        amount: r.amount,
        currency: r.label,
      });
    } else {
      message = t("CS.Currency.UI.ReceivedNone", "{from} vous a donné quelque chose.", {
        from: this.#fromName,
      });
    }

    return {
      labels: { ok: t("CS.Common.OK", "OK") },
      isMulti,
      message,
      lines,
    };
  }
}
