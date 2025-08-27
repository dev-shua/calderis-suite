/* eslint-disable @typescript-eslint/no-explicit-any */
import log from "@/utils/logger";
import { Settings } from "@/core/settings";
import { DistanceOverlay } from "./overlay";
import { TokenDocumentLike, TokenLike } from "@/types/foundry-v13-exports";

/* ---------- Helpers géométrie / grille ---------- */

function cellCenter(grid: any, i: number, j: number): { x: number; y: number } {
  const g = grid as any;
  if (typeof g.getCenterPoint === "function") {
    const p = g.getCenterPoint({ i, j });
    return { x: p.x, y: p.y };
  } else {
    const t = g.getCenter(i, j); // [x,y] legacy
    const cx = Array.isArray(t) ? t[0] : (t?.x ?? 0);
    const cy = Array.isArray(t) ? t[1] : (t?.y ?? 0);
    return { x: cx, y: cy };
  }
}

function dnd5eSpaces(dx: number, dy: number): number {
  const diag = Math.min(dx, dy);
  const straight = Math.max(dx, dy) - diag;
  const diagCost = Math.floor(diag / 2) * 3 + (diag % 2);
  return straight + diagCost;
}

function minSpacesFromTokenToCell(grid: any, tokenA: TokenLike, iB: number, jB: number): number {
  const tl = grid.getOffset({ x: tokenA.document.x, y: tokenA.document.y });
  const w = tokenA.document.width ?? 1;
  const h = tokenA.document.height ?? 1;
  let best = Number.POSITIVE_INFINITY;
  for (let iA = tl.i; iA < tl.i + w; iA++) {
    for (let jA = tl.j; jA < tl.j + h; jA++) {
      const dx = Math.abs(iB - iA);
      const dy = Math.abs(jB - jA);
      const sp = dnd5eSpaces(dx, dy);
      if (sp < best) best = sp;
    }
  }
  return isFinite(best) ? best : 0;
}

type RoundingMode = "nearest" | "floor" | "ceil";
function roundToStep(value: number, step: number, mode: RoundingMode): number {
  if (!Number.isFinite(step) || step <= 0) return Number(value.toFixed(3));
  const q = value / step;
  const r = mode === "floor" ? Math.floor(q) : mode === "ceil" ? Math.ceil(q) : Math.round(q);
  return Number((r * step).toFixed(3));
}

function computeStep(): number {
  const gridDist = Number((canvas?.scene as any)?.grid?.distance ?? 1);
  const src = (Settings.get("distance.stepSource") as "none" | "cell" | "custom") ?? "cell";
  if (src === "none") return 0;
  if (src === "custom") {
    const s = Number(Settings.get("distance.customStep"));
    return Number.isFinite(s) && s > 0 ? s : gridDist;
  }

  const raw = Settings.get("distance.stepFraction");
  let frac = typeof raw === "string" ? parseFloat(raw) : Number(raw);
  if (!Number.isFinite(frac) || frac <= 0) frac = 1;
  return gridDist * frac;
}

function canCurrentUserSeeFor(selected: TokenLike): boolean {
  const user = game.user!;
  const mode = Settings.get("distance.visibleTo") as "gm" | "gmOwners" | "everyone";
  if (user.isGM) return true;
  if (mode === "everyone") return true;
  if (mode === "gm") return false;
  return selected.document.isOwner || false;
}

