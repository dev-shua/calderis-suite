/* eslint-disable @typescript-eslint/no-explicit-any */
import { MODULE_ID } from "@/utils/constants";

function req<T>(val: T | null | undefined, name: string): T {
  if (val == null) throw new Error(`[${MODULE_ID}] Missing ${name}`);
  return val;
}

/** Façade Foundry (limite les any ici) */
export const F = {
  get game(): any {
    return req((globalThis as any).game, "game");
  },
  get Hooks(): any {
    return req((globalThis as any).Hooks, "Hooks");
  },

  actor: {
    getFlag(actor: any, key: string): unknown {
      return actor?.getFlag?.(MODULE_ID, key);
    },
    async setFlag(actor: any, key: string, value: unknown): Promise<void> {
      await actor?.setFlag?.(MODULE_ID, key, value);
    },
  },

  settings: {
    get<T = unknown>(key: string): T {
      return this.raw.get(MODULE_ID, key) as T;
    },
    set<T = unknown>(key: string, value: T): Promise<unknown> {
      return this.raw.set(MODULE_ID, key, value);
    },
    get raw(): any {
      return req((globalThis as any).game?.settings, "game.settings");
    },
  },
};
