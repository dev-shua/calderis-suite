/* eslint-disable @typescript-eslint/no-explicit-any */
import { HbAppCtor } from "@/types/appv2-shim";

// Rendu HBS (supporte renderTemplate et getTemplate)
export async function renderHbs(path: string, data: unknown): Promise<string> {
  const rt = (globalThis as any).renderTemplate;
  if (typeof rt === "function") return await rt(path, data);
  const gt = (globalThis as any).getTemplate;
  if (typeof gt === "function") {
    const tpl = await gt(path);
    return typeof tpl === "function" ? tpl(data) : String(tpl ?? "");
  }
  throw new Error("No template renderer available");
}

// FormApplication v13
export function getFormApplicationCtor(): new (...args: any[]) => any {
  return (
    (globalThis as any)?.foundry?.appv1?.api?.FormApplication ??
    (globalThis as any)?.FormApplication
  );
}

// FilePicker v13
export function getFilePickerCtor(): new (...args: any[]) => any {
  return (
    (globalThis as any)?.FilePicker ?? (globalThis as any)?.foundry?.applications?.api?.FilePicker
  );
}

// Préchargement templates (optionnel)
export function preloadTemplates(paths: string[]): void {
  const fn = (globalThis as any).loadTemplates;
  if (typeof fn === "function") void fn(paths);
}

/** Retourne ApplicationV2 mixin Handlebars, typé. Fallback v1 si introuvable. */
export function getHbAppCtor(): HbAppCtor {
  const api = (globalThis as any)?.foundry?.applications?.api;
  const Base = api?.ApplicationV2;
  const Hb = api?.HandlebarsApplicationMixin;
  if (typeof Hb === "function" && typeof Base === "function") {
    return Hb(Base) as unknown as HbAppCtor;
  }
  // Fallback dev: renvoie FormApplication pour ne pas crasher hors-Foundry
  return ((globalThis as any)?.FormApplication ?? class {}) as HbAppCtor;
}

/** Titre fenêtre (juste pour être explicite) */
export function v2Title(s: string): string {
  return String(s ?? "");
}
