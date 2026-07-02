import type { Platform } from "@/lib/mock-data";

// Categorical hues, validated for dark-surface CVD separation and contrast
// (see AGENTS notes: run the dataviz skill's validate_palette.js before
// changing this order or these values). Order matters — it's the ΔE-max
// ordering, not cosmetic.
export const platformColor: Record<Platform, string> = {
  LinkedIn: "bg-[#3987e5]",
  TikTok: "bg-[#199e70]",
  YouTube: "bg-[#e66767]",
  Instagram: "bg-[#d55181]",
  X: "bg-[#d95926]",
};

export const platformHex: Record<Platform, string> = {
  LinkedIn: "#3987e5",
  TikTok: "#199e70",
  YouTube: "#e66767",
  Instagram: "#d55181",
  X: "#d95926",
};

export const platformAbbr: Record<Platform, string> = {
  Instagram: "IG",
  TikTok: "TT",
  X: "X",
  LinkedIn: "in",
  YouTube: "YT",
};
