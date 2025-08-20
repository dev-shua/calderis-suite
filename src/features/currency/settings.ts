import { MODULE_ID } from "@/utils/constants";
import log from "@/utils/logger";

function t(key: string, data?: Record<string, unknown>): string {
  try {
    return game.i18n.format(key, data ?? {});
  } catch {
    return key;
  }
}

/* ---------- helpers ---------- */

function stripHtml(s: string): string {
  return String(s ?? "").replace(/<[^>]*>/g, "");
}

/** Confirme proprement (FVTT v10–v13) avec fallback navigateur */
async function safeConfirm(title: string, contentHtml: string): Promise<boolean> {
  const DialogNS =
    (globalThis as any).Dialog ?? (globalThis as any)?.foundry?.applications?.api?.Dialog;

  if (DialogNS?.confirm) {
    try {
      // v1: Dialog.confirm({ title, content }) → Promise<boolean>
      return await DialogNS.confirm({ title, content: contentHtml });
    } catch {
      /* fallback below */
    }
  }

  // Fallback ultime (si pas de Dialog typé)
  const msg = `${title}\n\n${stripHtml(contentHtml)}`;
  return Promise.resolve(window.confirm(msg));
}

/* ---------- snapshot utils ---------- */

async function takeSnapshotAll(): Promise<number> {
  const actors = game.actors?.contents ?? [];
  if (!actors.length) return 0;

  let ok = 0;
  for (const a of actors) {
    try {
      const base = a.system?.currency ?? {};
      await a.setFlag(MODULE_ID, "currencySnapshotV1", {
        base,
        at: new Date().toISOString(),
      });
      ok++;
    } catch (e) {
      log.warn("Snapshot échoué pour", a, e);
    }
  }
  return ok;
}

async function restoreSnapshotAll(): Promise<number> {
  const actors = game.actors?.contents ?? [];
  let ok = 0;
  for (const a of actors) {
    try {
      const snap = a.getFlag(MODULE_ID, "currencySnapshotV1") as
        | { base?: Record<string, number> }
        | undefined;
      if (!snap?.base) continue;
      await a.update({ "system.currency": snap.base });
      ok++;
    } catch (e) {
      log.warn("Restauration échouée pour", a, e);
    }
  }
  return ok;
}

/* ---------- settings ---------- */

export function registerCurrencySettings(): void {
  const ns = MODULE_ID;

  // ON/OFF
  game.settings.register(ns, "currency.enabled", {
    name: "CALDERIS.Currency.Settings.Enabled.Label",
    hint: "CALDERIS.Currency.Settings.Enabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  // Definitions (JSON string)
  game.settings.register(ns, "currency.definitions", {
    name: "CALDERIS.Currency.Settings.Definitions.Label",
    hint: "CALDERIS.Currency.Settings.Definitions.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "[]",
  });

  // Players can edit
  game.settings.register(ns, "currency.permissions.playerEditSelf", {
    name: "CALDERIS.Currency.Settings.PlayerEdit.Label",
    hint: "CALDERIS.Currency.Settings.PlayerEdit.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  // Sync towards system (no-op in v1; réservé v1.1)
  game.settings.register(ns, "currency.syncToSystem", {
    name: "CALDERIS.Currency.Settings.Sync.Label",
    hint: "CALDERIS.Currency.Settings.Sync.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      none: game.i18n.localize("CALDERIS.Currency.Settings.Sync.Options.none"),
      referenceToGP: game.i18n.localize("CALDERIS.Currency.Settings.Sync.Options.referenceToGP"),
    },
    default: "none",
  });

  // Snapshot take (button)
  game.settings.register(ns, "currency.snapshot.take", {
    name: "CALDERIS.Currency.Snapshot.Take.Label",
    hint: "CALDERIS.Currency.Snapshot.Take.Hint",
    scope: "world",
    config: true,
    type: (window as any).String, // dummy
    default: "",
    onClick: async () => {
      const go = await safeConfirm(
        "Calderis — Snapshot",
        t("CALDERIS.Currency.Snapshot.Take.Confirm")
      );
      if (!go) return;
      const count = await takeSnapshotAll();
      ui.notifications?.info(
        count > 0
          ? t("CALDERIS.Currency.Snapshot.Take.Success", { count })
          : t("CALDERIS.Currency.Snapshot.Take.NoneFound")
      );
      log.info(`Snapshot terminé: ${count} acteur(s).`);
    },
  } as any);

  // Snapshot restore (button)
  game.settings.register(ns, "currency.snapshot.restore", {
    name: "CALDERIS.Currency.Snapshot.Restore.Label",
    hint: "CALDERIS.Currency.Snapshot.Restore.Hint",
    scope: "world",
    config: true,
    type: (window as any).String,
    default: "",
    onClick: async () => {
      const go = await safeConfirm(
        "Calderis — Restore",
        t("CALDERIS.Currency.Snapshot.Restore.Confirm")
      );
      if (!go) return;
      const count = await restoreSnapshotAll();
      ui.notifications?.info(
        count > 0
          ? t("CALDERIS.Currency.Snapshot.Restore.Success", { count })
          : t("CALDERIS.Currency.Snapshot.Restore.NoSnapshot")
      );
      log.info(`Restauration terminée: ${count} acteur(s).`);
    },
  } as any);

  log.info("Settings currency enregistrés.");
}
