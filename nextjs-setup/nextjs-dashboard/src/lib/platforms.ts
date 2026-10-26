export type SocialPlatform = "meta" | "facebook" | "instagram" | "linkedin" | "x" | "tiktok" | "youtube";

/** Canonical Phase 2 providers. "twitter" remains accepted at API boundaries and normalized to "x". */
export const CANONICAL_PLATFORMS = ["meta", "facebook", "instagram", "linkedin", "x", "tiktok", "youtube"] as const;
export type CanonicalPlatform = (typeof CANONICAL_PLATFORMS)[number];

/** Legacy aliases mapped to canonical keys before capability or adapter resolution. */
export const PLATFORM_ALIASES: Record<string, CanonicalPlatform> = { twitter: "x" };

export interface PlatformCapabilities {
  platform: SocialPlatform;
  displayName: string;
  oauth: "oauth2";
  publish: boolean;
  media: boolean;
  scheduling: boolean;
  analytics: boolean;
  webhooks: boolean;
  phase: 1 | 2 | 3;
}

export const PLATFORM_CAPABILITIES: readonly PlatformCapabilities[] = [
  { platform: "meta", displayName: "Meta", oauth: "oauth2", publish: true, media: true, scheduling: true, analytics: true, webhooks: true, phase: 1 },
  { platform: "facebook", displayName: "Facebook Pages", oauth: "oauth2", publish: true, media: true, scheduling: true, analytics: true, webhooks: true, phase: 1 },
  { platform: "instagram", displayName: "Instagram", oauth: "oauth2", publish: true, media: true, scheduling: true, analytics: true, webhooks: true, phase: 1 },
  { platform: "linkedin", displayName: "LinkedIn", oauth: "oauth2", publish: true, media: true, scheduling: true, analytics: true, webhooks: true, phase: 2 },
  { platform: "x", displayName: "X", oauth: "oauth2", publish: true, media: true, scheduling: true, analytics: true, webhooks: true, phase: 2 },
  { platform: "tiktok", displayName: "TikTok", oauth: "oauth2", publish: true, media: true, scheduling: true, analytics: true, webhooks: true, phase: 3 },
  { platform: "youtube", displayName: "YouTube", oauth: "oauth2", publish: true, media: true, scheduling: true, analytics: true, webhooks: true, phase: 3 },
];

export function normalizePlatform(value: string): SocialPlatform {
  const key = value.trim().toLowerCase();
  const canonical = (PLATFORM_ALIASES[key] ?? key) as SocialPlatform;
  if (!(CANONICAL_PLATFORMS as readonly string[]).includes(canonical)) {
    throw new Error(`Unsupported social platform: ${value}`);
  }
  return canonical;
}

export function getPlatformCapabilities(platform: string) {
  return PLATFORM_CAPABILITIES.find((item) => item.platform === normalizePlatform(platform));
}
