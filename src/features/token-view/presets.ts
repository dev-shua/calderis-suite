import { Preset } from "./service";

export const TOKENVIEW_PRESETS: Record<string, Preset> = {
  "sight:darkvision-18": {
    id: "sight:darkvision-18",
    label: "CS.TokenView.Preset.Darkvision18",
    type: "sight",
    sight: {
      visionMode: "darkvision",
      range: 18,
      angle: 360,
    },
  },
  "sight:blindness": {
    id: "sight:blindness",
    label: "CS.TokenView.Preset.Blindness",
    type: "sight",
    sight: {
      visionMode: "basic",
      range: 0,
    },
  },
  "light:torch-6-12": {
    id: "light:torch-6-12",
    label: "CS.TokenView.Preset.Torch6_12",
    type: "light",
    light: {
      dim: 12,
      bright: 6,
      color: "#ff9b48",
      alpha: 0.25,
      animation: {
        type: "torch",
        speed: 2,
        intensity: 5,
      },
    },
  },
} as const;
