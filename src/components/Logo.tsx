import logoSrc from "@/assets/ymnak-logo.jpg";
import { useBranding } from "@/lib/branding";

export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  const { siteName, logoUrl } = useBranding();
  return (
    <img
      src={logoUrl ?? logoSrc}
      alt={siteName}
      width={size}
      height={size}
      className={`rounded-xl object-cover ${className}`}
    />
  );
}
