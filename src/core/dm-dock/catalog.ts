import { t } from "@/core/i18n";

export type FieldKey = "ac" | "prc" | "inv" | "spd" | "hp" | "inspi" | "init";
export interface FieldDef {
  key: FieldKey;
  label: string;
  read: (a: any) => string | number | null;
}

export const PARTY_FIELDS: FieldDef[] = [
  {
    key: "ac",
    label: "CS.Sheetstats.ac",
    read: (actor: DnD5e.Actor5e) => actor.system.attributes.ac.value ?? null,
  },
  {
    key: "prc",
    label: "CS.Sheetstats.per",
    read: (actor: DnD5e.Actor5e) => actor.system.skills.prc.passive ?? null,
  },
  {
    key: "inv",
    label: "CS.Sheetstats.inv",
    read: (actor: DnD5e.Actor5e) => actor.system.skills.inv.passive ?? null,
  },
  {
    key: "spd",
    label: "CS.Sheetstats.speed",
    read: (actor: DnD5e.Actor5e) => actor.system.attributes.movement.walk ?? null,
  },
  {
    key: "hp",
    label: "CS.Sheetstats.health",
    read: (actor: DnD5e.Actor5e) =>
      `${actor.system.attributes.hp.value}/${actor.system.attributes.hp.max}`,
  },
  {
    key: "inspi",
    label: "CS.Sheetstats.inspiration",
    read: (actor: DnD5e.Actor5e) => (actor.system.attributes.inspiration ? "true" : "false"),
  },
  {
    key: "init",
    label: "CS.Sheetstats.initiative",
    read: (actor: DnD5e.Actor5e) => actor.system.attributes.init.total ?? null,
  },
];

export const validateKeys = (keys: string[] | undefined): FieldKey[] => {
  const ok = new Set(PARTY_FIELDS.map((field) => field.key));
  return (keys ?? []).filter((key): key is FieldKey => ok.has(key as FieldKey));
};
