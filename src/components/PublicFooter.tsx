import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  ArrowUpRight,
  ArrowUp,
  Send,
} from "lucide-react";
import logoSrc from "@/assets/ymnak-logo.jpg";
import { useBranding } from "@/lib/branding";
import { useState } from "react";

export function PublicFooter() {
  const { t, lang, dir } = useI18n();
  const { siteName, logoUrl } = useBranding();
  const year = new Date().getFullYear();
  const isRtl = dir === "rtl";
  const [email, setEmail] = useState("");

  const navLinks = [
    { to: "/", label: t("home") },
    { to: "/services", label: t("services") },
    { to: "/about", label: t("about") },
    { to: "/contact", label: t("contact") },
  ];
  const accountLinks = [
    { to: "/login", label: t("login") },
    { to: "/register", label: t("register") },
  ];

  const scrollTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer
      className="mt-24 relative isolate font-sans"
      aria-labelledby="footer-brand"
    >
      {/* ━━━━━━━━━━━━━━━━━ YELLOW MASTHEAD ━━━━━━━━━━━━━━━━━ */}
      <div className="relative panel-yellow overflow-hidden">
        <div className="panel-noise absolute inset-0" aria-hidden />
        <div className="panel-stripes absolute inset-0" aria-hidden />

        <div className="relative container mx-auto px-6 pt-14 pb-6">
          <div className="grid gap-14 lg:grid-cols-12">
            {/* ───── BRAND BLOCK (5 cols) ───── */}
            <div className="lg:col-span-5 relative">
              <Link
                to="/"
                id="footer-brand"
                className="inline-flex items-center gap-3 group"
                aria-label={siteName}
              >
                <span className="relative">
                  <img
                    src={logoUrl ?? logoSrc}
                    alt={siteName}
                    className="h-12 w-12 object-cover border border-foreground"
                  />
                  <span
                    aria-hidden
                    className="absolute -inset-1 border border-foreground/0 group-hover:border-foreground transition-colors pointer-events-none"
                  />
                </span>
              </Link>

              {/* The big serif statement */}
              <h2
                className="font-display mt-6 leading-[0.82] tracking-[-0.03em] text-[clamp(3.2rem,9vw,7rem)] font-light"
                dir={isRtl ? "rtl" : "ltr"}
              >
                <span className="block">{siteName}</span>
                <span className="block italic font-normal opacity-80">
                  {isRtl ? "ـ خدمتك" : "at your"}
                  <span className="ml-3 inline-block align-baseline">
                    <span className="font-mono-ui text-[0.18em] tracking-[0.5em] uppercase align-super">
                      ●
                    </span>
                  </span>
                </span>
                <span className="block">
                  {isRtl ? "بضغطة" : "doorstep."}
                </span>
              </h2>

              <p className="mt-6 max-w-md text-sm leading-relaxed text-foreground/80 font-sans">
                {t("footer_about")}
              </p>

              {/* Newsletter — brutalist underline + stamp */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setEmail("");
                }}
                className="mt-10 max-w-md"
              >
                <label
                  htmlFor="ft-email"
                  className="label-mono block mb-2"
                >
                  {isRtl ? "ابقَ على اطلاع" : "Stay posted"} ―—
                </label>
                <div className="flex items-stretch gap-3">
                  <input
                    id="ft-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      isRtl ? "your@email.com" : "your@email.com"
                    }
                    dir="ltr"
                    className="input-edit flex-1 !text-base !pb-2 placeholder:!text-foreground/40"
                    style={{
                      borderBottomColor: "var(--color-foreground)",
                    }}
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="shrink-0 w-12 h-12 bg-foreground text-primary border border-foreground flex items-center justify-center hover:translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-transform"
                    style={{
                      boxShadow: isRtl
                        ? "-4px 4px 0 0 oklch(0 0 0 / 0.35)"
                        : "4px 4px 0 0 oklch(0 0 0 / 0.35)",
                    }}
                  >
                    <Send
                      className={`h-4 w-4 ${isRtl ? "scale-x-[-1]" : ""}`}
                    />
                  </button>
                </div>
              </form>
            </div>

            {/* ───── DATA COLUMNS (7 cols) ───── */}
            <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12 lg:pt-2">
              <FooterCol
                label={isRtl ? "تصفّح" : "Navigate"}
                links={navLinks}
              />
              <FooterCol
                label={t("footer_account")}
                links={accountLinks}
              />

              {/* Dispatch column — contact data as field rows */}
              <div className="col-span-2 md:col-span-1">
                <h4 className="label-mono mb-5">
                  {isRtl ? "تواصل" : "Dispatch"}
                </h4>
                <ul className="space-y-4">
                  <DataRow
                    icon={Mail}
                    value="hello@ymnak.sa"
                    href="mailto:hello@ymnak.sa"
                  />
                  <DataRow
                    icon={Phone}
                    value="+966 50 000 0000"
                    href="tel:+966500000000"
                  />
                  <DataRow
                    icon={MapPin}
                    value={t("footer_location")}
                  />
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Giant footer sigil — tucked, low-opacity, decorative */}
        <div
          aria-hidden
          className="pointer-events-none select-none absolute -bottom-10 right-[-2vw] font-display text-[18vw] leading-none tracking-[-0.05em] text-foreground/[0.07] hidden md:block"
          dir={isRtl ? "rtl" : "ltr"}
        >
          {lang === "ar" ? "يمناك" : "ymnak"}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━ BLACK COLOPHON STRIP ━━━━━━━━━━━━━━━━━ */}
      <div className="bg-foreground text-background relative">
        <div className="container mx-auto px-6 py-5 flex flex-wrap items-center gap-x-6 gap-y-4">
          {/* © + meta */}
          <div className="flex items-center gap-3 font-mono-ui text-[11px] tracking-[0.18em] uppercase opacity-90">
            <SpinningSigil />
            <span>
              © {year} · {siteName} · {t("rights")}
            </span>
          </div>

          {/* spacer */}
          <div className="flex-1" />

          {/* Social tiles — brutalist hard-shadow */}
          <div className="flex items-center gap-2">
            {[
              { Icon: Facebook, label: "Facebook" },
              { Icon: Twitter, label: "Twitter" },
              { Icon: Instagram, label: "Instagram" },
            ].map(({ Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="group relative w-9 h-9 border border-background/40 text-background flex items-center justify-center hover:bg-primary hover:text-foreground hover:border-primary transition-colors"
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span
                  aria-hidden
                  className="absolute inset-0 border border-primary opacity-0 group-hover:opacity-100 translate-x-1 translate-y-1 transition-all pointer-events-none"
                />
              </a>
            ))}
          </div>

          {/* Back to top — stamp button */}
          <button
            type="button"
            onClick={scrollTop}
            className="group inline-flex items-center gap-2 font-mono-ui text-[10px] tracking-[0.32em] uppercase border border-background/60 px-3 py-2 hover:bg-primary hover:text-foreground hover:border-primary transition-colors"
            aria-label={isRtl ? "العودة للأعلى" : "Back to top"}
          >
            <ArrowUp className="h-3 w-3 transition-transform group-hover:-translate-y-0.5" />
            {isRtl ? "للأعلى" : "Top"}
          </button>
        </div>
      </div>
    </footer>
  );
}

