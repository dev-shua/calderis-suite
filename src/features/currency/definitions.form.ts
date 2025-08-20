/* eslint-disable @typescript-eslint/no-explicit-any */
import { MODULE_ID } from "@/utils/constants";
import { t } from "@/core/i18n";
import { Settings } from "@/core/settings";
import { getHbAppCtor, v2Title } from "@/core/compat";
import { HbAppCtor } from "@/types/appv2-shim";

export interface CurrencyDefinition {
  id: string;
  name: string;
  abbr?: string;
  order: number;
  icon?: string;
  color?: string;
  referenceValue?: number;
  visible?: boolean;
}

const HbApp = getHbAppCtor() as HbAppCtor;
const TEMPLATE = `modules/${MODULE_ID}/templates/features/currency/settings.hbs`;

/* ----- utils sérialisation ----- */
function parseDefs(raw: unknown): CurrencyDefinition[] {
  try {
    const s = typeof raw === "string" ? raw : JSON.stringify(raw ?? "[]");
    const arr = JSON.parse(s);
    if (!Array.isArray(arr)) return [];
    return arr.map((d: any, i: number) => ({
      id: String(d?.id ?? "").trim(),
      name: String(d?.name ?? "").trim(),
      abbr: d?.abbr ? String(d.abbr) : undefined,
      order: Number.isFinite(d?.order) ? Number(d.order) : i * 10,
      icon: d?.icon ? String(d.icon) : undefined,
      color: d?.color ? String(d.color) : undefined,
      referenceValue: Number.isFinite(d?.referenceValue) ? Number(d.referenceValue) : undefined,
      visible: d?.visible !== false,
    }));
  } catch {
    return [];
  }
}

function serializeDefs(defs: CurrencyDefinition[]): string {
  return JSON.stringify(defs, null, 2);
}

function uniqueId(base: string, taken: Set<string>): string {
  let id = base || "coin";
  let n = 1;
  while (taken.has(id)) id = `${base || "coin"}_${n++}`;
  return id;
}

function nextOrderFromDOM(root: HTMLElement): number {
  const vals = Array.from(root.querySelectorAll<HTMLInputElement>('input[data-field="order"]'))
    .map((i) => Number(i.value))
    .filter((n) => Number.isFinite(n));
  return (vals.length ? Math.max(...vals) : 0) + 10;
}

/* ----- AppV2 ----- */
export class CurrencyDefinitionsForm extends HbApp {
  /** ⬅️ OBLIGATOIRE avec HandlebarsApplicationMixin */
  static override PARTS = {
    main: { template: TEMPLATE },
  };