function canSeeTokenForUser(token: TokenLike): boolean {
  const user = game.user!;
  if (user.isGM) return true;
  if (token.document.hidden) return false;
  const requireLOS = Settings.get("distance.requireLOS") ?? false;
  if (requireLOS) {
    const vis = canvas?.visibility?.testVisibility(token.center, { object: token }) ?? true;
    if (!vis) return false;
  }
  return token.visible !== false;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/* ---------- Feature ---------- */

export class DistanceFeature {
  private overlay = new DistanceOverlay();
  private hovered: TokenLike | null = null;
  private altDown = false;
  private tickerFn: (() => void) | null = null;

  private onKeyDown = (ev: KeyboardEvent) => {
    const prev = this.altDown;
    this.altDown = ev.altKey || ev.key === "Alt";
    if (this.hovered && this.altDown !== prev) this.updateTooltip(this.hovered);
  };

  private onKeyUp = (ev: KeyboardEvent) => {
    const prev = this.altDown;
    if (ev.key === "Alt" || !ev.altKey) this.altDown = false;
    if (this.hovered && this.altDown !== prev) this.updateTooltip(this.hovered);
  };

  enable() {
    Hooks.on("hoverToken", this.onHoverToken);
    Hooks.on("controlToken", this.onControlChange);
    Hooks.on("deleteToken", this.onAnyChange);
    Hooks.on("updateToken", this.onTokenUpdate);
    Hooks.on("canvasReady", this.onCanvasReady);
    Hooks.on("canvasPan", this.onCanvasPan);

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  disable() {
    Hooks.off("hoverToken", this.onHoverToken);
    Hooks.off("controlToken", this.onControlChange);
    Hooks.off("deleteToken", this.onAnyChange);
    Hooks.off("updateToken", this.onTokenUpdate);
    Hooks.off("canvasReady", this.onCanvasReady);
    Hooks.off("canvasPan", this.onCanvasPan);

    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);

    this.stopTicker();
    this.overlay.destroy();
  }

  private onCanvasReady = () => {
    this.stopTicker();
    this.hovered = null;
    this.overlay.hide();
  };

  private onCanvasPan = () => {
    this.overlay.refresh();
  };

  private onControlChange = () => {
    if (!this.hovered) return;
    this.updateTooltip(this.hovered);
  };

  private onAnyChange = () => {
    const selected = canvas?.tokens?.controlled?.[0];
    if (!selected) this.overlay.hide();
  };

  private onTokenUpdate = (doc: TokenDocumentLike) => {
    if (!this.hovered) return;
    const sel = canvas?.tokens?.controlled?.[0];
    if (!sel) return this.overlay.hide();
    if (doc.id === sel.id || doc.id === this.hovered.id) this.updateTooltip(this.hovered);
  };

  private onHoverToken = (tok: TokenLike, hovered: boolean) => {
    const enabled = Settings.get("distance.enabled");
    if (!enabled) {
      this.stopTicker();
      this.hovered = null;
      this.overlay.hide();
      return;
    }
    if (!hovered) {
      this.stopTicker();
      this.hovered = null;
      this.overlay.hide();
      return;
    }

    this.hovered = tok;
    this.startTicker();
    this.updateTooltip(this.hovered);
  };

  private startTicker() {
    if (this.tickerFn) return;
    this.tickerFn = () => {
      if (!this.hovered) return;
      // garde ALT synchro, au cas où keyup/down rate
      const km = (game as any)?.keyboard;
      if (km?.isModifierActive) this.altDown = !!km.isModifierActive("Alt");
      this.updateTooltip(this.hovered!);
    };
    (canvas as any)?.app?.ticker?.add?.(this.tickerFn);
  }

  private stopTicker() {
    if (!this.tickerFn) return;
    (canvas as any)?.app?.ticker?.remove?.(this.tickerFn);
    this.tickerFn = null;
  }

  private updateTooltip(tokenB: TokenLike) {
    const selected = canvas?.tokens?.controlled?.[0];
    if (!selected) return this.overlay.hide();
    if (selected.id === tokenB.id) return this.overlay.hide();
    if (!canCurrentUserSeeFor(selected)) return this.overlay.hide();
    if (!canSeeTokenForUser(tokenB)) return this.overlay.hide();

    const grid = canvas?.grid;
    const scene = canvas?.scene as any;
    if (!grid || !scene) return this.overlay.hide();

    const sizePx = canvas?.dimensions?.size ?? 1; // px / case
    const per = Number(scene.grid?.distance ?? 1); // unités / case (ex: 1.5)
    const wPx = (tokenB.w ?? tokenB.width) || tokenB.getBounds().width;
    const hPx = (tokenB.h ?? tokenB.height) || tokenB.getBounds().height;
    const unitsW = wPx / sizePx;
    const unitsH = hPx / sizePx;
    const isLarge = Math.max(unitsW, unitsH) >= 2 - 1e-6;

    // case cible par défaut = centre du tokenB
    let { i: iB, j: jB } = grid.getOffset({ x: tokenB.center.x, y: tokenB.center.y });
    let { x: cx, y: cy } = cellCenter(grid, iB, jB);

    // ---- ALT + token large → case EXACTE sous le curseur (coord. MONDE) ----
    if (isLarge && this.altDown) {
      const g = (canvas as any)?.app?.renderer?.events?.pointer?.global; // écran
      if (g && typeof g.x === "number") {
        const world = (canvas as any).stage.toLocal(g); // écran -> monde
        const ij = grid.getOffset({ x: world.x, y: world.y });
        const tlB = grid.getOffset({ x: tokenB.document.x, y: tokenB.document.y });
        const wB = tokenB.document.width ?? 1;
        const hB = tokenB.document.height ?? 1;

        iB = clamp(ij.i, tlB.i, tlB.i + wB - 1);
        jB = clamp(ij.j, tlB.j, tlB.j + hB - 1);
        ({ x: cx, y: cy } = cellCenter(grid, iB, jB));
      }
    }

    // ---- Distance brute (raw) ----
    let raw: number;
    if (isLarge && this.altDown) {
      // Euclidien : centre(selected) -> centre(case sous curseur)
      const a = selected.center;
      const dx = cx - a.x;
      const dy = cy - a.y;
      const px = Math.hypot(dx, dy); // pixels
      raw = (px / sizePx) * per; // -> unités de scène
    } else {
      // Règle 5e : emprise(selected) -> case cible (centre du tokenB par défaut)
      const spaces = minSpacesFromTokenToCell(grid, selected, iB, jB);
      raw = spaces * per;
    }

    // ---- Arrondi & affichage ----
    const step = computeStep();
    const mode = (Settings.get("distance.roundingMode") as RoundingMode) ?? "nearest";
    const d = roundToStep(raw, step, mode);

    const unit = String(scene.grid?.units ?? "").trim();
    const label = unit ? `${d} ${unit}` : `${d}`;

    const fontPx = Settings.get("distance.textSize") ?? 13;
    this.overlay.setFontSize(fontPx);
    this.overlay.showAtTokenBottomCenter(label, tokenB, 6);
  }
}

export function enableDistanceFeature() {
  new DistanceFeature().enable();
}
