import { MODULE_ID } from "@/utils/constants";
import { PANEL_ID } from "./app";
import log from "@/utils/logger";
import { partyPanel } from "./panels/party.panel";
import { tokensPanel } from "./panels/tokens.panel";
import { Settings } from "../settings";

let WIRED_SHELL = false;
let currentTool: string | null = null;
export const LAYOUT = `modules/${MODULE_ID}/templates/core/dock.hbs`;
export interface DockPanel {
  id: string;
  template: string;
  getContext(): Promise<object>;
  bind(root: HTMLElement): void;
}
const PANELS: Record<string, DockPanel> = {
  party: partyPanel,
  tokens: tokensPanel,
};

const ensureCurrentTool = (): string => {
  if (currentTool) return currentTool;
  try {
    currentTool = (Settings.get("dmDock.tool") as string) ?? "party";
  } catch {
    currentTool = "party";
  }
  return currentTool;
};

export const getCurrentTool = () => ensureCurrentTool();

export function wireDockShellHandlers() {
  if (WIRED_SHELL) return;
  WIRED_SHELL = true;

  document.addEventListener("click", async (ev) => {
    const root = document.getElementById(PANEL_ID);
    const target = ev.target as HTMLElement | null;
    if (!root || !target || !target.closest(`#${PANEL_ID}`)) return;

    const el = target.closest<HTMLElement>("[data-action]");
    if (!el) return;

    const action = el.dataset.action;

    if (action === "switch-tool") {
      const newTool = el.dataset.tool;
      if (!newTool || newTool === ensureCurrentTool()) return;
      currentTool = newTool;
      try {
        await Settings.set("dmDock.tool", currentTool);
      } catch {}
      await renderDock(currentTool);
      updateActiveToolUI(currentTool);
    }
  });
}

export const updateActiveToolUI = (tool: string) => {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  panel.setAttribute("data-tool", tool);

  const btns = panel.querySelectorAll<HTMLElement>('[data-action="switch-tool"]');
  btns.forEach((b) => {
    const is = b.dataset.tool === tool;
    b.classList.toggle("is-active", is);
    b.setAttribute("aria-pressed", is ? "true" : "false");
  });
};

export const getPanelTemplates = (): string[] => {
  return Object.values(PANELS).map((p) => p.template);
};

async function hb() {
  return (foundry as any).applications.handlebars;
}

export async function renderDock(tool: string | null): Promise<void> {
  wireDockShellHandlers();
  const effectiveTool = tool ?? ensureCurrentTool();
  currentTool = effectiveTool;

  const panelElement = document.getElementById(PANEL_ID);
  if (!panelElement) return;

  const api = await hb();
  const panel = PANELS[effectiveTool] ?? PANELS["party"];

  const sub = await api.getTemplate(panel.template);
  (Handlebars as any).registerPartial("content", sub);

  const panelCtx = await panel.getContext();

  const html = await api.renderTemplate(LAYOUT, {
    tool: effectiveTool,
    panel: panelCtx,
    title: game?.i18n?.localize?.("CS.DMDock.Title") ?? "Dock MJ",
  });
  panelElement.innerHTML = html;
  updateActiveToolUI(effectiveTool);

  try {
    panel.bind(panelElement);
  } catch (e) {
    log.warn("Panel bind failed", e);
  }
}

export function setDockOpen(open: boolean): void {
  const root = document.getElementById("calderis-dm-dock-root");
  const panel = document.getElementById(PANEL_ID);
  if (!root || !panel) return;
  panel.classList.toggle("is-open", open);
  root.setAttribute("aria-hidden", open ? "false" : "true");
}