  static override DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-currency-definitions`,
    classes: ["cs-currency-settings"],
    tag: "form",
    template: TEMPLATE,
    window: { title: v2Title(t("CS.Currency.Settings.FormTitle") || "Currency Definitions") },
    position: { width: 820, height: "auto" },
    form: {
      handler: CurrencyDefinitionsForm.onSubmit as any,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      add: CurrencyDefinitionsForm.onAddRow as any,
      remove: CurrencyDefinitionsForm.onRemoveRow as any,
      up: CurrencyDefinitionsForm.onUpRow as any,
      down: CurrencyDefinitionsForm.onDownRow as any,
      pick: CurrencyDefinitionsForm.onPickIcon as any,
    },
  };

  #defs: CurrencyDefinition[] = [];

  /** Pont v2→v1 si fallback */
  async getData(): Promise<any> {
    return this._prepareContext();
  }

  override async _prepareContext(): Promise<any> {
    const raw = Settings.get("currency.definitions");
    this.#defs = parseDefs(raw).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return {
      rows: this.#defs,
      labels: {
        header: t("CS.Currency.Settings.Table.Header") || "Currencies",
        add: t("CS.Common.Add") || "Add",
        id: "ID",
        name: t("CS.Common.Name") || "Name",
        abbr: t("CS.Currency.Settings.Abbr") || "Symbol",
        order: t("CS.Common.Order") || "Order",
        icon: t("CS.Common.Icon") || "Icon",
        color: t("CS.Common.Color") || "Color",
        ref: t("CS.Currency.Settings.Reference") || "Reference",
        visible: t("CS.Common.Visible") || "Visible",
        actions: t("CS.Common.Actions") || "Actions",
        up: t("CS.Common.Up") || "Up",
        down: t("CS.Common.Down") || "Down",
        remove: t("CS.Common.Remove") || "Remove",
        browse: t("CS.Common.Browse") || "Browse",
      },
    };
  }

  // ---- Actions (data-action="...") ----
  static onAddRow(this: any, _ev: MouseEvent, target: HTMLElement) {
    const root = (this.element as HTMLElement) ?? target.closest<HTMLElement>(".window-app");
    if (!root) return;
    const taken = new Set<string>(
      Array.from(root.querySelectorAll<HTMLInputElement>('input[data-field="id"]'))
        .map((i) => i.value.trim())
        .filter(Boolean)
    );
    const newId = uniqueId("coin", taken);
    const tbody = root.querySelector("tbody");
    if (!tbody) return;
    const tr = document.createElement("tr");
    tr.className = "cs-c-row";
    tr.innerHTML = rowHtml({
      id: newId,
      name: "",
      abbr: "",
      order: nextOrderFromDOM(root),
      icon: "",
      color: "",
      referenceValue: "",
      visible: true,
    });
    tbody.appendChild(tr);
  }

  static onRemoveRow(this: any, _ev: MouseEvent, target: HTMLElement) {
    target.closest("tr.cs-c-row")?.remove();
  }

  static onUpRow(this: any, _ev: MouseEvent, target: HTMLElement) {
    const tr = target.closest<HTMLTableRowElement>("tr.cs-c-row");
    if (!tr) return;
    const prev = tr.previousElementSibling;
    if (prev) tr.parentElement?.insertBefore(tr, prev);
  }

  static onDownRow(this: any, _ev: MouseEvent, target: HTMLElement) {
    const tr = target.closest<HTMLTableRowElement>("tr.cs-c-row");
    if (!tr) return;
    const next = tr.nextElementSibling?.nextElementSibling;
    if (next) tr.parentElement?.insertBefore(tr, next);
    else tr.parentElement?.appendChild(tr);
  }

  static onPickIcon(this: any, _ev: MouseEvent, target: HTMLElement) {
    const input = target.closest("tr")?.querySelector<HTMLInputElement>('input[data-field="icon"]');
    const current = input?.value || "";
    const FilePickerCls =
      (globalThis as any).FilePicker ?? (globalThis as any)?.foundry?.applications?.api?.FilePicker;
    if (typeof FilePickerCls !== "function" || !input) return;
    const fp = new FilePickerCls({
      type: "image",
      current,
      callback: (p: string) => {
        input.value = p;
      },
    });
    fp.render(true);
  }

  // ---- Submit (sérialise le DOM) ----
  static async onSubmit(this: any, _ev: SubmitEvent, _form: HTMLFormElement, _formData: any) {
    const root = this.element as HTMLElement;
    const rows = Array.from(root.querySelectorAll<HTMLTableRowElement>("tr.cs-c-row"));

    const defs: CurrencyDefinition[] = rows.map((tr, idx) => {
      const get = (sel: string) => (tr.querySelector<HTMLInputElement>(sel)?.value ?? "").trim();
      const getNum = (sel: string) => {
        const v = Number(tr.querySelector<HTMLInputElement>(sel)?.value ?? "");
        return Number.isFinite(v) ? v : undefined;
      };
      const getBool = (sel: string) => !!tr.querySelector<HTMLInputElement>(sel)?.checked;

      return {
        id: get('input[data-field="id"]'),
        name: get('input[data-field="name"]'),
        abbr: get('input[data-field="abbr"]') || undefined,
        order: Number.isFinite(Number(get('input[data-field="order"]')))
          ? Number(get('input[data-field="order"]'))
          : idx * 10,
        icon: get('input[data-field="icon"]') || undefined,
        color: get('input[data-field="color"]') || undefined,
        referenceValue: getNum('input[data-field="referenceValue"]'),
        visible: getBool('input[data-field="visible"]'),
      };
    });

    // Sanitize
    const seen = new Set<string>();
    for (const d of defs) {
      d.id = uniqueId(d.id || "coin", seen);
      seen.add(d.id);
      d.name = d.name || d.id;
      if (!Number.isFinite(d.order)) d.order = 0;
      if (d.referenceValue != null && d.referenceValue < 0) d.referenceValue = 0;
    }

    await Settings.set("currency.definitions", serializeDefs(defs));
    Hooks.callAll("CalderisCurrencyDefinitionsChanged", defs);
  }
}

/* ---- Ligne HTML injectée dynamiquement ---- */
function rowHtml(r: {
  id: string;
  name: string;
  abbr: string;
  order: number | string;
  icon: string;
  color: string;
  referenceValue: number | string | undefined;
  visible: boolean;
}): string {
  return `
  <tr class="cs-c-row">
    <td><input type="number" data-field="order" value="${r.order ?? 0}" step="1" min="0" class="number"/></td>
    <td class="cs-c-icon">
      <div class="cs-c-icon-input">
        <input type="text" data-field="icon" value="${r.icon ?? ""}" placeholder="${t("CS.Common.Icon") || "Icon"}"/>
        <button type="button" data-action="pick" title="${t("CS.Common.Browse") || "Browse"}">…</button>
      </div>
    </td>
    <td><input type="text" data-field="abbr" value="${r.abbr ?? ""}" placeholder="${t("CS.Currency.Settings.Abbr") || "Symbol"}" maxlength="4"/></td>
    <td><input type="text" data-field="name" value="${r.name ?? ""}" placeholder="${t("CS.Common.Name") || "Name"}"/></td>
    <td><input type="text" data-field="id" value="${r.id}" placeholder="id"/></td>
    <td><input type="text" data-field="color" value="${r.color ?? ""}" placeholder="#RRGGBB"/></td>
    <td><input type="number" data-field="referenceValue" value="${r.referenceValue ?? ""}" step="1" min="0" class="number"/></td>
    <td class="center"><input type="checkbox" data-field="visible" ${r.visible ? "checked" : ""}/></td>
    <td class="actions">
      <button type="button" data-action="up" title="${t("CS.Common.Up") || "Up"}">↑</button>
      <button type="button" data-action="down" title="${t("CS.Common.Down") || "Down"}">↓</button>
      <button type="button" data-action="remove" title="${t("CS.Common.Remove") || "Remove"}">✕</button>
    </td>
  </tr>`;
}
