/* eslint-disable @typescript-eslint/no-explicit-any */
import { MODULE_ID } from "@/utils/constants";
import { t } from "@/core/i18n";
import { Settings } from "@/core/settings";
import { getHbAppCtor, v2Title } from "@/core/compat";
import { CurrencyDefinitionsForm } from "./definitions.form";
import type { HbAppCtor } from "@/types/appv2-shim";

const HbApp = getHbAppCtor() as HbAppCtor;
const TEMPLATE = `modules/${MODULE_ID}/templates/features/currency/feature.hbs`;

type SyncMode = "none" | "referenceToGP";

export class CurrencyFeatureForm extends HbApp {
  static override PARTS = {
    main: { template: TEMPLATE }, // un seul part suffit
  };

  static override DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-currency-feature`,
    classes: ["cs-currency-feature"],
    tag: "form",
    template: TEMPLATE,
    window: { title: v2Title(t("CS.Currency.Feature.Title") || "Currency Settings") },
    position: { width: 520, height: "auto" },
    form: {
      handler: CurrencyFeatureForm.onSubmit as any,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      "open-defs": CurrencyFeatureForm.onOpenDefs as any,
    },
  };

  override async _prepareContext(): Promise<any> {
    const playerEdit = !!Settings.get("currency.permissions.playerEditSelf");
    const sync: SyncMode = (Settings.get("currency.syncToSystem") as SyncMode) ?? "none";
    return {
      values: { playerEdit, sync },
      labels: {
        playerEdit:
          t("CS.Currency.Settings.PlayerEdit.Label") || "Players can edit their own currency",
        playerEditHint:
          t("CS.Currency.Settings.PlayerEdit.Hint") || "If disabled, only the GM can edit amounts.",
        sync: t("CS.Currency.Settings.Sync.Label") || "Sync to system",
        syncHint:
          t("CS.Currency.Settings.Sync.Hint") || "Optional compatibility with modules reading GP.",
        sync_none: t("CS.Currency.Settings.Sync.Options.none") || "None",
        sync_ref:
          t("CS.Currency.Settings.Sync.Options.referenceToGP") ||
          "Write reference total to GP (read-only)",
        openDefs: t("CS.Currency.Feature.OpenDefinitions") || "Edit currency definitions…",
        save: t("CS.Common.Save") || "Save",
      },
    };
  }

  /** Action: ouvrir le tableau des devises */
  static onOpenDefs(this: any, _ev: MouseEvent, _target: HTMLElement) {
    new (CurrencyDefinitionsForm as any)({}).render(true);
  }

  async getData(): Promise<any> {
    return this._prepareContext();
  }

  /** Soumission du formulaire (AppV2: handler statique, this = instance) */
  static async onSubmit(this: any, _ev: SubmitEvent, form: HTMLFormElement, formData: any) {
    const data = formData?.object ?? {};
    const playerEdit = !!(
      data.playerEdit ?? form.querySelector<HTMLInputElement>('input[name="playerEdit"]')?.checked
    );
    const sync =
      (data.sync ??
        (form.querySelector<HTMLSelectElement>('select[name="sync"]')?.value as SyncMode)) ||
      "none";

    await Settings.set("currency.permissions.playerEditSelf", playerEdit);
    await Settings.set("currency.syncToSystem", sync);
  }

  activateListeners(html: any): void {
    const root: HTMLElement = html instanceof HTMLElement ? html : (html?.[0] as HTMLElement);
    if (!root) return;

    const btn = root.querySelector<HTMLButtonElement>('[data-action="open-defs"]');
    btn?.addEventListener("click", () => {
      new (CurrencyDefinitionsForm as any)({}).render(true);
    });
  }

  async _updateObject(_ev: Event, formData: Record<string, unknown>): Promise<void> {
    // formData keys: "playerEdit", "sync"
    const playerEdit = !!formData["playerEdit"];
    const sync = (formData["sync"] as SyncMode) || "none";
    await Settings.set("currency.permissions.playerEditSelf", playerEdit);
    await Settings.set("currency.syncToSystem", sync);
  }
}
