import { useEffect, useState } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { getSiteSettings, type PublicSiteSettings } from "@/lib/api/site-settings.functions";

/* Default brand tokens that appear in hard-coded route titles / meta.
   When a per-language site name override is set, occurrences of the
   corresponding default token are replaced inside <title> at runtime. */
const DEFAULT_BRAND_TOKENS: Record<Lang, string> = {
  ar: "يمناك",
  en: "Ymnak",
  tr: "Ymnak",
};

export type BrandingColors = {
  primary: string | null;
  primaryForeground: string | null;
};

export type BrandingConfig = {
  siteNames: { ar: string; en: string; tr: string };
  logoUrl: string | null;
  faviconUrl: string | null;
  colors: BrandingColors;
};

/* localStorage cache so first paint after reload is branded immediately.
   The DB is still the source of truth — we refresh in the background. */
export const BRANDING_CACHE_KEY = "ymnak_branding_cache";
export const BRANDING_EVENT = "ymnak:branding-changed";

export const DEFAULT_BRANDING: BrandingConfig = {
  siteNames: { ar: "", en: "", tr: "" },
  logoUrl: null,
  faviconUrl: null,
  colors: { primary: null, primaryForeground: null },
};

/* Hex previews shown in the color picker when no override is set. */
export const DEFAULT_COLOR_PREVIEWS = {
  primary: "#f4d04a",
  primaryForeground: "#1a1a1a",
};

function settingsToBranding(s: PublicSiteSettings): BrandingConfig {
  return {
    siteNames: s.siteNames,
    logoUrl: s.logoUrl,
    faviconUrl: s.faviconUrl,
    colors: s.colors,
  };
}

/* Synchronous read from localStorage cache. */
export function loadBranding(): BrandingConfig {
  if (typeof window === "undefined") return DEFAULT_BRANDING;
  try {
    const raw = window.localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return DEFAULT_BRANDING;
    const parsed = JSON.parse(raw) as Partial<BrandingConfig>;
    return {
      siteNames: { ...DEFAULT_BRANDING.siteNames, ...(parsed.siteNames ?? {}) },
      logoUrl: parsed.logoUrl ?? null,
      faviconUrl: parsed.faviconUrl ?? null,
      colors: {
        primary: parsed.colors?.primary ?? null,
        primaryForeground: parsed.colors?.primaryForeground ?? null,
      },
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

/* Refresh the cache from the DB and notify subscribers. */
export async function refreshBrandingFromServer(): Promise<BrandingConfig | null> {
  if (typeof window === "undefined") return null;
  try {
    const settings = await getSiteSettings();
    const branding = settingsToBranding(settings);
    window.localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
    window.dispatchEvent(new Event(BRANDING_EVENT));
    return branding;
  } catch {
    return null;
  }
}

/* Update the local cache after a successful admin save. */
export function cacheBranding(branding: BrandingConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
  window.dispatchEvent(new Event(BRANDING_EVENT));
}

/* The CSS variables that follow the primary brand color. Setting all of them
   keeps gradients, rings, sidebar accents, and the dark/light accent inverse
   in sync with the user's choice. */
const PRIMARY_VARS = [
  "--primary",
  "--primary-glow",
  "--ring",
  "--sidebar-primary",
  "--sidebar-ring",
  "--accent-foreground",
] as const;

const PRIMARY_FG_VARS = [
  "--primary-foreground",
  "--sidebar-primary-foreground",
] as const;

export function applyBrandingToDocument(branding: BrandingConfig): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  for (const v of PRIMARY_VARS) {
    if (branding.colors.primary) root.style.setProperty(v, branding.colors.primary);
    else root.style.removeProperty(v);
  }
  for (const v of PRIMARY_FG_VARS) {
    if (branding.colors.primaryForeground) root.style.setProperty(v, branding.colors.primaryForeground);
    else root.style.removeProperty(v);
  }

  const href = branding.faviconUrl ?? branding.logoUrl ?? null;
  let link = document.querySelector<HTMLLinkElement>("link[data-branding-favicon]");
  if (href) {
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.setAttribute("data-branding-favicon", "1");
      document.head.appendChild(link);
    }
    link.href = href;
  } else if (link) {
    link.remove();
  }
}

function syncDocumentTitleWithBranding(): void {
  if (typeof document === "undefined") return;
  const b = loadBranding();
  const titleEl = document.querySelector("title");
  if (!titleEl) return;
  let next = titleEl.textContent ?? "";
  for (const lang of Object.keys(DEFAULT_BRAND_TOKENS) as Lang[]) {
    const custom = b.siteNames[lang]?.trim();
    if (!custom) continue;
    const token = DEFAULT_BRAND_TOKENS[lang];
    if (!token || custom === token) continue;
    next = next.split(token).join(custom);
  }
  if (next !== titleEl.textContent) titleEl.textContent = next;
}

export function BrandingEffects(): null {
  useEffect(() => {
    const apply = () => {
      applyBrandingToDocument(loadBranding());
      syncDocumentTitleWithBranding();
    };
    apply();
    window.addEventListener(BRANDING_EVENT, apply);
    window.addEventListener("storage", apply);

    // Pull fresh branding from the DB; the change event will reapply.
    refreshBrandingFromServer();

    // Observe <title> changes so per-route title updates also get rebranded.
    const titleEl = document.querySelector("title");
    const obs = titleEl
      ? new MutationObserver(() => syncDocumentTitleWithBranding())
      : null;
    if (obs && titleEl) obs.observe(titleEl, { childList: true, characterData: true, subtree: true });

    return () => {
      window.removeEventListener(BRANDING_EVENT, apply);
      window.removeEventListener("storage", apply);
      obs?.disconnect();
    };
  }, []);
  return null;
}

export function useBranding() {
  const { lang, t } = useI18n();
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);

  useEffect(() => {
    setBranding(loadBranding());
    const onChange = () => setBranding(loadBranding());
    window.addEventListener(BRANDING_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(BRANDING_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const override = branding.siteNames[lang]?.trim();
  return {
    siteName: override && override.length > 0 ? override : t("app_name"),
    logoUrl: branding.logoUrl,
    faviconUrl: branding.faviconUrl,
    siteNames: branding.siteNames,
    colors: branding.colors,
  };
}
