import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  ArrowUpRight,
  Wrench,
  Zap,
  Sparkles,
  Wind,
  Paintbrush,
  Hammer,
  Sofa,
  Settings,
  ShieldCheck,
  Eye,
  Star,
  ClipboardList,
  UsersRound,
  CheckCircle2,
  Quote,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const HERO_IMG =
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80";

const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80",
];

const CATS = [
  { icon: Wrench, key: "cat_plumbing" as const },
  { icon: Zap, key: "cat_electrical" as const },
  { icon: Sparkles, key: "cat_cleaning" as const },
  { icon: Wind, key: "cat_ac" as const },
  { icon: Paintbrush, key: "cat_painting" as const },
  { icon: Hammer, key: "cat_carpentry" as const },
  { icon: Sofa, key: "cat_furniture" as const },
  { icon: Settings, key: "cat_appliances" as const },
];

const STATS = [
  { value: "+5K", key: "stat_happy_customer" as const, tag: "CUSTOMERS" },
  { value: "+1200", key: "stat_certified_provider" as const, tag: "PROVIDERS" },
  { value: "4.9", key: "stat_avg_rating" as const, tag: "RATING" },
  { value: "24/7", key: "stat_support_24_7" as const, tag: "SUPPORT" },
];

const TESTIMONIALS = [
  { nameKey: "tst1_name" as const, roleKey: "tst1_role" as const, textKey: "tst1_text" as const },
  { nameKey: "tst2_name" as const, roleKey: "tst2_role" as const, textKey: "tst2_text" as const },
  { nameKey: "tst3_name" as const, roleKey: "tst3_role" as const, textKey: "tst3_text" as const },
];

const pad2 = (n: number) => n.toString().padStart(2, "0");

