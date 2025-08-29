export type SelectionEntry<A = DnD5e.Actor5e> = {
  token: any;
  actor: A | null;
  prototype: any | null;
};

export function getSelectionWithPrototypes<A = DnD5e.Actor5e>(): SelectionEntry<A>[] {
  const controlled = (canvas as any)?.tokens?.controlled ?? [];
  return controlled.map((t: any) => {
    const td = t.document as any;
    const tokenActor = td.actor ?? null;
    const worldActor =
      tokenActor && tokenActor.isToken
        ? ((game as any).actors?.get(tokenActor.id) ?? null)
        : tokenActor;
    const prototype = worldActor?.prototypeToken ?? null;
    return { token: td, actor: worldActor as A | null, prototype };
  });
}
