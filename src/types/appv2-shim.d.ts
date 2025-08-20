// src/types/appv2-shim.d.ts
/* Minimal shim pour Application V2 + mixin Handlebars */

export interface HbAppBase {
  /** Rendu / cycle de vie */
  render(force?: boolean, options?: any): any;
  close(options?: any): Promise<void>;

  /** Racine DOM (selon runtime : HTMLElement ou jQuery-like) */
  element?: HTMLElement | any;

  /** Hooks d’instance optionnels (on les “override” côté app) */
  activateListeners?(html: any): void;
  getData?(): Promise<any>; // pont v2→v1 si besoin
  _prepareContext?(): Promise<any>; // AppV2 (HandlebarsApplicationMixin)
}

export interface HbAppStatic {
  DEFAULT_OPTIONS?: any;
  PARTS?: Record<string, { template: string }>;
  new (options?: any): HbAppBase;
}

export type HbAppCtor = HbAppStatic;
