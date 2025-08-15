/* eslint-disable @typescript-eslint/no-explicit-any */
import { MODULE_ID } from "@/utils/constants";
import { FEATURES } from "@/core/registry";
import { Settings } from "@/core/settings";
import { t } from "./i18n";

type UIField = {
  key: string;
  name: string;
  hint?: string;
  uiType: "boolean" | "number" | "number-range" | "select" | "text";
  value: any;
  range?: { min: number; max: number; step: number };
  choices?: [string, string][];
};
type UIGroup = { title: string; items: UIField[] };

export function makeSettingsForm(featureKey: string) {
  const feat = FEATURES.find((f) => f.key === featureKey)!;

  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

  return class FeatureSettingsForm extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      id: `${MODULE_ID}-${featureKey}-settings`,
      uniqueId: `${MODULE_ID}:${featureKey}`,
      tag: "form",
      classes: [`calderis-settings`],
      position: { width: 520 },
      window: {
        frame: true,
        title: `${feat.label}`,
        icon: feat.icon || "fas fa-sliders-h",
        contentClasses: ["calderis-settings"],
      },
      form: {
        handler: this._onSubmit,
        closeOnSubmit: true,
        submitOnChange: false,
      },
    };

    /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
    static PARTS = {
      body: {
        template: `modules/${MODULE_ID}/templates/settings-generic.hbs`,
        root: true,
      },
    };

    protected async _prepareContext(_opts: any): Promise<any> {
      const enabledKey = Object.keys(feat.def).find((k) => k.endsWith(".enabled"));
      const enabled = enabledKey ? !!Settings.get(enabledKey as any) : true;

      const fields = Object.entries(feat.def)
        .filter(([key]) => key !== enabledKey)
        .map(([key, def]) => {
          let uiType: UIField["uiType"] = "text";
          if (def.type === Boolean) uiType = "boolean";
          else if (def.type === Number && def.range) uiType = "number-range";
          else if (def.type === Number) uiType = "number";
          else if (def.type === String && def.choices) uiType = "select";

          const choices = def.choices
            ? Object.entries(def.choices).map(
                ([val, labelKey]) => [val, t(labelKey)!] as [string, string]
              )
            : undefined;

          return {
            key,
            name: t(def.name),
            hint: t(def.hint),
            uiType,
            value: Settings.get(key as any),
            range: def.range,
            choices,
            section: t(def.section ?? ""),
          } as UIField & { section: string };
        });

      const enabledField = enabledKey ? fields.find((f) => f.key === enabledKey)! : null;
      const rest = enabledKey ? fields.filter((f) => f.key !== enabledKey) : fields;

      const map = new Map<string, UIField[]>();
      for (const f of rest) {
        const s = (f as any).section as string;
        if (!map.has(s)) map.set(s, []);
        map.get(s)!.push(f);
      }
      const groups: UIGroup[] = Array.from(map.entries()).map(([title, items]) => ({
        title,
        items,
      }));

      return { featureKey, label: feat.label, enabledKey, enabled, enabledField, groups };
    }

    static async _onSubmit(
      event: Event,
      form: HTMLFormElement,
      formData: foundry.applications.ux.FormDataExtended
    ) {
      const data = formData.object as Record<string, unknown>;
      for (const [key, raw] of Object.entries(data)) {
        if (!(key in (feat.def as any))) continue;
        const def = (feat.def as any)[key];
        let v: any = raw;
        if (def.type === Boolean) v = !!v;
        else if (def.type === Number) v = Number(v);
        else v = String(v);
        await Settings.set(key as any, v);
      }
    }
  };
}
