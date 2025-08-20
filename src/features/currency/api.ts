import { F } from "@/core/foundry";
import { Settings } from "@/core/settings";
import { MODULE_ID } from "@/utils/constants";
import log from "@/utils/logger";

export interface ActorLike {
  id?: string;
  name?: string;
  type?: string;
  isOwner?: boolean;
  getFlag?: (moduleId: string, key: string) => unknown;
  setFlag?: (moduleId: string, key: string, value: unknown) => Promise<unknown>;
}

export type CurrencyId = string;
export interface CurrencyDefinition {
  id: CurrencyId;
  name: string;
  abbr?: string;
  order: number;
  icon?: string;
  color?: string;
  referenceValue?: number;
  visible?: boolean;
}
export type Ledger = Record<CurrencyId, number>;

function clamp(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, Number.MAX_SAFE_INTEGER);
}

export function getDefinitions(): CurrencyDefinition[] {
  const raw = Settings.get("currency.definitions");
  try {
    const list = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function getLedger(actor: ActorLike): Ledger {
  const flags = actor.getFlag?.(MODULE_ID, "currency");
  return (flags && typeof flags === "object" ? flags : {}) as Ledger;
}

// export async function set(actor: ActorLike, id: CurrencyId, qty: number): Promise<void> {
//   const current = getLedger(actor);
//   const next = { ...current, [id]: clamp(qty) };
//   await F.actor.setFlag(actor, "currency", next);
//   Hooks.callAll("CalderisCurrencyUpdate", { actor, changes: { [id]: next[id] } });
// }
export async function set(actor: any, id: CurrencyId, qty: number): Promise<void> {
  const current = getLedger(actor);
  const next = { ...current, [id]: clamp(qty) };

  // Écriture flag (comme avant)
  await (actor as any).setFlag?.(MODULE_ID, "currency", next);

  // Hook local (comme avant)
  Hooks.callAll("CalderisCurrencyUpdate", { actor, changes: { [id]: next[id] } });

  // ➕ NOUVEAU : broadcast socket pour rafraîchir les fenêtres ouvertes sur tous les clients
  const sock = (game as any)?.socket;
  sock?.emit?.(`module.${MODULE_ID}`, {
    type: "currency-sync",
    actorId: String((actor as any)?.id ?? ""),
    changes: { [id]: next[id] },
  });
}

export async function add(actor: ActorLike, id: CurrencyId, delta: number): Promise<void> {
  const cur = getLedger(actor)[id] ?? 0;
  await set(actor, id, cur + delta);
}

export function totalReference(actor: ActorLike): number | null {
  const defs = getDefinitions();
  const refMap = Object.fromEntries(defs.map((d) => [d.id, d.referenceValue ?? 0]));
  const ledger = getLedger(actor);
  let total = 0;
  let hasRef = false;
  for (const [id, qty] of Object.entries(ledger)) {
    const ref = refMap[id] ?? 0;
    if (ref > 0) {
      hasRef = true;
      total += ref * clamp(qty);
    }
  }
  return hasRef ? total : null;
}

export function exposeApi(): void {
  (globalThis as any).CalderisCurrency = {
    getDefinitions,
    getLedger,
    set,
    add,
    totalReference,
  };
  log.info("API CalderisCurrency exposée");
}
