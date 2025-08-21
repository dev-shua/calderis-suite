/* eslint-disable @typescript-eslint/no-explicit-any */
import { MODULE_ID } from "@/utils/constants";
import { getLedger, set, add } from "./api";
import log from "@/utils/logger";
import { ReceiverNoticeForm } from "./receive.form";

/** ----------- Types ----------- */
type TransferItem = { currencyId: string; amount: number };
type TransferPayload = {
  fromActorId: string;
  toActorId: string;
  fromName: string;
  items?: TransferItem[];
  // rétro-compat mono-devise
  currencyId?: string;
  amount?: number;
};

type SysMsg =
  | { _id: string; ns: string; op: "__ping__"; from: string }
  | {
      _id: string;
      ns: string;
      op: "transfer-request";
      fromUserId: string;
      toUserId: string;
      payload: {
        fromActorId: string;
        toActorId: string;
        fromName: string;
        items: TransferItem[];
      };
    }
  | {
      _id: string;
      ns: string;
      op: "transfer-result";
      toUserId: string;
      payload: { ok: boolean; error?: string };
    };

/** ----------- Helpers ----------- */
function sysChannel(): string {
  const sysId = String((game as any)?.system?.id || "dnd5e");
  return `system.${sysId}`;
}
function uid(): string {
  try {
    const b = new Uint8Array(8);
    crypto.getRandomValues(b);
    return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  } catch {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}
function normalizeItems(p: TransferPayload): TransferItem[] {
  if (Array.isArray(p.items) && p.items.length) {
    return p.items
      .map((it) => ({
        currencyId: String(it?.currencyId ?? ""),
        amount: Math.max(0, Math.floor(Number(it?.amount ?? 0))),
      }))
      .filter((it) => it.currencyId && it.amount > 0);
  }
  const amt = Math.max(0, Math.floor(Number(p.amount ?? 0)));
  const cid = String(p.currencyId ?? "");
  return cid && amt > 0 ? [{ currencyId: cid, amount: amt }] : [];
}
function userOwnsActor(u: any, a: any): boolean {
  const OWNER = (globalThis as any).CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  if (!u || !a) return false;
  if (typeof a?.testUserPermission === "function") return a.testUserPermission(u, OWNER);
  const own = a?.ownership;
  if (own?.get) return Number(own.get(u.id)) >= OWNER;
  if (own && typeof own === "object") return Number(own[String(u.id)]) >= OWNER;
  return false;
}
function getActiveUserIdForActor(actorId: string): string | null {
  const actors = (game as any).actors;
  const a = actors?.get?.(actorId) ?? actors?.find?.((x: any) => String(x?.id) === String(actorId));
  if (!a) return null;

  const users: any[] = Array.from((game as any)?.users ?? []);
  // On préfère un propriétaire actif
  for (const u of users) {
    if (!u?.active || u?.isGM) continue;
    if (userOwnsActor(u, a)) return String(u.id);
  }
  // Sinon n’importe quel proprio
  for (const u of users) {
    if (u?.isGM) continue;
    if (userOwnsActor(u, a)) return String(u.id);
  }
  return null;
}
function rerenderAdjustWindows(): void {
  try {
    const wins = Object.values((ui as any)?.windows ?? {});
    for (const w of wins) {
      const el = (w as any)?.element?.[0] ?? (w as any)?.element;
      if (el?.classList?.contains?.("cs-currency-adjust")) (w as any).render?.(false);
    }
  } catch {
    /* no-op */
  }
}

/** ----------- Wiring (system.<id> uniquement) ----------- */
let WIRED_SYS = false;

export function wireCurrencyMessaging(): void {
  if (WIRED_SYS) return;
  WIRED_SYS = true;

  const ch = sysChannel();
  const sock = (game as any).socket;
  if (!sock) return;

  sock.on(ch, async (msg: SysMsg) => {
    try {
      if (!msg || typeof msg !== "object") return;
      if (msg.ns !== MODULE_ID) return;

      // PING TEST
      if (msg.op === "__ping__") {
        // console.info("[Calderis][SYS] ping recv", { from: msg.from });
        return;
      }

      // ACK coté donneur
      if (msg.op === "transfer-result") {
        const me = String((game as any).user?.id ?? "");
        if (msg.toUserId !== me) return;
        const ok = !!msg?.payload?.ok;
        const i18n = (game as any).i18n;
        if (ok)
          (ui as any)?.notifications?.info?.(
            i18n?.localize?.("CS.Currency.Msg.TransferOK") ?? "Transfer completed"
          );
        else
          (ui as any)?.notifications?.warn?.(
            i18n?.localize?.("CS.Currency.Msg.TransferFailed") ?? "Transfer failed"
          );
        rerenderAdjustWindows();
        return;
      }

      // Application côté receveur (client B)
      if (msg.op === "transfer-request") {
        const me = String((game as any).user?.id ?? "");
        if (msg.toUserId !== me) return; // pas pour moi

        const payload = msg.payload;
        if (!payload) return;

        const actors = (game as any).actors;
        const to =
          actors?.get?.(payload.toActorId) ??
          actors?.find?.((a: any) => String(a?.id) === String(payload.toActorId));
        if (!to) return;

        // Je dois posséder l’acteur destinataire
        const u = (game as any).user;
        if (!userOwnsActor(u, to)) return;

        // Crédit local
        for (const it of payload.items ?? []) {
          const amt = Math.max(0, Math.floor(Number(it?.amount ?? 0)));
          const cid = String(it?.currencyId ?? "");
          if (!cid || !amt) continue;
          await add(to, cid, amt);
        }

        // Popup info
        try {
          new (ReceiverNoticeForm as any)({
            fromName: String(payload.fromName ?? ""),
            items: Array.isArray(payload.items) ? payload.items : [],
          }).render(true);
        } catch (e) {
          log.warn("ReceiverNoticeForm render failed", e);
        }

        rerenderAdjustWindows();

        // ACK → donneur
        sock.emit(ch, {
          _id: uid(),
          ns: MODULE_ID,
          op: "transfer-result",
          toUserId: String(msg.fromUserId),
          payload: { ok: true },
        } as SysMsg);
      }
    } catch (e) {
      log.warn("[Calderis][SYS] handler failed", e);
    }
  });
}

/** ----------- Émission (donneur, côté A) ----------- */
export async function requestTransfer(p0: TransferPayload): Promise<void> {
  const p: TransferPayload = { ...p0, items: normalizeItems(p0) };
  const items = p.items ?? [];
  if (!items.length) {
    (ui as any)?.notifications?.warn?.("Nothing to transfer.");
    return;
  }

  const actors = (game as any).actors;
  const from = actors?.get?.(p.fromActorId) ?? actors?.find?.((a: any) => a.id === p.fromActorId);
  const to = actors?.get?.(p.toActorId) ?? actors?.find?.((a: any) => a.id === p.toActorId);
  if (!from || !to) {
    (ui as any)?.notifications?.error?.("Transfer failed: actor not found");
    return;
  }

  // Vérif soldes + débit local immédiat côté A
  const led = getLedger(from);
  for (const it of items) {
    const cur = Math.floor(Number(led[it.currencyId] ?? 0));
    if (cur < it.amount) {
      (ui as any)?.notifications?.warn?.("Insufficient funds.");
      return;
    }
  }
  for (const it of items) {
    const cur = Math.floor(Number(getLedger(from)[it.currencyId] ?? 0));
    await set(from, it.currencyId, cur - it.amount);
  }

  // Trouve un user destinataire actif (proprio du PJ B)
  const toUserId = getActiveUserIdForActor(p.toActorId);
  if (!toUserId) {
    (ui as any)?.notifications?.warn?.("Recipient not found or not owner.");
    return;
  }

  const ch = sysChannel();
  const sock = (game as any).socket;

  const msg: SysMsg = {
    _id: uid(),
    ns: MODULE_ID,
    op: "transfer-request",
    fromUserId: String((game as any).user?.id ?? ""),
    toUserId,
    payload: {
      fromActorId: String(p.fromActorId),
      toActorId: String(p.toActorId),
      fromName: String(p.fromName ?? from?.name ?? ""),
      items,
    },
  };

  sock.emit(ch, msg);
  (ui as any)?.notifications?.info?.(
    (game as any).i18n?.localize?.("CS.Currency.Msg.TransferOK") ?? "Transfer sent"
  );
}
