import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import * as LucideIcons from "lucide-react";
import { Tag, ArrowUpRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "خدماتنا — يمناك" },
      { name: "description", content: "خدمات منزلية شاملة: سباكة، كهرباء، تنظيف، صيانة مكيفات، دهان، نجارة، تركيب أثاث وأكثر." },
      { property: "og:title", content: "خدمات يمناك" },
      { property: "og:description", content: "كل ما يحتاجه منزلك في منصة واحدة." },
    ],
    links: [{ rel: "canonical", href: "/services" }],
  }),
  component: ServicesPage,
});

type LucideIcon = LucideIcons.LucideIcon;
type ServiceRow = {
  id: string;
  name_ar: string;
  name_en: string;
  name_tr: string | null;
  description_ar: string | null;
  description_en: string | null;
  description_tr: string | null;
  icon: string | null;
};

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  Object.entries(LucideIcons).filter(
    ([name, comp]) =>
      /^[A-Z]/.test(name) &&
      !name.endsWith("Icon") &&
      name !== "LucideIcon" &&
      name !== "Icon" &&
      name !== "createLucideIcon" &&
      typeof comp === "object",
  ),
) as Record<string, LucideIcon>;

const kebabToPascal = (s: string) =>
  s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");

function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Tag;
  return ICON_MAP[name] ?? ICON_MAP[kebabToPascal(name)] ?? Tag;
}

const pad2 = (n: number) => n.toString().padStart(2, "0");

