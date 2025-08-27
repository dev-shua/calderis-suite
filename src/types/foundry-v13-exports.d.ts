/* 📦 Types Foundry VTT v13 — à importer dans ton code */
export interface HbAppBase {
  options: any;
  id?: string;
  title?: string;
  element?: HTMLElement | any;

  render(force?: boolean, options?: any): Promise<void> | void;
  close(options?: any): Promise<void> | void;

  getData?(): Promise<any> | any;
  _prepareContext?(): Promise<any> | any;
  activateListeners?(html: any): void;

  onKeyDown?(ev: KeyboardEvent): void;
  onDragStart?(ev: DragEvent): void;
  onDrop?(ev: DragEvent): void;
  submit?(ev?: Event): Promise<any> | any;
}

export interface HbAppStatic {
  DEFAULT_OPTIONS?: any;
  PARTS?: Record<string, { template: string }>;
  new (options?: any): HbAppBase;
}

export type HbAppCtor = HbAppStatic;

/* Const pour extends “à la main” */
declare const ApplicationV2: HbAppStatic;
export { ApplicationV2 };

export interface TokenDocumentLike {
  id?: string;
  x?: number; // top-left (scene units)
  y?: number; // top-left (scene units)
  width?: number; // en cases
  height?: number; // en cases
  isOwner?: boolean;
  hidden?: boolean;
}

export interface TokenLike {
  // Identité / base
  id?: string;
  name?: string;

  // Document sous-jacent
  document: TokenDocumentLike;

  // Position et taille RUNTIME (placeable)
  x?: number; // top-left (pixels monde)
  y?: number; // top-left (pixels monde)
  w?: number; // largeur px (certains modules l'utilisent)
  h?: number; // hauteur px
  width?: number; // largeur px (alternative)
  height?: number; // hauteur px

  // Utilitaires fréquents
  center: { x: number; y: number }; // centre en px (monde)
  getBounds(): { width: number; height: number }; // bounding box px
  visible?: boolean;
}

export interface GridLike {
  getOffset(args: { x: number; y: number }): { i: number; j: number };
  getCenter?(i: number, j: number): [number, number] | { x: number; y: number };
  getCenterPoint?(args: { i: number; j: number }): { x: number; y: number };
}
