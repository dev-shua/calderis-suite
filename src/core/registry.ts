import { distanceSettingsDef } from "@/features/distance/settings.schema";

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
  hintKey: string;
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
] as const;

export const SETTINGS_DEF = {
  ...distanceSettingsDef,
} as const;
