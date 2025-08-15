/* eslint-disable @typescript-eslint/no-explicit-any */
import { MODULE_ID } from "@/utils/constants";
import { FEATURES, SETTINGS_DEF } from "@/core/registry";
import { makeSettingsForm } from "@/core/auto-form";
import { t } from "./i18n";

let _settings: ClientSettings | null = null;
export function attachSettings(settings: ClientSettings) {
  _settings = settings;
}
function requireSettings(): ClientSettings {
  if (!_settings) throw new Error(`${MODULE_ID}: settings not attached (call in 'init')`);
  return _settings;
}

export function registerAllConfig(settings: ClientSettings) {
  attachSettings(settings);

  for (const [key, data] of Object.entries(SETTINGS_DEF)) {
    (settings as any).register(MODULE_ID, key, data);
  }

  for (const feat of FEATURES) {
    settings.registerMenu(MODULE_ID, `${feat.key}Menu`, {
      name: t(feat.label),
      label: t("CS.Common.Configure"),
      hint: feat.hintKey ? t(feat.hintKey) : "",
      icon: feat.icon,
      type: makeSettingsForm(feat.key),
      restricted: !!feat.restricted,
    });
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
    return (requireSettings() as any).get(MODULE_ID, key) as SettingValue<K>;
  },
  set<K extends SettingKey>(key: K, value: SettingValue<K>) {
    return (requireSettings() as any).set(MODULE_ID, key, value);
  },
};
