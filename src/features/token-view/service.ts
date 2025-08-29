import { MODULE_ID } from "@/utils/constants";

export type SightPatch = Partial<{
  enabled: boolean;
  range: number | null;
  angle: number;
  visionMode: string;
}>;
export type LightPatch = Partial<{
  dim: number;
  bright: number;
  color: string | null;
  alpha: number;
  angle: number;
  animation: {
    type: string;
    speed: number;
    intensity: number;
    reverse?: boolean;
  };
}>;
export type Preset = {
  id: string;
  label: string;
  type: "sight" | "light" | "both";
  sight?: SightPatch;
  light?: LightPatch;
};
type Snapshot = { sight?: SightPatch; light?: LightPatch; detectionModes?: any };
type TokenDoc = {
  sight: any;
  light: any;
  update(d: any): Promise<unknown>;
  getFlag(s: string, k: string): unknown;
  setFlag(s: string, k: string, v: unknown): Promise<unknown>;
};
const clone = <T>(o: T) => foundry.utils.deepClone(o);

const getSnap = (t: TokenDoc) => (t.getFlag(MODULE_ID, "snapshot") ?? {}) as Snapshot;
const setSnap = (t: TokenDoc, s: Snapshot) => t.setFlag(MODULE_ID, "snapshot", s);

export const snapshot = async (token: TokenDoc, type: Preset["type"]) => {
  const snap = getSnap(token);
  if (type !== "light" && !snap.sight) {
    snap.sight = clone(token.sight);
  }
  if (type !== "sight" && !snap.light) {
    snap.light = clone(token.light);
  }
  await setSnap(token, snap);
};

const snapshotForPreset = async (token: any, preset: Preset) => {
  const snap = getSnap(token);
  if (preset.sight && !snap.sight) snap.sight = clone(token.sight);
  if (preset.sight && !snap.detectionModes)
    snap.detectionModes = clone((token as any).detectionModes);
  if (preset.light && !snap.light) snap.light = clone(token.light);
  await setSnap(token, snap);
};

export const applyPreset = async (token: TokenDoc, preset: Preset) => {
  await snapshotForPreset(token, preset);
  const patch: any = {};
  if (preset.sight) {
    patch.sight = preset.sight;
  }
  if (preset.light) {
    patch.light = preset.light;
  }
  await token.update(patch);
};

export const revert = async (token: TokenDoc, slot: "sight" | "light") => {
  const snap = getSnap(token);
  const patch: any = { [slot]: snap[slot] };
  if (slot === "sight" && snap.detectionModes) patch.detectionModes = snap.detectionModes;
  await token.update(patch);

  if (slot === "sight") {
    delete snap.sight;
    delete snap.detectionModes;
  } else {
    delete snap.light;
  }
  await setSnap(token, snap);

  // const v = (snap as any)[slot];
  // if (!v) return;
  // await token.update({ [slot]: v });
  // delete (snap as any)[slot];
  // await setSnap(token, snap);
};
