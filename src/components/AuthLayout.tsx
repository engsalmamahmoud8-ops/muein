import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Sun, Moon } from "lucide-react";
import logoSrc from "@/assets/ymnak-logo.jpg";
import { useBranding } from "@/lib/branding";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Section label shown above the display heading. */
  kicker?: string;
  /** Legacy / extra props — accepted but ignored. */
  step?: string;
  display?: ReactNode;
  accent?: string;
  marquee?: string[];
  imageSrc?: string;
  imageAlt?: string;
  imageSide?: "start" | "end";
};

const LANGS: { v: Lang; label: string }[] = [
  { v: "ar", label: "العربية" },
  { v: "en", label: "English" },
  { v: "tr", label: "Türkçe" },
];

export function AuthLayout({ title, subtitle, children, kicker }: Props) {
  const { lang, setLang } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();
  const { siteName, logoUrl } = useBranding();

  return (
    <main className="relative flex flex-col min-h-screen bg-background">
      {/* Top utility bar */}
      <div className="relative z-30 flex items-center justify-between px-6 sm:px-10 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-3 group"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={siteName}
              className="h-10 w-10 object-cover rounded-sm"
            />
          ) : (
            <span className="relative h-10 w-10 bg-black text-primary grid place-items-center">
              <img
                src={logoSrc}
                alt={siteName}
                className="h-10 w-10 object-cover grayscale contrast-125 mix-blend-screen"
              />
            </span>
          )}
          <span className="font-display text-xl font-semibold tracking-tight">{siteName}</span>
        </Link>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="relative overflow-hidden rounded-none border border-border/60"
          >
            <Sun
              className={`h-4 w-4 absolute transition-all duration-500 ${
                theme === "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
              }`}
            />
            <Moon
              className={`h-4 w-4 absolute transition-all duration-500 ${
                theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
              }`}
            />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Language"
                className="rounded-none border border-border/60"
              >
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none">
              {LANGS.map((l) => (
                <DropdownMenuItem
                  key={l.v}
                  onClick={() => setLang(l.v)}
                  className={`rounded-none font-mono-ui text-xs uppercase tracking-widest ${
                    lang === l.v ? "bg-muted" : ""
                  }`}
                >
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-10">
            {kicker ? (
              <p className="label-mono text-muted-foreground mb-4">{kicker}</p>
            ) : null}
            <h1 className="font-display text-4xl md:text-5xl font-medium leading-[1.02] tracking-[-0.02em]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-sm">
                {subtitle}
              </p>
            ) : null}
            <span className="mt-6 block h-px w-16 bg-foreground animate-draw-line" />
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}
