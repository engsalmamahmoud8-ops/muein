import * as LucideIcons from "lucide-react";

export type LucideIcon = LucideIcons.LucideIcon;

const ICON_MAP = LucideIcons as unknown as Record<string, LucideIcon>;

const kebabToPascal = (s: string) =>
  s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");

export function resolveIcon(name: string | null | undefined, fallback: LucideIcon = LucideIcons.Tag): LucideIcon {
  if (!name) return fallback;
  return (ICON_MAP[name] as LucideIcon) ?? (ICON_MAP[kebabToPascal(name)] as LucideIcon) ?? fallback;
}
