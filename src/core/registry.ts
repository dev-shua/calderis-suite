import { currencySettingsDef } from "@/features/currency/settings.schema";
import { distanceSettingsDef } from "@/features/distance/settings.schema";
import { coreSettingsDef } from "./dm-dock/settings.schema";

export type SettingsDef = Record<
  string,
  {
    name: string;
    hint?: string;
    scope: "world" | "client";
    config: boolean;
    type: BooleanConstructor | NumberConstructor | StringConstructor;
    default: unknown;
    choices?: Record<string, string>;
    range?: { min: number; max: number; step: number };
    section?: string;
  }
>;

export interface FeatureMeta {
  key: string;
  label: string;
  hintKey?: string;
  icon: string;
  restricted?: boolean;
  def: SettingsDef;
}

export const FEATURES: FeatureMeta[] = [
  {
    key: "distance",
    label: "CS.Feature.Distance.Label",
    hintKey: "CS.Feature.Distance.Hint",
    icon: "fas fa-ruler-combined",
    restricted: false,
    def: distanceSettingsDef,
  },
  {
    key: "currency",
    label: "CS.Feature.Currency.Label",
    hintKey: "CS.Feature.Currency.Hint",
    icon: "fas fa-coins",
    restricted: false,
    def: currencySettingsDef,
  },
] as const;

export const SETTINGS_DEF = {
  ...coreSettingsDef,
  ...distanceSettingsDef,
  ...currencySettingsDef,
} as const;
