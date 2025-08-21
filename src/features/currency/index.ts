// src/features/currency/index.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import log from "@/utils/logger";
import { exposeApi } from "./api";
import { wireActorSheets } from "./sheet";
import { MODULE_ID } from "@/utils/constants";
import { wireCurrencyMessaging } from "./transfer";

let WIRED = false;

function wireLiveRefresh(): void {
  Hooks.on("CalderisCurrencyDefinitionsChanged", () => {
    const wins = Object.values((ui as any)?.windows ?? {});
    for (const app of wins) {
      try {
        if ((app as any)?.actor && typeof (app as any).render === "function")
          (app as any).render(true);
      } catch {
        /* no-op */
      }
    }
  });

  Hooks.on("CalderisCurrencyUpdate", ({ actor }: any) => {
    if (!actor) return;
    const wins = Object.values((ui as any)?.windows ?? {});
    for (const app of wins) {
      try {
        const a = (app as any)?.actor;
        if (a?.id === actor.id && typeof (app as any).render === "function")
          (app as any).render(true);
      } catch {
        /* no-op */
      }
    }
  });
}

export function readyCurrencyFeature(): void {
  exposeApi();

  if (!WIRED) {
    wireCurrencyMessaging();
    wireActorSheets(); // injection UI fiche
    wireLiveRefresh(); // re-render fiches ouvertes
    WIRED = true;
  }

  // pré-compile templates
  const hbs = (globalThis as any)?.foundry?.applications?.handlebars;
  const getT = hbs?.getTemplate ?? (globalThis as any)?.foundry?.utils?.getTemplate;
  const paths = [
    `modules/${MODULE_ID}/templates/features/currency/block.hbs`,
    `modules/${MODULE_ID}/templates/features/currency/feature.hbs`,
    `modules/${MODULE_ID}/templates/features/currency/settings.hbs`,
    `modules/${MODULE_ID}/templates/features/currency/adjust.hbs`,
    `modules/${MODULE_ID}/templates/features/currency/transfer.hbs`,
    `modules/${MODULE_ID}/templates/features/currency/receive.hbs`,
  ];
  if (typeof getT === "function") {
    void Promise.all(paths.map((p) => getT(p)));
  }
}
