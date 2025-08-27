/* 🌍 Shims Foundry VTT v13 — Exposition globale */
/* Pas d'export/import ici ! */

/* Globals fréquents */
declare const game: any;
declare const ui: any;
declare const Hooks: {
  once(h: string, fn: (...a: any[]) => void): void;
  on(h: string, fn: (...a: any[]) => void): void;
  off(h: string, fn: (...a: any[]) => void): void;
  call(h: string, ...args: any[]): any;
  callAll(h: string, ...args: any[]): any;
};
declare const Handlebars: any;
declare const CONFIG: any;
declare const canvas: any;

/* Handlebars API v13 */
declare const foundry: {
  applications: {
    handlebars: {
      renderTemplate: (path: string, data?: any) => Promise<string>;
      loadTemplates: (paths: string[] | Record<string, string>) => Promise<any>;
      getTemplate: (path: string, id?: string) => Promise<HandlebarsTemplateDelegate>;
    };
  };
  utils?: any;
  [k: string]: any;
};

/* Helpers historiques */
declare function renderTemplate(path: string, data?: any): Promise<string>;
declare function loadTemplate(path: string): Promise<HandlebarsTemplateDelegate>;
