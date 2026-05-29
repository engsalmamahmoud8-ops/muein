const DEFAULT_DAYS = 365;
const MAX_COOKIE_BYTES = 3500;

function isHttps(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

function buildAttrs(days: number): string {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  const parts = [`expires=${d.toUTCString()}`, "path=/", "SameSite=Lax"];
  if (isHttps()) parts.push("Secure");
  return parts.join("; ");
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const enc = encodeURIComponent(name) + "=";
  const parts = document.cookie ? document.cookie.split("; ") : [];
  for (const part of parts) {
    if (part.startsWith(enc)) {
      try {
        return decodeURIComponent(part.slice(enc.length));
      } catch {
        return part.slice(enc.length);
      }
    }
  }
  return null;
}

export function setCookie(name: string, value: string, days: number = DEFAULT_DAYS): void {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; ${buildAttrs(days)}`;
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  const attrs = ["expires=Thu, 01 Jan 1970 00:00:00 GMT", "path=/", "SameSite=Lax"];
  if (isHttps()) attrs.push("Secure");
  document.cookie = `${encodeURIComponent(name)}=; ${attrs.join("; ")}`;
}

function chunkCount(name: string): number {
  const raw = getCookie(`${name}.n`);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function clearChunks(name: string, count: number): void {
  for (let i = 0; i < count; i++) deleteCookie(`${name}.${i}`);
  deleteCookie(`${name}.n`);
}

export function getCookieLarge(name: string): string | null {
  const direct = getCookie(name);
  if (direct !== null) return direct;
  const n = chunkCount(name);
  if (!n) return null;
  let out = "";
  for (let i = 0; i < n; i++) {
    const part = getCookie(`${name}.${i}`);
    if (part === null) return null;
    out += part;
  }
  return out;
}

export function setCookieLarge(name: string, value: string, days: number = DEFAULT_DAYS): void {
  if (typeof document === "undefined") return;
  const prevChunks = chunkCount(name);
  if (prevChunks) clearChunks(name, prevChunks);
  if (value.length <= MAX_COOKIE_BYTES) {
    setCookie(name, value, days);
    return;
  }
  deleteCookie(name);
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += MAX_COOKIE_BYTES) {
    chunks.push(value.slice(i, i + MAX_COOKIE_BYTES));
  }
  chunks.forEach((c, i) => setCookie(`${name}.${i}`, c, days));
  setCookie(`${name}.n`, String(chunks.length), days);
}

export function deleteCookieLarge(name: string): void {
  deleteCookie(name);
  const n = chunkCount(name);
  if (n) clearChunks(name, n);
}

const MIGRATION_FLAG = "ymnak_ls_to_cookie_migrated";
const MIGRATION_KEYS = [
  "theme",
  "yemnak_lang",
  "sidebar_collapsed",
  "ymnak_platform_settings",
  "ymnak_smtp_config",
];

function migrateLocalStorageToCookies(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(MIGRATION_FLAG) === "1") return;
    for (const key of MIGRATION_KEYS) {
      const v = window.localStorage.getItem(key);
      if (v !== null && getCookieLarge(key) === null) setCookieLarge(key, v);
    }
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const v = window.localStorage.getItem(key);
        if (v !== null && getCookieLarge(key) === null) setCookieLarge(key, v);
      }
    }
    window.localStorage.setItem(MIGRATION_FLAG, "1");
  } catch {
    // ignore
  }
}

migrateLocalStorageToCookies();

export const cookieStorage: Storage = {
  get length(): number {
    if (typeof document === "undefined") return 0;
    return document.cookie ? document.cookie.split("; ").length : 0;
  },
  clear(): void {
    if (typeof document === "undefined") return;
    const parts = document.cookie ? document.cookie.split("; ") : [];
    for (const part of parts) {
      const eq = part.indexOf("=");
      const name = eq > -1 ? part.slice(0, eq) : part;
      try {
        deleteCookie(decodeURIComponent(name));
      } catch {
        deleteCookie(name);
      }
    }
  },
  getItem(key: string): string | null {
    return getCookieLarge(key);
  },
  setItem(key: string, value: string): void {
    setCookieLarge(key, value);
  },
  removeItem(key: string): void {
    deleteCookieLarge(key);
  },
  key(index: number): string | null {
    if (typeof document === "undefined") return null;
    const parts = document.cookie ? document.cookie.split("; ") : [];
    const part = parts[index];
    if (!part) return null;
    const eq = part.indexOf("=");
    const name = eq > -1 ? part.slice(0, eq) : part;
    try {
      return decodeURIComponent(name);
    } catch {
      return name;
    }
  },
};
