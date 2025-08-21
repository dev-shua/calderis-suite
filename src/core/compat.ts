/* eslint-disable @typescript-eslint/no-explicit-any */
import { HbAppCtor } from "@/types/appv2-shim";

/** Rendu Handlebars compatible v13+ (fallback v10–v12). */
export async function renderHbs(path: string, data: unknown): Promise<string> {
  const foundryNS = (globalThis as any)?.foundry;

  // v13+: API officielle
  const hbs = foundryNS?.applications?.handlebars;
  if (typeof hbs?.renderTemplate === "function") {
    return await hbs.renderTemplate(path, data);
  }

  // Fallback: compile + exécute
  const getT = hbs?.getTemplate ?? foundryNS?.utils?.getTemplate; // vieux fallback silencieux si runtime < v13
  if (typeof getT === "function") {
    const tpl = await getT(path);
    return typeof tpl === "function" ? tpl(data) : String(tpl ?? "");
  }

  // Dernier filet (très vieux): global renderTemplate
  const legacy = (globalThis as any)?.renderTemplate;
  if (typeof legacy === "function") return await legacy(path, data);

  throw new Error("No template renderer available");
}

/** FormApplication (v1) – utile en fallback si AppV2 indispo. */
export function getFormApplicationCtor(): new (...args: any[]) => any {
  return (
    (globalThis as any)?.foundry?.appv1?.api?.FormApplication ??
    (globalThis as any)?.FormApplication
  );
}

/** FilePicker v13+ (fallback v12). */
export function getFilePickerCtor(): new (...args: any[]) => any {
  const api = (globalThis as any)?.foundry?.applications?.api;
  return (api?.FilePicker ?? (globalThis as any)?.FilePicker) as any;
}

/** Précharge les templates sans warnings (compile en cache). */
export async function preloadTemplates(paths: string[]): Promise<void> {
  const hbs = (globalThis as any)?.foundry?.applications?.handlebars;
  const getT = hbs?.getTemplate ?? (globalThis as any)?.foundry?.utils?.getTemplate ?? null;

  if (typeof getT === "function") {
    await Promise.all(paths.map((p) => getT(p)));
    return;
  }

  // Vieux runtime: tolère loadTemplates si présent
  const load = hbs?.loadTemplates ?? (globalThis as any)?.loadTemplates;
  if (typeof load === "function") await load(paths);
}

/** Retourne ApplicationV2 mixin Handlebars, typé. Fallback v1 si introuvable. */
export function getHbAppCtor(): HbAppCtor {
  const api = (globalThis as any)?.foundry?.applications?.api;
  const Base = api?.ApplicationV2;
  const Hb = api?.HandlebarsApplicationMixin;
  if (typeof Hb === "function" && typeof Base === "function") return Hb(Base) as HbAppCtor;
  // fallback dev: renvoie FormApplication pour ne pas crasher hors-Foundry
  return ((globalThis as any)?.FormApplication ?? class {}) as HbAppCtor;
}

/** Titre fenêtre (juste pour être explicite) */
export function v2Title(s: string): string {
  return String(s ?? "");
}
