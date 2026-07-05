import type { Platform } from "@/lib/mock-data";

// Categorical hues, validated for dark-surface CVD separation and contrast
// (see AGENTS notes: run the dataviz skill's validate_palette.js before
// changing this order or these values). Order matters — it's the ΔE-max
// ordering, not cosmetic. Facebook/Threads/Pinterest were appended (not
// interleaved) when Social Accounts added them, keeping the original 5's
// validated ordering untouched; the 8-color set re-validates clean.
export const platformColor: Record<Platform, string> = {
  LinkedIn: "bg-[#3987e5]",
  TikTok: "bg-[#199e70]",
  YouTube: "bg-[#e66767]",
  Instagram: "bg-[#d55181]",
  X: "bg-[#d95926]",
  Facebook: "bg-[#7c5cd9]",
  Threads: "bg-[#b8860b]",
  Pinterest: "bg-[#b3123f]",
};

export const platformHex: Record<Platform, string> = {
  LinkedIn: "#3987e5",
  TikTok: "#199e70",
  YouTube: "#e66767",
  Instagram: "#d55181",
  X: "#d95926",
  Facebook: "#7c5cd9",
  Threads: "#b8860b",
  Pinterest: "#b3123f",
};

export const platformAbbr: Record<Platform, string> = {
  Instagram: "IG",
  TikTok: "TT",
  X: "X",
  LinkedIn: "in",
  YouTube: "YT",
  Facebook: "FB",
  Threads: "@",
  Pinterest: "P",
};
