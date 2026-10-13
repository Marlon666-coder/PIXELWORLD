import { hexToRgb, type IslandPalette, type RGB } from "@/lib/world/procedural";

export const VOXEL_SIZE = 0.5;

export const WORLD_COLORS = {
  background: "#05040e",
  fog: "#0b0924",
  cyan: "#2de2f5",
  violet: "#9b6bff",
  magenta: "#f062e6",
  green: "#4cf08a",
  keyLight: "#c3ceff",
  rimLight: "#c77dff",
  ambient: "#4f5dff",
} as const;

export const GLOW_COLORS: readonly RGB[] = [hexToRgb(0x2de2f5), hexToRgb(0x9b6bff), hexToRgb(0xf062e6), hexToRgb(0x4cf08a)];

export const MAIN_ISLAND_PALETTE: IslandPalette = {
  top: hexToRgb(0x1d7a5f),
  topAlt: hexToRgb(0x2fa874),
  soil: hexToRgb(0x3b2a5e),
  stone: hexToRgb(0x272052),
  deep: hexToRgb(0x181339),
  crystals: [hexToRgb(0x2de2f5), hexToRgb(0x9b6bff), hexToRgb(0xf062e6)],
};

export const SATELLITE_PALETTES: readonly IslandPalette[] = [
  { ...MAIN_ISLAND_PALETTE, top: hexToRgb(0x23866a), topAlt: hexToRgb(0x3bbf86) },
  { ...MAIN_ISLAND_PALETTE, top: hexToRgb(0x5a3fb0), topAlt: hexToRgb(0x7653d6), soil: hexToRgb(0x2d2160) },
  { ...MAIN_ISLAND_PALETTE, top: hexToRgb(0x1f6f86), topAlt: hexToRgb(0x2a93ad) },
  { ...MAIN_ISLAND_PALETTE, top: hexToRgb(0x7b3a8f), topAlt: hexToRgb(0x9c4bb5), soil: hexToRgb(0x2f1c4f) },
];

export const STONE_COLOR: RGB = hexToRgb(0x2a2458);
