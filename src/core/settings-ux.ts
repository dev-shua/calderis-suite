/* eslint-disable @typescript-eslint/no-explicit-any */
import { MODULE_ID } from "@/utils/constants";
import { FEATURES } from "@/core/registry";
import { makeSettingsForm } from "@/core/auto-form";
import { t } from "@/core/i18n";
import { CurrencyFeatureForm } from "@/features/currency/feature.form";
import log from "@/utils/logger";

/** Trouver racine depuis html du hook. */
function asRoot(html: any): HTMLElement | null {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  if (Array.isArray(html) && html[0] instanceof HTMLElement) return html[0] as HTMLElement;
  if (html[0] && html[0] instanceof HTMLElement) return html[0] as HTMLElement;
  return null;
}

/** Row contenant input[name=…] */
function findSettingRow(root: HTMLElement, fullName: string): HTMLElement | null {
  const input = root.querySelector<HTMLInputElement>(`input[name="${fullName}"]`);
  if (!input) return null;
  return (
    (input.closest(".form-group") as HTMLElement | null) ??
    (input.closest(".setting") as HTMLElement | null) ??
    (input.parentElement as HTMLElement | null)
  );
}

function removeCurrencyDefinitionsField(root: HTMLElement): void {
  const sel1 = `input[name="${MODULE_ID}.currency.definitions"]`;
  const el1 = root.querySelector(sel1) as HTMLElement | null;
  const sel2 = `[data-setting-id="${MODULE_ID}.currency.definitions"]`;
  const el2 = root.querySelector(sel2) as HTMLElement | null;

  const row =
    (el1?.closest(".form-group") as HTMLElement | null) ??
    (el1?.closest(".setting") as HTMLElement | null) ??
    (el2?.closest(".form-group") as HTMLElement | null) ??
    (el2?.closest(".setting") as HTMLElement | null) ??
    el1 ??
    el2;

  row?.remove();
  // if (row) log.info("Settings UX: removed currency.definitions row");
}

function insertInlineButtonAfter(
  afterRow: HTMLElement,
  featureKey: string,
  labelKey: string
): void {
  const wrap = document.createElement("div");
  wrap.className = "form-group cs-inline-feature";

  const label = document.createElement("label");
  label.textContent = t(labelKey);

  const fields = document.createElement("div");
  fields.className = "form-fields";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cs-open-feature-btn";
  btn.dataset.feature = featureKey;
  btn.textContent = t("CS.Common.Configure");

  fields.appendChild(btn);
  wrap.appendChild(label);
  wrap.appendChild(fields);

  afterRow.insertAdjacentElement("afterend", wrap);
}

export function setupInlineFeatureSettings(): void {
  Hooks.on("renderSettingsConfig", (_app: any, html: any) => {
    const root = asRoot(html);
    if (!root) return;
    if ((root as any)._csWiredCS) return;
    (root as any)._csWiredCS = true;

    // Cleanup précédent
    root
      .querySelectorAll(".cs-inline-feature, hr.cs-inline-feature-sep")
      .forEach((n) => n.remove());
    removeCurrencyDefinitionsField(root);

    let injected = 0;

    for (const feat of FEATURES) {
      const fullName = `${MODULE_ID}.${feat.key}.enabled`;
      const row = findSettingRow(root, fullName);
      if (!row) {
        log.warn(`[Settings UX] enabled row not found for: ${fullName}`);
        continue;
      }

      // Séparateur AU-DESSUS de la feature (avant la row "enabled")
      const sep = document.createElement("hr");
      sep.className = "cs-inline-feature-sep";
      row.insertAdjacentElement("beforebegin", sep);

      // Bloc bouton "Configurer" juste après la row "enabled"
      insertInlineButtonAfter(row, feat.key, feat.label);
      injected++;
    }

    // Un SEUL listener délégué
    root.addEventListener("click", (ev) => {
      const target = ev.target as HTMLElement | null;
      const btn = target?.closest<HTMLButtonElement>(".cs-open-feature-btn");
      if (!btn) return;

      const key = btn.dataset.feature;
      if (!key) return;

      if (key === "currency") {
        new (CurrencyFeatureForm as any)({}).render(true);
      } else {
        const FormCls = makeSettingsForm(key) as any;
        new FormCls().render(true);
      }
    });
  });
}
