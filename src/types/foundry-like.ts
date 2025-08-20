/** Surface minimale "like Foundry" — étend au besoin. */

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