/* ───────────────────────── sub-pieces ───────────────────────── */

function FooterCol({
  label,
  links,
}: {
  label: string;
  links: { to: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="label-mono mb-5">{label}</h4>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="group inline-flex items-center gap-2 font-display text-xl leading-tight text-foreground/85 hover:text-foreground transition-colors"
            >
              <span className="relative">
                {l.label}
                <span
                  aria-hidden
                  className="absolute left-0 right-0 -bottom-0.5 h-px bg-foreground scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300"
                />
              </span>
              <ArrowUpRight
                className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                strokeWidth={2}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DataRow({
  icon: Icon,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <Icon className="h-4 w-4 opacity-70 shrink-0" />
      <span className="font-mono-ui text-[12.5px] tracking-tight leading-tight">
        {value}
      </span>
    </>
  );
  return (
    <li>
      {href ? (
        <a
          href={href}
          dir="ltr"
          className="group flex items-center gap-2.5 hover:text-foreground transition-colors"
        >
          {inner}
        </a>
      ) : (
        <div className="flex items-center gap-2.5">{inner}</div>
      )}
    </li>
  );
}

function SpinningSigil() {
  return (
    <span
      aria-hidden
      className="relative inline-flex items-center justify-center w-7 h-7"
    >
      <svg
        viewBox="0 0 32 32"
        className="absolute inset-0 animate-spin-slow text-primary"
      >
        <defs>
          <path
            id="ft-circle"
            d="M 16,16 m -11,0 a 11,11 0 1,1 22,0 a 11,11 0 1,1 -22,0"
          />
        </defs>
        <text
          fontSize="4.6"
          letterSpacing="2.4"
          fill="currentColor"
          fontFamily="IBM Plex Mono, monospace"
        >
          <textPath href="#ft-circle">
            YMNAK · YMNAK · YMNAK ·{" "}
          </textPath>
        </text>
      </svg>
      <span className="block w-1.5 h-1.5 bg-primary rounded-full" />
    </span>
  );
}
