/* eslint-disable @typescript-eslint/no-explicit-any */
import { TokenLike } from "@/types/foundry-like";
import log from "@/utils/logger";

function tokenMetrics(t: TokenLike) {
  // largeur/hauteur : priorité au runtime (w/h), sinon width/height, sinon bounds
  const b = t.getBounds?.() ?? { width: 0, height: 0 };
  const w = t.w ?? t.width ?? b.width ?? 0;
  const h = t.h ?? t.height ?? b.height ?? 0;

  // centre : priorité au champ center (toujours fiable), sinon déduit de x/y + w/h
  const cx = t.center?.x ?? (t.x ?? 0) + w / 2;
  const cy = t.center?.y ?? (t.y ?? 0) + h / 2;

  // coin haut-gauche : si x/y manquants, on les déduit depuis le centre
  const x = t.x ?? cx - w / 2;
  const y = t.y ?? cy - h / 2;

  const by = y + h; // bottom y
  const rx = x + w; // right x (si besoin ailleurs)

  return { x, y, w, h, cx, cy, by, rx };
}

export class DistanceOverlay {
  private el: HTMLDivElement | null = null;
  private lastWorld: { x: number; y: number } | null = null;

  private ensureEl() {
    if (this.el) return;
    const el = document.createElement("div");
    el.className = "calderis-distance-tooltip";
    Object.assign(el.style, {
      position: "fixed",
      left: "0px",
      top: "0px",
      transform: "translate(-50%, 0)", // ancre horizontale au centre, EMPLACEMENT SOUS le point
      pointerEvents: "none",
      zIndex: "999999",

      // Style “badge” Foundry-like
      padding: "3px 10px",
      borderRadius: "4px",
      background: "rgba(0,0,0,0.7)",
      color: "#fff",
      fontFamily: 'Inter, ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial',
      fontSize: "13px",
      fontWeight: "600",
      lineHeight: "1.2",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.08) inset, 0 2px 6px rgba(0,0,0,0.35)",
      whiteSpace: "nowrap",
      visibility: "hidden",
    } as CSSStyleDeclaration);

    document.body.appendChild(el);
    this.el = el;
  }

  /** monde → écran (pixels de viewport), indépendant du zoom pour le rendu DOM */
  private worldToScreen(x: number, y: number) {
    const stage = canvas?.stage as any;
    const PIXI = (globalThis as any).PIXI as any;
    if (!stage || !PIXI) return { x, y };
    const out = stage.worldTransform.apply(new PIXI.Point(x, y));
    return { x: out.x, y: out.y };
  }

  /** Repositionne d’après la dernière coord monde (appelé sur pan/zoom) */
  refresh(offsetPx = 6) {
    if (!this.el || !this.lastWorld) return;
    const s = this.worldToScreen(this.lastWorld.x, this.lastWorld.y);
    this.el.style.left = `${Math.round(s.x)}px`;
    this.el.style.top = `${Math.round(s.y + offsetPx)}px`; // sous le point
  }

  /** Affiche le label à une coord monde précise (bas-centre du token calculé ailleurs) */
  showAtWorld(text: string, worldX: number, worldY: number, offsetPx = 6) {
    try {
      this.ensureEl();
      if (!this.el) return;
      this.lastWorld = { x: worldX, y: worldY };
      this.el.textContent = text;
      this.el.style.visibility = "visible";
      this.refresh(offsetPx);
    } catch (e) {
      log.warn("DistanceOverlay show error", e);
    }
  }

  /** Helper: bas-centre du token (x = centre, y = bas du token) */
  showAtTokenBottomCenter(text: string, token: TokenLike, offsetPx = 6) {
    const m = tokenMetrics(token);
    this.showAtWorld(text, m.cx, m.by, offsetPx);
  }

  setFontSize(px: number) {
    this.ensureEl();
    if (this.el) this.el.style.fontSize = `${Math.max(8, Math.min(48, px))}px`;
  }

  hide() {
    if (this.el) this.el.style.visibility = "hidden";
  }

  destroy() {
    try {
      if (this.el?.parentElement) this.el.parentElement.removeChild(this.el);
    } catch {
      /* ignore */
    } finally {
      this.el = null;
      this.lastWorld = null;
    }
  }
}
