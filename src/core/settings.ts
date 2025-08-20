/* eslint-disable @typescript-eslint/no-explicit-any */
import { MODULE_ID } from "@/utils/constants";
import { FEATURES, SETTINGS_DEF } from "@/core/registry";
import { makeSettingsForm } from "@/core/auto-form";
import { t } from "./i18n";
import log from "@/utils/logger";
import { CurrencyDefinitionsForm } from "@/features/currency/definitions.form";

const REGISTER_MENUS = false;
/** Surface minimale dont on a besoin depuis game.settings */
type SettingsAPI = {
  register: (module: string, key: string, data: any) => unknown;
  registerMenu?: (module: string, key: string, data: any) => unknown;
  get: (module: string, key: string) => unknown;
  set: (module: string, key: string, value: unknown) => Promise<unknown>;
};

let _settings: SettingsAPI | null = null;

export function attachSettings(settings: SettingsAPI) {
  _settings = settings;
}
function requireSettings(): SettingsAPI {
  if (!_settings) throw new Error(`${MODULE_ID}: settings not attached (call in 'init')`);
  return _settings;
}

export function registerAllConfig(settings: SettingsAPI) {
  attachSettings(settings);

  const entries = Object.entries(SETTINGS_DEF);

  for (const [key, data] of entries) {
    try {
      settings.register(MODULE_ID, key, data);
    } catch (e) {
      log.error(`[${MODULE_ID}] settings.register failed for ${key}`, e, data);
    }
  }

  // Menus par feature (si tu veux les garder visibles dans la Config Foundry)
  if (REGISTER_MENUS) {
    for (const feat of FEATURES) {
      try {
        const FormType =
          feat.key === "currency"
            ? (CurrencyDefinitionsForm as any)
            : (makeSettingsForm(feat.key) as any);
        settings.registerMenu?.(MODULE_ID, `${feat.key}Menu`, {
          name: t(feat.label),
          label: t("CS.Common.Configure"),
          hint: feat.hintKey ? t(feat.hintKey) : "",
          icon: feat.icon,
          type: FormType,
          restricted: !!feat.restricted,
        });
      } catch (e) {
        log.warn(`[${MODULE_ID}] settings.registerMenu failed for ${feat.key}`, e);
      }
    }
  }
}

type ValueOfDef<D> = D extends { type: BooleanConstructor }
  ? boolean
  : D extends { type: NumberConstructor }
    ? number
    : D extends { type: StringConstructor }
      ? string
      : unknown;

export type SettingKey = keyof typeof SETTINGS_DEF;
export type SettingValue<K extends SettingKey> = ValueOfDef<(typeof SETTINGS_DEF)[K]>;

export const Settings = {
  get<K extends SettingKey>(key: K) {
    return requireSettings().get(MODULE_ID, key) as SettingValue<K>;
  },
  set<K extends SettingKey>(key: K, value: SettingValue<K>) {
    return requireSettings().set(MODULE_ID, key, value);
  },
};