function ServicesPage() {
  const { t, lang } = useI18n();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("service_categories")
        .select("id, name_ar, name_en, name_tr, description_ar, description_en, description_tr, icon")
        .eq("is_active", true)
        .order("name_ar");
      setServices((data as ServiceRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const pickName = (s: ServiceRow) =>
    (lang === "en" ? s.name_en : lang === "tr" ? s.name_tr : s.name_ar) || s.name_ar || s.name_en;
  const pickDesc = (s: ServiceRow) =>
    (lang === "en" ? s.description_en : lang === "tr" ? s.description_tr : s.description_ar) ?? "";

  const tickerItems = services.length ? services : Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name_ar: "" } as ServiceRow));

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* ============== Hero — editorial split ============== */}
      <section className="relative border-b border-foreground/10 overflow-hidden">
        {/* dotted grid backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
          }}
        />
        {/* yellow blob */}
        <div className="absolute -top-24 end-[-6rem] h-[28rem] w-[28rem] rounded-full bg-primary/40 blur-3xl animate-blob" />

        <div className="container mx-auto px-4 pt-16 md:pt-24 pb-12 md:pb-20 relative">
          <div className="grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8 animate-fade-up">
              <h1 className="font-extrabold leading-[0.95] tracking-tight text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem]">
                {t("services_title").split(" ").map((w, i, arr) => (
                  <span key={i} className="inline-block">
                    {i === arr.length - 1 ? (
                      <span className="relative">
                        <span className="absolute inset-x-0 bottom-1 md:bottom-3 h-3 md:h-5 bg-primary -z-10 rounded-sm" />
                        {w}
                      </span>
                    ) : (
                      <>{w}&nbsp;</>
                    )}
                  </span>
                ))}
              </h1>
            </div>
            <div className="lg:col-span-4 animate-fade-up delay-200">
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed border-s-2 border-primary ps-5 md:ps-6">
                {t("services_desc")}
              </p>
            </div>
          </div>
        </div>

        {/* Marquee strip */}
        <div className="relative bg-foreground text-background border-y border-foreground/10 py-4 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap min-w-max">
            {[...tickerItems, ...tickerItems].map((s, i) => (
              <span key={`${s.id}-${i}`} className="flex items-center gap-4 px-6 text-sm md:text-base font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono-display text-primary text-xs">{pad2((i % tickerItems.length) + 1)}</span>
                <span className="opacity-90">{s.name_ar ? pickName(s) : t("loading")}</span>
                <span className="text-foreground/40 mx-2">/</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============== Services grid — asymmetric numbered cards ============== */}
      <section className="relative">
        <div className="container mx-auto px-4 py-16 md:py-24">
          {/* section heading row */}
          <div className="mb-10 md:mb-14 animate-fade-up">
            <h2 className="text-2xl md:text-3xl font-bold">{t("our_categories")}</h2>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground/10 border border-foreground/10">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-background h-56 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground/10 border border-foreground/10">
              {services.map((s, i) => {
                const Icon = resolveIcon(s.icon);
                const isFeatured = i % 7 === 0;
                return (
                  <Link
                    key={s.id}
                    to="/register"
                    className={`group relative bg-background p-7 md:p-8 transition-colors duration-300 hover:bg-primary animate-fade-up ${
                      isFeatured ? "lg:col-span-2 lg:row-span-1" : ""
                    }`}
                    style={{ animationDelay: `${i * 55}ms` }}
                  >
                    {/* top row: number + arrow */}
                    <div className="flex items-start justify-between mb-8">
                      <span className="font-mono-display text-xs uppercase tracking-[0.25em] text-muted-foreground group-hover:text-foreground transition-colors">
                        // {pad2(i + 1)}
                      </span>
                      <ArrowUpRight className="h-5 w-5 text-foreground/30 group-hover:text-foreground group-hover:-translate-y-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all duration-300" />
                    </div>

                    {/* icon */}
                    <div className="relative inline-flex h-14 w-14 items-center justify-center mb-6">
                      <span className="absolute inset-0 bg-primary/30 group-hover:bg-foreground rounded-sm transition-colors" />
                      <span className="absolute inset-0 translate-x-1.5 translate-y-1.5 rtl:-translate-x-1.5 border border-foreground rounded-sm group-hover:translate-x-0 group-hover:translate-y-0 rtl:group-hover:-translate-x-0 transition-transform" />
                      <Icon className="relative h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
                    </div>

                    {/* title + description */}
                    <h3 className="text-xl md:text-2xl font-bold leading-tight tracking-tight">
                      {pickName(s)}
                    </h3>
                    {pickDesc(s) && (
                      <p className="mt-3 text-sm text-muted-foreground group-hover:text-foreground/80 leading-relaxed line-clamp-3">
                        {pickDesc(s)}
                      </p>
                    )}

                    {/* bottom CTA line */}
                    <div className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>{t("request_now")}</span>
                      <span className="h-px flex-1 bg-foreground/40" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============== Process strip ============== */}
      <section className="relative bg-foreground text-background py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-15" />
        <div className="container mx-auto px-4 relative">
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-background">{t("how_it_works")}</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-px bg-background/15">
            {[
              { t: t("step1_title"), d: t("step1_desc") },
              { t: t("step2_title"), d: t("step2_desc") },
              { t: t("step3_title"), d: t("step3_desc") },
              { t: t("step4_title"), d: t("step4_desc") },
            ].map((s, i) => (
              <div
                key={i}
                className="relative bg-foreground p-6 md:p-8 animate-fade-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <p className="font-mono-display text-5xl md:text-6xl font-light text-primary leading-none mb-6">
                  {pad2(i + 1)}
                </p>
                <h3 className="text-lg font-bold mb-2">{s.t}</h3>
                <p className="text-sm text-background/70 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== CTA ============== */}
      <section className="relative">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid lg:grid-cols-12 items-end gap-8">
            <div className="lg:col-span-8">
              <p className="font-mono-display text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">→ READY?</p>
              <h2 className="text-4xl md:text-6xl font-extrabold leading-[0.95] tracking-tight">
                {t("cta_ready_title")} <span className="text-primary">{t("cta_now")}</span>
              </h2>
              <p className="mt-4 text-muted-foreground max-w-xl">{t("cta_join_thousands")}</p>
            </div>
            <div className="lg:col-span-4 flex lg:justify-end">
              <Button
                asChild
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-foreground hover:text-primary rounded-none h-14 px-8 text-base font-bold uppercase tracking-wider transition-colors group"
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
