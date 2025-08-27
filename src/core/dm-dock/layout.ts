import { RAIL_ID, PANEL_ID } from "./app";

/** Applique la position verticale au rail ET au panel */
export function setDockTop(topPx: number): void {
  const rail = document.getElementById(RAIL_ID);
  const panel = document.getElementById(PANEL_ID);
  if (rail) rail.style.top = `${topPx}px`;
  if (panel) panel.style.top = `${topPx}px`;
}
