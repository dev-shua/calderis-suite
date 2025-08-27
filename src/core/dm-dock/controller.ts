import { Settings } from "@/core/settings";
import { renderDock, setDockOpen } from "./view";
import { RAIL_ID } from "./app";
import { setDockTop } from "./layout";
import log from "@/utils/logger";

export class DockController {
  private isOpen = false;
  private currentTool = "party";
  private isAnimating = false;
  private rerenderTimer: number | null = null;

  async init(): Promise<void> {
    // État initial (par défaut fermé)
    this.isOpen = !!Settings.get?.("dmDock.open");
    this.currentTool = Settings.get?.("dmDock.tool") ?? "party";

    await renderDock(this.currentTool);
    setDockOpen(this.isOpen);

    const rail = document.getElementById(RAIL_ID);
    if (!rail) return;

    // Clicks sur outils
    rail.addEventListener("click", async (ev) => {
      const btn = (ev.target as HTMLElement)?.closest<HTMLButtonElement>(".dock-tool");
      if (!btn) return;
      const tool = btn.dataset.tool ?? "party";
      if (tool !== this.currentTool) {
        this.currentTool = tool;
        Settings.set?.("dmDock.tool", tool);
        rail.querySelectorAll(".dock-tool").forEach((b) => {
          const el = b as HTMLButtonElement;
          const active = el.dataset.tool === tool;
          el.classList.toggle("is-active", active);
          el.setAttribute("aria-pressed", active ? "true" : "false");
        });
        await renderDock(this.currentTool);
        await this.open(); // ouvre au clic d’un outil
      } else {
        this.toggle(); // même outil => toggle
      }
    });

    // Drag vertical sur la rail (pas sur les boutons)
    this.wireDragHandle(rail);

    Hooks.on("createActor", (a: any) => {
      if (this.isRelevant(a)) this.requestRerender();
    });
    Hooks.on("updateActor", (a: any, change: any) => {
      log.info("[Dock] updateActor fired:", a?.name, change);
      if (this.isRelevant(a)) this.requestRerender();
    });
    Hooks.on("deleteActor", (a: any) => {
      if (this.isRelevant(a)) this.requestRerender();
    });
    Hooks.on("cs:dmdock:configChanged", () => this.requestRerender());
  }

  private wireDragHandle(rail: HTMLElement): void {
    const handle = rail.querySelector<HTMLButtonElement>(".dock-drag");
    if (!handle) return;

    let dragging = false;
    let startY = 0;
    let startTop = 0;

    const getTop = () => parseInt((rail.style.top || "0").replace("px", ""), 10) || 0;
    const clamp = (v: number) => {
      const h = window.innerHeight;
      const railH = rail.offsetHeight || 48;
      const min = 8;
      const max = Math.max(min, h - railH - 8);
      return Math.min(max, Math.max(min, v));
    };

    handle.addEventListener("pointerdown", (ev) => {
      dragging = true;
      startY = ev.clientY;
      startTop = getTop();
      handle.setPointerCapture?.(ev.pointerId);
    });

    handle.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      const dy = ev.clientY - startY;
      const top = clamp(startTop + dy);
      // applique à rail + panel
      setDockTop(top);
    });

    const endDrag = async (ev: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      handle.releasePointerCapture?.(ev.pointerId);
      const top = getTop();
      await Settings.set?.("dmDock.positionY", top);
    };

    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
  }

  private wireDrag(rail: HTMLElement): void {
    let dragging = false;
    let startY = 0;
    let startTop = 0;
    let moved = false;

    const getTop = () => parseInt((rail.style.top || "0").replace("px", ""), 10) || 0;
    const clamp = (v: number) => {
      const h = window.innerHeight;
      const railH = rail.offsetHeight || 48;
      const min = 8;
      const max = Math.max(min, h - railH - 8);
      return Math.min(max, Math.max(min, v));
    };

    rail.addEventListener("pointerdown", (ev) => {
      const targetBtn = (ev.target as HTMLElement).closest(".dock-tool");
      if (targetBtn) return; // laissons le clic outil travailler
      dragging = true;
      moved = false;
      startY = ev.clientY;
      startTop = getTop();
      (ev.target as Element)?.setPointerCapture?.(ev.pointerId);
    });

    rail.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      const dy = ev.clientY - startY;
      if (Math.abs(dy) > 2) moved = true;
      const top = clamp(startTop + dy);
      setDockTop(top);
    });

    const endDrag = async (ev: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      (ev.target as Element)?.releasePointerCapture?.(ev.pointerId);
      const top = parseInt((rail.style.top || "0").replace("px", ""), 10) || 0;
      await Settings.set?.("dmDock.positionY", top);
    };

    rail.addEventListener("pointerup", endDrag);
    rail.addEventListener("pointercancel", endDrag);

    // Bloque une éventuelle propagation click si on a “vraiment” bougé
    rail.addEventListener(
      "click",
      (ev) => {
        if (moved) ev.stopPropagation();
        moved = false;
      },
      true
    );
  }

  private isRelevant(actor: DnD5e.Actor5e): boolean {
    return actor?.type === "character" && !!actor?.hasPlayerOwner;
  }

  private requestRerender(): void {
    if (this.rerenderTimer !== null) return;
    this.rerenderTimer = window.setTimeout(async () => {
      this.rerenderTimer = null;
      await renderDock(this.currentTool);
    }, 100);
  }

  async open(): Promise<void> {
    if (this.isOpen || this.isAnimating) return;
    this.isAnimating = true;
    await new Promise((r) => requestAnimationFrame(r));
    setDockOpen(true);
    this.isOpen = true;
    await Settings.set?.("dmDock.open", true);
    this.isAnimating = false;
  }

  async close(): Promise<void> {
    if (!this.isOpen || this.isAnimating) return;
    this.isAnimating = true;
    setDockOpen(false);
    await new Promise((r) => setTimeout(r, 150));
    this.isOpen = false;
    await Settings.set?.("dmDock.open", false);
    this.isAnimating = false;
  }

  toggle(): void {
    this.isOpen ? void this.close() : void this.open();
  }
}

export const dockController = new DockController();
