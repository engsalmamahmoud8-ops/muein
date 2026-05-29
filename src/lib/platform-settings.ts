import { getSiteSettings, type PublicSiteSettings } from "@/lib/api/site-settings.functions";

/* Cached snapshot of the publicly-readable site settings.
   Used by routes (e.g. employee nearby) that need to react to the
   admin-configured dispatch parameters synchronously. */

export const PLATFORM_SETTINGS_EVENT = "ymnak:platform-settings-changed";
export const PLATFORM_SETTINGS_CACHE_KEY = "ymnak_platform_settings_cache";

export type PlatformSettings = {
  defaultLanguage: "ar" | "en" | "tr";
  timezone: string;
  currency: "SAR" | "USD" | "TRY" | "EUR";
  maxDistance: number;
  commissionRate: number;
  minRequestAmount: number;
  autoAssign: boolean;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  defaultLanguage: "ar",
  timezone: "Asia/Riyadh",
  currency: "SAR",
  maxDistance: 25,
  commissionRate: 10,
  minRequestAmount: 50,
  autoAssign: false,
};

function pickPlatform(s: PublicSiteSettings): PlatformSettings {
  return {
    defaultLanguage: s.defaultLanguage,
    timezone: s.timezone,
    currency: s.currency,
    maxDistance: s.maxDistance,
    commissionRate: s.commissionRate,
    minRequestAmount: s.minRequestAmount,
    autoAssign: s.autoAssign,
  };
}

export function loadPlatformSettings(): PlatformSettings {
  if (typeof window === "undefined") return DEFAULT_PLATFORM_SETTINGS;
  try {
    const raw = window.localStorage.getItem(PLATFORM_SETTINGS_CACHE_KEY);
    if (!raw) return DEFAULT_PLATFORM_SETTINGS;
    return { ...DEFAULT_PLATFORM_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PLATFORM_SETTINGS;
  }
}

export async function refreshPlatformSettingsFromServer(): Promise<PlatformSettings | null> {
  if (typeof window === "undefined") return null;
  try {
    const settings = await getSiteSettings();
    const platform = pickPlatform(settings);
    window.localStorage.setItem(PLATFORM_SETTINGS_CACHE_KEY, JSON.stringify(platform));
    window.dispatchEvent(new Event(PLATFORM_SETTINGS_EVENT));
    return platform;
  } catch {
    return null;
  }
}

export function cachePlatformSettings(p: PlatformSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLATFORM_SETTINGS_CACHE_KEY, JSON.stringify(p));
  window.dispatchEvent(new Event(PLATFORM_SETTINGS_EVENT));
}
