import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  Target,
  Eye,
  Heart,
  Shield,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Star,
} from "lucide-react";
import logoSrc from "@/assets/ymnak-logo.jpg";
import { useBranding } from "@/lib/branding";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — يمناك" },
      { name: "description", content: "يمناك منصة سعودية تجمع العملاء بمقدمي خدمات منزلية موثوقين." },
      { property: "og:title", content: "عن يمناك" },
      { property: "og:description", content: "رحلتنا، رسالتنا، ورؤيتنا." },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useI18n();
  const { siteName, logoUrl } = useBranding();

  const principles = [
    { icon: Target, title: t("about_mission"), desc: t("about_mission_desc") },
    { icon: Eye, title: t("about_vision"), desc: t("about_vision_desc") },
  ];

  const stats = [
    { icon: Shield, n: "+1000", l: "مقدم خدمة موثق", tag: "PROVIDERS" },
    { icon: Heart, n: "+5000", l: "عميل سعيد", tag: "CUSTOMERS" },
    { icon: Target, n: "98%", l: "نسبة رضا", tag: "SATISFACTION" },
  ];

  const pillars = [
    { icon: ShieldCheck, title: t("trust_verified"), desc: t("trust_verified_desc") },
    { icon: Eye, title: t("trust_transparent"), desc: t("trust_transparent_desc") },
    { icon: Star, title: t("trust_rated"), desc: t("trust_rated_desc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* ============== Editorial Hero ============== */}
      <section className="relative border-b border-foreground/10 overflow-hidden">
        {/* big yellow column */}
        <div
          aria-hidden
          className="absolute top-0 bottom-0 start-[12%] w-px bg-foreground/10 hidden lg:block"
        />
        <div
          aria-hidden
          className="absolute top-0 bottom-0 end-[12%] w-px bg-foreground/10 hidden lg:block"
        />
        <div className="absolute -top-32 start-[-8rem] h-[26rem] w-[26rem] rounded-full bg-primary/40 blur-3xl animate-blob" />

        <div className="container mx-auto px-4 pt-16 md:pt-24 pb-16 md:pb-28 relative">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Big editorial type */}
            <div className="lg:col-span-8 animate-fade-up">
              <h1 className="font-extrabold leading-[0.9] tracking-tight">
                <span className="block text-5xl sm:text-7xl md:text-[6rem] lg:text-[8rem]">
                  {t("about_title")}
                </span>
                <span className="block mt-3 md:mt-5 text-xl md:text-2xl font-light text-muted-foreground max-w-2xl leading-relaxed">
                  {t("about_desc")}
                </span>
              </h1>

              {/* decorative meta strip */}
              <div className="mt-10 md:mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
                <span className="flex items-center gap-2 font-mono-display uppercase tracking-[0.18em] text-xs">
                  <span className="h-2 w-2 bg-primary rounded-full" />
                  ACTIVE / OPERATIONAL
                </span>
                <span className="font-mono-display uppercase tracking-[0.18em] text-xs text-muted-foreground">
                  ·  KSA · TÜRKİYE
                </span>
              </div>
            </div>

            {/* Right column: stacked card */}
            <div className="lg:col-span-4 animate-fade-up delay-200">
              <div className="relative">
                {/* shadow plate */}
                <div className="absolute inset-0 translate-x-3 translate-y-3 rtl:-translate-x-3 bg-foreground rounded-2xl" />
                <div className="relative bg-primary rounded-2xl p-6 border-2 border-foreground">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono-display text-[10px] uppercase tracking-[0.25em] font-semibold">
                      YMNAK / IDENTITY
                    </span>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <img
                    src={logoUrl ?? logoSrc}
                    alt={siteName}
                    className="aspect-square w-full rounded-xl object-cover border border-foreground/20"
                  />
                  <div className="mt-4 pt-4 border-t border-foreground/20 flex items-center justify-between text-xs font-mono-display">
                    <span className="font-semibold">{siteName}</span>
                    <span className="opacity-70">v.2026.05</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== Mission / Vision — manifesto blocks ============== */}
      <section className="relative">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="mb-12 animate-fade-up">
            <h2 className="text-2xl md:text-3xl font-bold">المبادئ</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-foreground/10 border border-foreground/10">
            {principles.map((c, i) => (
              <div
                key={i}
                className="group relative bg-background p-8 md:p-12 hover:bg-foreground hover:text-background transition-colors duration-300 animate-fade-up"
                style={{ animationDelay: `${i * 120 + 100}ms` }}
              >
                <div className="flex items-start justify-end mb-10">
                  <ArrowUpRight className="h-5 w-5 opacity-30 group-hover:opacity-100 group-hover:text-primary group-hover:-translate-y-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all" />
                </div>

                <div className="relative inline-flex h-16 w-16 items-center justify-center mb-8">
                  <span className="absolute inset-0 bg-primary rounded-lg" />
                  <c.icon className="relative h-7 w-7 text-foreground" />
                </div>

                <h3 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight mb-4">
                  {c.title}
                </h3>
                <p className="text-base md:text-lg text-muted-foreground group-hover:text-background/75 leading-relaxed max-w-md">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== Stats — oversized numerals ============== */}
      <section className="relative bg-foreground text-background py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-15" />
        <div className="absolute -top-32 -end-32 h-[24rem] w-[24rem] rounded-full bg-primary/25 blur-3xl animate-blob" />
        <div className="container mx-auto px-4 relative">
          <div className="flex items-baseline justify-between mb-14">
            <h2 className="text-2xl md:text-3xl font-bold">بالأرقام</h2>
            <span className="font-mono-display text-xs uppercase tracking-[0.3em] text-primary">// IMPACT</span>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-background/15 border border-background/15">
            {stats.map((s, i) => (
              <div
                key={i}
                className="relative bg-foreground p-8 md:p-10 group hover:bg-primary hover:text-foreground transition-colors duration-300 animate-fade-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-12">
                  <s.icon className="h-6 w-6 text-primary group-hover:text-foreground transition-colors" />
                  <span className="font-mono-display text-[10px] uppercase tracking-[0.3em] opacity-60">
                    {s.tag}
                  </span>
                </div>
                <p className="text-6xl md:text-7xl lg:text-8xl font-extrabold leading-none tracking-tighter">
                  {s.n}
                </p>
                <p className="mt-6 text-sm opacity-70 group-hover:opacity-100 border-t border-background/20 group-hover:border-foreground/30 pt-4">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== Pillars / Why us ============== */}
      <section className="relative">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid lg:grid-cols-12 gap-8 mb-12 items-end">
            <div className="lg:col-span-7">
              <span className="font-mono-display text-xs uppercase tracking-[0.3em] text-muted-foreground">// THE FOUNDATION</span>
              <h2 className="mt-3 text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">
                {t("why_us")}
              </h2>
            </div>
            <div className="lg:col-span-5">
              <p className="text-muted-foreground leading-relaxed border-s-2 border-primary ps-5">
                {t("footer_about")}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {pillars.map((p, i) => (
              <div
                key={i}
                className="relative group border border-foreground/15 p-7 md:p-8 hover:border-foreground transition-colors animate-fade-up bg-background"
                style={{ animationDelay: `${i * 100 + 100}ms` }}
              >
                <span className="absolute top-4 end-4 font-mono-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  0{i + 1}
                </span>
                <div className="relative inline-flex h-12 w-12 items-center justify-center mb-6">
                  <span className="absolute inset-0 bg-primary/40 group-hover:bg-primary transition-colors rounded-sm" />
                  <p.icon className="relative h-6 w-6 text-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== CTA strip ============== */}
      <section className="relative bg-primary text-primary-foreground overflow-hidden border-y-2 border-foreground/10">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="container mx-auto px-4 py-14 md:py-20 relative">
          <div className="grid lg:grid-cols-12 items-center gap-8">
            <div className="lg:col-span-8">
              <p className="font-mono-display text-xs uppercase tracking-[0.3em] mb-3 opacity-70">→ {t("tagline")}</p>
              <h2 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">
                {t("cta_ready_title")} <span className="underline decoration-4 underline-offset-8">{t("cta_now")}</span>
              </h2>
            </div>
            <div className="lg:col-span-4 flex lg:justify-end gap-3">
              <Button
                asChild
                size="lg"
                className="bg-foreground text-primary hover:bg-foreground/90 rounded-none h-14 px-7 font-bold uppercase tracking-wider group"
              >
                <Link to="/register">
                  {t("request_now")}
                  <ArrowUpRight className="h-5 w-5 ms-2 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