function Landing() {
  const { t } = useI18n();

  useEffect(() => {
    document.title = t("meta_home_title");
    const setMeta = (selector: string, attr: string, value: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, value);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta('meta[name="description"]', "name", "description", t("meta_home_desc"));
    setMeta('meta[property="og:title"]', "property", "og:title", t("meta_home_og_title"));
    setMeta('meta[property="og:description"]', "property", "og:description", t("meta_home_og_desc"));
  }, [t]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <PublicNavbar />

      {/* ================================================================
          HERO — Editorial cover spread
      ================================================================ */}
      <section className="relative border-b border-foreground/10 overflow-hidden">
        {/* layered grid + dots backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />
        {/* yellow corner blooms */}
        <div className="absolute -top-32 -end-32 h-[28rem] w-[28rem] rounded-full bg-primary/50 blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -start-32 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-3xl animate-blob delay-300" />

        <div className="container mx-auto px-4 pt-12 md:pt-16 lg:pt-20 pb-16 md:pb-24 relative">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-end">
            {/* LEFT: title + intro */}
            <div className="lg:col-span-7 animate-fade-up">
              <h1 className="font-extrabold leading-[0.88] tracking-tight">
                <span className="block text-5xl sm:text-7xl md:text-[6.5rem] lg:text-[8rem]">
                  {t("hero_title").split(" ").slice(0, -1).join(" ")}
                </span>
                <span className="block mt-2 text-5xl sm:text-7xl md:text-[6.5rem] lg:text-[8rem]">
                  <span className="relative inline-block">
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-2 md:bottom-4 h-4 md:h-6 bg-primary -z-10 rounded-sm"
                    />
                    {t("hero_title").split(" ").slice(-1)[0]}
                  </span>
                  <span className="text-primary">.</span>
                </span>
              </h1>

              <div className="mt-8 md:mt-10 grid sm:grid-cols-12 gap-6 items-start">
                <p className="sm:col-span-7 text-lg text-muted-foreground leading-relaxed border-s-2 border-primary ps-5">
                  {t("hero_subtitle")}
                </p>
                <div className="sm:col-span-5 flex flex-col gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="bg-foreground text-primary hover:bg-primary hover:text-foreground rounded-none h-14 px-6 font-bold uppercase tracking-wider justify-between group transition-colors"
                  >
                    <Link to="/register">
                      {t("request_now")}
                      <ArrowUpRight className="h-5 w-5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-2 border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-primary rounded-none h-14 px-6 font-bold uppercase tracking-wider justify-between group transition-colors"
                  >
                    <Link to="/register">
                      {t("join_provider")}
                      <ArrowUpRight className="h-5 w-5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* trust badges */}
              <div className="mt-10 md:mt-12 flex flex-wrap items-center gap-x-8 gap-y-5 animate-fade-up delay-300">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2 rtl:space-x-reverse">
                    {AVATARS.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`${t("customer_alt")} ${i + 1}`}
                        loading="lazy"
                        className="h-9 w-9 rounded-full border-2 border-background object-cover shadow-card animate-scale-in"
                        style={{ animationDelay: `${i * 80}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">{t("plus_5000_trust")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                  <span className="ms-2 font-mono-display text-xs font-semibold">4.9 / 5</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono-display uppercase tracking-[0.2em] text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-foreground" />
                  Verified providers only
                </div>
              </div>
            </div>

            {/* RIGHT: hero poster panel */}
            <div className="lg:col-span-5 animate-slide-in-end delay-200">
              <div className="relative">
                {/* shadow plate */}
                <div className="absolute inset-0 translate-x-3 translate-y-3 rtl:-translate-x-3 bg-foreground rounded-[2px]" />

                {/* Image card */}
                <div className="relative border-2 border-foreground bg-background overflow-hidden">
                  {/* top caption strip */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-foreground text-background text-[10px] font-mono-display uppercase tracking-[0.3em]">
                    <span>// FIELD REPORT</span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      LIVE
                    </span>
                  </div>

                  {/* Image */}
                  <div className="relative aspect-[4/5]">
                    <img
                      src={HERO_IMG}
                      alt={t("pro_provider_alt")}
                      loading="eager"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    {/* duotone overlay bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-foreground via-foreground/60 to-transparent" />

                    {/* Overlaid floating cards */}
                    <div className="absolute bottom-4 start-4 end-4 flex flex-col gap-2">
                      <div className="bg-background border border-foreground/10 p-3 flex items-center gap-3 animate-fade-up delay-500">
                        <div className="h-10 w-10 bg-primary flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono-display uppercase tracking-[0.2em] text-muted-foreground">
                            // STATUS
                          </p>
                          <p className="text-sm font-bold truncate">{t("request_completed")}</p>
                        </div>
                        <span className="font-mono-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {t("minutes_ago")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* bottom caption */}
                  <div className="border-t-2 border-foreground p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">{t("five_star_rating")}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Marquee strip */}
        <div className="relative bg-foreground text-background border-t border-foreground/10 py-4 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap min-w-max">
            {[...CATS, ...CATS, ...CATS].map((c, i) => (
              <span key={i} className="flex items-center gap-4 px-6 text-sm md:text-base font-medium">
                <c.icon className="h-3.5 w-3.5 text-primary" />
                <span className="opacity-90">{t(c.key)}</span>
                <span className="text-foreground/40 mx-2">/</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          STATS — oversized editorial
      ================================================================ */}
      <section className="relative">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="grid md:grid-cols-4 gap-px bg-foreground/10 border border-foreground/10">
            {STATS.map((s, i) => (
              <div
                key={s.key}
                className="group relative bg-background p-6 md:p-8 hover:bg-primary transition-colors duration-300 animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="mb-6">
                  <span className="font-mono-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground group-hover:text-foreground transition-colors">
                    // {s.tag}
                  </span>
                </div>
                <p className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-none tracking-tighter">
                  {s.value}
                </p>
                <p className="mt-4 text-sm text-muted-foreground group-hover:text-foreground/80 border-t border-foreground/15 group-hover:border-foreground/30 pt-3 transition-colors">
                  {t(s.key)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          CATEGORIES — bento asymmetric grid
      ================================================================ */}
      <section className="relative bg-foreground text-background overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-15" />
        <div className="absolute top-0 start-1/2 -translate-x-1/2 h-64 w-64 bg-primary/30 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="grid lg:grid-cols-12 gap-8 items-end mb-12 md:mb-16">
            <div className="lg:col-span-7 animate-fade-up">
              <p className="font-mono-display text-xs uppercase tracking-[0.3em] text-primary mb-4">
                → SERVICES
              </p>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight">
                {t("our_categories")}
              </h2>
            </div>
            <div className="lg:col-span-5 animate-fade-up delay-200">
              <p className="text-base md:text-lg text-background/70 leading-relaxed border-s-2 border-primary ps-5">
                {t("categories_subdesc")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-background/15 border border-background/15">
            {CATS.map((c, i) => {
              const featured = i === 0 || i === 5;
              return (
                <Link
                  key={c.key}
                  to="/services"
                  className={`group relative bg-foreground p-6 md:p-8 hover:bg-primary hover:text-foreground transition-colors duration-300 animate-fade-up ${
                    featured ? "lg:col-span-2 lg:row-span-1" : ""
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-end mb-12">
                    <ArrowUpRight className="h-5 w-5 text-background/30 group-hover:text-foreground group-hover:-translate-y-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all" />
                  </div>

                  <div className="relative inline-flex h-12 w-12 items-center justify-center mb-5">
                    <span className="absolute inset-0 bg-primary group-hover:bg-foreground transition-colors" />
                    <c.icon className="relative h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
                  </div>

                  <p className={`font-bold tracking-tight ${featured ? "text-2xl md:text-3xl" : "text-lg md:text-xl"}`}>
                    {t(c.key)}
                  </p>

                  {/* hover footer */}
                  <div className="mt-5 flex items-center gap-2 text-[10px] font-mono-display uppercase tracking-[0.25em] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>VIEW DETAILS</span>
                    <span className="h-px flex-1 bg-current/40" />
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-10 flex justify-end animate-fade-up">
            <Link
              to="/services"
              className="group inline-flex items-center gap-3 text-sm font-mono-display uppercase tracking-[0.25em] text-primary hover:text-background transition-colors"
            >
              ALL SERVICES
              <span className="h-px w-12 bg-current group-hover:w-20 transition-all" />
              <ArrowUpRight className="h-4 w-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================
          HOW IT WORKS — manifesto numerals timeline
      ================================================================ */}
      <section className="relative">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="grid lg:grid-cols-12 gap-8 items-end mb-14 md:mb-20">
            <div className="lg:col-span-7 animate-fade-up">
              <p className="font-mono-display text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
                → PROCESS
              </p>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight">
                {t("how_it_works")}
              </h2>
            </div>
            <div className="lg:col-span-5 flex lg:justify-end items-center gap-3 text-sm font-mono-display uppercase tracking-[0.25em] text-muted-foreground animate-fade-up delay-200">
              <Clock className="h-4 w-4" />
              <span>QUICK & EASY</span>
            </div>
          </div>

          <div className="space-y-px bg-foreground/10 border border-foreground/10">
            {[
              { icon: ClipboardList, title: t("step1_title"), desc: t("step1_desc") },
              { icon: UsersRound, title: t("step2_title"), desc: t("step2_desc") },
              { icon: CheckCircle2, title: t("step3_title"), desc: t("step3_desc") },
              { icon: Eye, title: t("step4_title"), desc: t("step4_desc") },
            ].map((s, i) => (
              <div
                key={i}
                className="group relative grid grid-cols-12 gap-4 md:gap-8 items-center bg-background hover:bg-primary transition-colors duration-300 py-7 md:py-10 px-4 md:px-6 animate-fade-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* mega numeral */}
                <div className="col-span-3 md:col-span-2">
                  <p className="font-mono-display text-6xl md:text-8xl lg:text-9xl font-light leading-none tracking-tighter">
                    {pad2(i + 1)}
                  </p>
                </div>

                {/* icon */}
                <div className="col-span-9 md:col-span-1 flex md:justify-center">
                  <div className="relative inline-flex h-12 w-12 items-center justify-center">
                    <span className="absolute inset-0 bg-foreground group-hover:bg-foreground rounded-sm" />
                    <s.icon className="relative h-5 w-5 text-primary" />
                  </div>
                </div>

                {/* title */}
                <div className="col-span-12 md:col-span-4">
                  <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">{s.title}</h3>
                </div>

                {/* desc */}
                <div className="col-span-12 md:col-span-4">
                  <p className="text-muted-foreground group-hover:text-foreground/80 leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                {/* arrow */}
                <div className="col-span-12 md:col-span-1 flex md:justify-end">
                  <ArrowUpRight className="h-6 w-6 text-foreground/30 group-hover:text-foreground group-hover:-translate-y-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          TRUST — pillars in yellow band
      ================================================================ */}
      <section className="relative bg-primary text-primary-foreground border-y-2 border-foreground/10 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-25" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="grid lg:grid-cols-12 gap-8 mb-14 items-end">
            <div className="lg:col-span-7 animate-fade-up">
              <p className="font-mono-display text-xs uppercase tracking-[0.3em] opacity-70 mb-4">
                → TRUST
              </p>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight">
                {t("why_us")}
              </h2>
            </div>
            <div className="lg:col-span-5 animate-fade-up delay-200">
              <p className="text-base md:text-lg leading-relaxed border-s-2 border-foreground ps-5 opacity-85">
                {t("footer_about")}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-foreground/15 border-2 border-foreground/15">
            {[
              { icon: ShieldCheck, title: t("trust_verified"), desc: t("trust_verified_desc"), tag: "// VERIFIED" },
              { icon: Eye, title: t("trust_transparent"), desc: t("trust_transparent_desc"), tag: "// TRANSPARENT" },
              { icon: Star, title: t("trust_rated"), desc: t("trust_rated_desc"), tag: "// RATED" },
            ].map((f, i) => (
              <div
                key={i}
                className="group relative bg-primary p-8 md:p-10 hover:bg-foreground hover:text-primary transition-colors duration-300 animate-fade-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-10">
                  <span className="font-mono-display text-xs uppercase tracking-[0.25em] opacity-70">
                    {f.tag}
                  </span>
                  <ArrowUpRight className="h-5 w-5 opacity-30 group-hover:opacity-100 group-hover:-translate-y-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all" />
                </div>

                <div className="relative inline-flex h-14 w-14 items-center justify-center mb-7">
                  <span className="absolute inset-0 bg-foreground group-hover:bg-primary transition-colors" />
                  <f.icon className="relative h-6 w-6 text-primary group-hover:text-foreground transition-colors" />
                </div>

                <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">{f.title}</h3>
                <p className="text-sm md:text-base opacity-80 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          TESTIMONIALS — oversized pull quotes
      ================================================================ */}
      <section className="relative">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="mb-14 animate-fade-up">
            <p className="font-mono-display text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
              → VOICES
            </p>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight">
              {t("testimonials_heading")}
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-px bg-foreground/10 border border-foreground/10">
            {TESTIMONIALS.map((tst, i) => {
              const name = t(tst.nameKey);
              return (
                <article
                  key={i}
                  className="group relative bg-background p-8 md:p-10 hover:bg-foreground hover:text-background transition-colors duration-300 animate-fade-up flex flex-col"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <div className="flex items-center justify-end mb-8">
                    <Quote className="h-7 w-7 text-primary" strokeWidth={2.5} />
                  </div>

                  <p className="text-xl md:text-2xl font-bold leading-snug tracking-tight flex-1">
                    "{t(tst.textKey)}"
                  </p>

                  <div className="mt-8 pt-6 border-t border-foreground/15 group-hover:border-background/30 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 bg-primary flex items-center justify-center font-extrabold text-foreground text-lg">
                        {name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold">{name}</p>
                        <p className="text-xs text-muted-foreground group-hover:text-background/70 font-mono-display uppercase tracking-[0.18em] transition-colors">
                          {t(tst.roleKey)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, n) => (
                        <Star key={n} className="h-3.5 w-3.5 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================
          CTA FINALE — manifesto cover
      ================================================================ */}
      <section className="relative bg-foreground text-background overflow-hidden border-t-2 border-foreground/10">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -top-32 -end-32 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-3xl animate-blob" />
        <div className="absolute -bottom-32 -start-32 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl animate-blob delay-300" />

        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8 animate-fade-up">
              <h2 className="font-extrabold leading-[0.88] tracking-tight">
                <span className="block text-5xl sm:text-7xl md:text-[7rem] lg:text-[9rem]">
                  {t("cta_ready_title")}
                </span>
                <span className="block mt-2 text-5xl sm:text-7xl md:text-[7rem] lg:text-[9rem] text-primary">
                  {t("cta_now")}
                </span>
              </h2>
              <p className="mt-8 text-base md:text-lg text-background/70 max-w-2xl leading-relaxed border-s-2 border-primary ps-5">
                {t("cta_join_thousands")}
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-3 animate-fade-up delay-200">
              <Button
                asChild
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-background hover:text-foreground rounded-none h-16 px-6 font-bold uppercase tracking-wider justify-between text-base group transition-colors"
              >
                <Link to="/register">
                  {t("request_now")}
                  <ArrowUpRight className="h-6 w-6 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-background bg-transparent text-background hover:bg-background hover:text-foreground rounded-none h-16 px-6 font-bold uppercase tracking-wider justify-between text-base group transition-colors"
              >
                <Link to="/login">
                  {t("login")}
                  <ArrowUpRight className="h-6 w-6 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                </Link>
              </Button>

              <div className="mt-4 pt-4 border-t border-background/20 flex items-center text-xs font-mono-display uppercase tracking-[0.25em] text-background/60">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  ENROLLMENT OPEN
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
