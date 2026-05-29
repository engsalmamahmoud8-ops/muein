import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useI18n, type Lang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import {
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ArrowUpRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import logoSrc from "@/assets/ymnak-logo.jpg";
import { useBranding } from "@/lib/branding";

export function PublicNavbar() {
  const { t, lang, setLang, dir } = useI18n();
  const { siteName, logoUrl } = useBranding();
  const isRtl = dir === "rtl";
  const { user, role, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { to: "/", label: t("home") },
    { to: "/services", label: t("services") },
    { to: "/about", label: t("about") },
    { to: "/contact", label: t("contact") },
  ];

  const langs: { v: Lang; label: string }[] = [
    { v: "ar", label: "AR" },
    { v: "en", label: "EN" },
    { v: "tr", label: "TR" },
  ];

  const dashHref =
    role === "admin"
      ? "/admin/dashboard"
      : role === "employee"
      ? "/employee/dashboard"
      : "/customer/dashboard";

  const stampShadow = isRtl
    ? "-4px 4px 0 0 var(--color-primary)"
    : "4px 4px 0 0 var(--color-primary)";

  return (
    <header className="sticky top-0 z-50 w-full font-sans">
      {/* ━━━━━━━━━━━━━━ MAIN BAR ━━━━━━━━━━━━━━ */}
      <div
        className={`relative bg-background/95 backdrop-blur-md border-b-2 border-foreground transition-shadow ${
          scrolled ? "shadow-card" : ""
        }`}
      >
        <div className="container mx-auto px-4 h-[68px] flex items-center justify-between gap-4">
          {/* Brand */}
          <Link
            to="/"
            className="group inline-flex items-center gap-3 shrink-0"
            aria-label={siteName}
          >
            <span className="relative inline-block">
              <img
                src={logoUrl ?? logoSrc}
                alt=""
                className="h-10 w-10 object-cover border border-foreground"
              />
              <span
                aria-hidden
                className="absolute -inset-1 border border-foreground/0 group-hover:border-foreground transition-colors pointer-events-none"
              />
              <span
                aria-hidden
                className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </span>
            <span className="relative font-display text-[1.65rem] leading-none tracking-[-0.025em] font-light">
              {siteName}
              <span
                aria-hidden
                className={`absolute left-0 right-0 -bottom-1 h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ${
                  isRtl ? "origin-right" : "origin-left"
                }`}
              />
            </span>
          </Link>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {links.map((l) => {
              const active = path === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className="relative group px-3.5 py-2.5 font-mono-ui text-[11px] tracking-[0.26em] uppercase"
                >
                  <span
                    aria-hidden
                    className={`absolute top-1/2 -translate-y-1/2 ${
                      isRtl ? "right-0" : "left-0"
                    } w-1.5 h-1.5 bg-primary transition-all duration-300 ${
                      active
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100"
                    }`}
                  />
                  <span
                    className={`relative transition-colors ${
                      active
                        ? "text-foreground"
                        : "text-foreground/55 group-hover:text-foreground"
                    }`}
                  >
                    {l.label}
                  </span>
                  <span
                    aria-hidden
                    className={`absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-foreground transition-transform duration-300 ${
                      isRtl ? "origin-right" : "origin-left"
                    } ${
                      active
                        ? "scale-x-100"
                        : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to={dashHref}
                  className="hidden sm:inline-flex items-center gap-2 font-mono-ui text-[11px] tracking-[0.26em] uppercase px-3.5 py-2.5 border border-foreground hover:bg-primary transition-colors"
                >
                  <span>{t("dashboard")}</span>
                  <ArrowUpRight
                    className={`h-3 w-3 ${isRtl ? "scale-x-[-1]" : ""}`}
                    strokeWidth={2}
                  />
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    nav({ to: "/" });
                  }}
                  aria-label={t("logout")}
                  className="hidden sm:inline-flex w-10 h-10 items-center justify-center border border-foreground hover:bg-primary transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center font-mono-ui text-[11px] tracking-[0.26em] uppercase px-2 py-2.5 text-foreground/70 hover:text-foreground transition-colors"
                >
                  {t("login")}
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex items-center gap-2 font-mono-ui text-[11px] tracking-[0.26em] uppercase px-4 py-2.5 bg-foreground text-background border border-foreground transition-transform hover:-translate-y-0.5"
                  style={{ boxShadow: stampShadow }}
                >
                  {t("register")}
                  <ArrowUpRight
                    className={`h-3 w-3 ${isRtl ? "scale-x-[-1]" : ""}`}
                    strokeWidth={2}
                  />
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="md:hidden w-10 h-10 inline-flex items-center justify-center border border-foreground hover:bg-primary transition-colors"
            >
              <Menu className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Yellow hairline accent below the black border */}
        <span
          aria-hidden
          className="absolute left-0 right-0 -bottom-[4px] h-[2px] bg-primary"
        />
      </div>

      {/* ━━━━━━━━━━━━━━ MOBILE DRAWER ━━━━━━━━━━━━━━ */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-fade-in cursor-default"
          />
          <aside
            className={`absolute top-0 bottom-0 w-[88%] max-w-sm bg-background flex flex-col ${
              isRtl
                ? "start-0 border-e-2 animate-slide-in-start"
                : "end-0 border-s-2 animate-slide-in-end"
            } border-foreground`}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b-2 border-foreground px-5 h-[68px] relative">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="font-display text-2xl tracking-[-0.02em] font-light"
              >
                {siteName}
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="w-10 h-10 border border-foreground inline-flex items-center justify-center hover:bg-primary transition-colors"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
              <span
                aria-hidden
                className="absolute left-0 right-0 -bottom-[4px] h-[2px] bg-primary"
              />
            </div>

            {/* Drawer nav */}
            <nav className="flex-1 overflow-y-auto px-5 py-8">
              <span className="label-mono opacity-50 mb-6 block">
                {isRtl ? "تصفّح" : "Navigate"}
              </span>
              <ul className="space-y-1">
                {links.map((l, i) => {
                  const active = path === l.to;
                  return (
                    <li
                      key={l.to}
                      className="animate-fade-up"
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
                      <Link
                        to={l.to}
                        onClick={() => setOpen(false)}
                        className={`group flex items-baseline gap-4 py-3 border-b border-foreground/12 ${
                          active ? "text-foreground" : "text-foreground/85"
                        }`}
                      >
                        <span className="font-mono-ui text-[10px] tracking-[0.3em] opacity-40 w-6">
                          0{i + 1}
                        </span>
                        <span className="flex-1 font-display text-[2rem] leading-none tracking-[-0.02em] relative inline-block">
                          {l.label}
                          <span
                            aria-hidden
                            className={`absolute left-0 right-0 -bottom-1 h-[2px] bg-primary transition-transform duration-300 ${
                              isRtl ? "origin-right" : "origin-left"
                            } ${
                              active
                                ? "scale-x-100"
                                : "scale-x-0 group-hover:scale-x-100"
                            }`}
                          />
                        </span>
                        <ArrowUpRight
                          className={`h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity ${
                            isRtl ? "scale-x-[-1]" : ""
                          }`}
                          strokeWidth={2}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Drawer footer */}
            <div className="border-t-2 border-foreground p-5 space-y-3">
              {user ? (
                <>
                  <Link
                    to={dashHref}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between gap-2 w-full px-4 py-3.5 bg-foreground text-background font-mono-ui text-[11px] tracking-[0.28em] uppercase"
                  >
                    {t("dashboard")}
                    <ArrowUpRight
                      className={`h-3.5 w-3.5 text-primary ${
                        isRtl ? "scale-x-[-1]" : ""
                      }`}
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      setOpen(false);
                      await signOut();
                      nav({ to: "/" });
                    }}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-foreground font-mono-ui text-[11px] tracking-[0.28em] uppercase hover:bg-primary transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {t("logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="block w-full text-center px-4 py-3 border border-foreground font-mono-ui text-[11px] tracking-[0.28em] uppercase hover:bg-muted transition-colors"
                  >
                    {t("login")}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    className="block w-full text-center px-4 py-3.5 bg-foreground text-background font-mono-ui text-[11px] tracking-[0.28em] uppercase"
                    style={{ boxShadow: stampShadow }}
                  >
                    {t("register")}
                  </Link>
                </>
              )}

              {/* Lang + theme row */}
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-foreground/15">
                <div className="flex items-center gap-1.5">
                  {langs.map((l) => (
                    <button
                      key={l.v}
                      type="button"
                      onClick={() => setLang(l.v)}
                      className={`px-2 py-1 font-mono-ui text-[11px] tracking-[0.22em] transition-colors ${
                        lang === l.v
                          ? "bg-primary text-foreground"
                          : "border border-foreground/25 hover:border-foreground"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center gap-1.5 font-mono-ui text-[11px] tracking-[0.22em] uppercase opacity-80 hover:opacity-100 transition-opacity"
                >
                  {theme === "dark" ? (
                    <Sun className="h-3.5 w-3.5" />
                  ) : (
                    <Moon className="h-3.5 w-3.5" />
                  )}
                  {theme === "dark" ? "Day" : "Nite"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
