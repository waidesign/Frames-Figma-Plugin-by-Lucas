import type { Preset, PresetCategory } from "./types";

/**
 * All frame presets. Edit this list to add or change devices.
 * Keep `id` stable: templates and settings reference presets by id.
 * The fold ruler is placed at y = height.
 */
export const CATEGORIES: PresetCategory[] = [
  "Phone",
  "Tablet",
  "Desktop",
  "Watch",
  "Presentation",
  "Social media",
  "Paper",
  "Figma Community",
];

export const PRESETS: Preset[] = [
  // Phone
  { id: "iphone-duo-closed", category: "Phone", name: "iPhone Duo Closed", width: 466, height: 678 },
  { id: "iphone-duo-open", category: "Phone", name: "iPhone Duo Open", width: 890, height: 626 },
  { id: "iphone-18-pro", category: "Phone", name: "iPhone 18 Pro", width: 402, height: 874 },
  { id: "iphone-18-pro-max", category: "Phone", name: "iPhone 18 Pro Max", width: 440, height: 956 },
  { id: "iphone-17", category: "Phone", name: "iPhone 17", width: 402, height: 874 },
  { id: "iphone-16-17-pro", category: "Phone", name: "iPhone 16 & 17 Pro", width: 402, height: 874 },
  { id: "iphone-16", category: "Phone", name: "iPhone 16", width: 393, height: 852 },
  { id: "iphone-16-17-pro-max", category: "Phone", name: "iPhone 16 & 17 Pro Max", width: 440, height: 956 },
  { id: "iphone-16-plus", category: "Phone", name: "iPhone 16 Plus", width: 430, height: 932 },
  { id: "iphone-air", category: "Phone", name: "iPhone Air", width: 420, height: 912 },
  { id: "iphone-14-15-pro-max", category: "Phone", name: "iPhone 14 & 15 Pro Max", width: 430, height: 932 },
  { id: "iphone-14-15-pro", category: "Phone", name: "iPhone 14 & 15 Pro", width: 393, height: 852 },
  { id: "iphone-13-14", category: "Phone", name: "iPhone 13 & 14", width: 390, height: 844 },
  { id: "iphone-14-plus", category: "Phone", name: "iPhone 14 Plus", width: 428, height: 926 },
  { id: "android-compact", category: "Phone", name: "Android Compact", width: 412, height: 917 },
  { id: "android-medium", category: "Phone", name: "Android Medium", width: 700, height: 840 },

  // Tablet
  { id: "ipad-mini-8-3", category: "Tablet", name: "iPad mini 8.3", width: 744, height: 1133 },
  { id: "surface-pro-8", category: "Tablet", name: "Surface Pro 8", width: 1440, height: 960 },
  { id: "ipad-pro-11", category: "Tablet", name: 'iPad Pro 11"', width: 834, height: 1194 },
  { id: "ipad-pro-12-9", category: "Tablet", name: 'iPad Pro 12.9"', width: 1024, height: 1366 },
  { id: "android-expanded", category: "Tablet", name: "Android Expanded", width: 1280, height: 800 },

  // Desktop
  { id: "macbook-air", category: "Desktop", name: "MacBook Air", width: 1280, height: 832 },
  { id: "macbook-pro-14", category: "Desktop", name: 'MacBook Pro 14"', width: 1512, height: 982 },
  { id: "macbook-pro-16", category: "Desktop", name: 'MacBook Pro 16"', width: 1728, height: 1117 },
  { id: "desktop", category: "Desktop", name: "Desktop", width: 1440, height: 1024 },
  { id: "wireframes", category: "Desktop", name: "Wireframes", width: 1440, height: 1024 },
  { id: "tv", category: "Desktop", name: "TV", width: 1280, height: 720 },

  // Watch
  { id: "watch-series-10-42mm", category: "Watch", name: "Series 10 42mm", width: 187, height: 223 },
  { id: "watch-series-10-46mm", category: "Watch", name: "Series 10 46mm", width: 208, height: 248 },
  { id: "watch-41mm", category: "Watch", name: "41mm", width: 176, height: 215 },
  { id: "watch-45mm", category: "Watch", name: "45mm", width: 198, height: 242 },
  { id: "watch-44mm", category: "Watch", name: "44mm", width: 184, height: 224 },
  { id: "watch-40mm", category: "Watch", name: "40mm", width: 162, height: 197 },

  // Presentation
  { id: "slide-16-9", category: "Presentation", name: "Slide 16:9", width: 1920, height: 1080 },
  { id: "slide-4-3", category: "Presentation", name: "Slide 4:3", width: 1024, height: 768 },

  // Social media
  { id: "twitter-post", category: "Social media", name: "Twitter post", width: 1200, height: 675 },
  { id: "twitter-header", category: "Social media", name: "Twitter header", width: 1500, height: 500 },
  { id: "facebook-post", category: "Social media", name: "Facebook post", width: 1200, height: 630 },
  { id: "facebook-cover", category: "Social media", name: "Facebook cover", width: 820, height: 312 },
  { id: "instagram-post", category: "Social media", name: "Instagram post", width: 1080, height: 1350 },
  { id: "instagram-story", category: "Social media", name: "Instagram story", width: 1080, height: 1920 },
  { id: "dribbble-shot", category: "Social media", name: "Dribbble shot", width: 400, height: 300 },
  { id: "dribbble-shot-hd", category: "Social media", name: "Dribbble shot HD", width: 800, height: 600 },
  { id: "linkedin-cover", category: "Social media", name: "LinkedIn cover", width: 1584, height: 396 },

  // Paper
  { id: "paper-a4", category: "Paper", name: "A4", width: 595, height: 842 },
  { id: "paper-a5", category: "Paper", name: "A5", width: 420, height: 595 },
  { id: "paper-a6", category: "Paper", name: "A6", width: 297, height: 420 },
  { id: "paper-letter", category: "Paper", name: "Letter", width: 612, height: 792 },
  { id: "paper-tabloid", category: "Paper", name: "Tabloid", width: 792, height: 1224 },

  // Figma Community
  { id: "community-plugin-icon", category: "Figma Community", name: "Plugin icon", width: 128, height: 128 },
  { id: "community-profile-banner", category: "Figma Community", name: "Profile banner", width: 1680, height: 240 },
  { id: "community-cover", category: "Figma Community", name: "Plugin/file cover", width: 1920, height: 1080 },
];

const byId = new Map(PRESETS.map((p) => [p.id, p]));

export function getPreset(id: string | undefined): Preset | undefined {
  return id ? byId.get(id) : undefined;
}

export function isCategory(key: string): key is PresetCategory {
  return (CATEGORIES as string[]).includes(key);
}

/** First preset with exactly this size (used to guess the preset of frames the plugin didn't create). */
export function findPresetBySize(width: number, height: number): Preset | undefined {
  const w = Math.round(width);
  const h = Math.round(height);
  return PRESETS.find((p) => p.width === w && p.height === h);
}

/** Human label for a preset id or category name. */
export function targetLabel(key: string): string {
  if (isCategory(key)) return key;
  const p = byId.get(key);
  return p ? `${p.name} (${p.width}×${p.height})` : key;
}

/** Frame size used by the template preview: first suggested preset/category, else Desktop. */
export function previewSize(suggestedFor: readonly string[] | undefined): { width: number; height: number } {
  for (const key of suggestedFor ?? []) {
    const p = byId.get(key) ?? (isCategory(key) ? PRESETS.find((x) => x.category === key) : undefined);
    if (p) return { width: p.width, height: p.height };
  }
  return { width: 1440, height: 1024 };
}
