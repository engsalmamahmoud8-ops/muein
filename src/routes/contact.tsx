import { createFileRoute } from "@tanstack/react-router";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا — يمناك" },
      { name: "description", content: "تواصل مع فريق يمناك لأي استفسار أو دعم." },
      { property: "og:title", content: "تواصل مع يمناك" },
      { property: "og:description", content: "نحن هنا لمساعدتك." },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useI18n();
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    await new Promise(r => setTimeout(r, 700));
    setSending(false);
    (e.target as HTMLFormElement).reset();
    toast.success(t("message_sent"));
  };

  const channels = [
    { icon: Mail, label: t("email"), value: "hello@ymnak.sa", href: "mailto:hello@ymnak.sa", tag: "01" },
    { icon: Phone, label: t("phone"), value: "+966 50 000 0000", href: "tel:+966500000000", tag: "02" },
    { icon: MapPin, label: t("contact_address"), value: t("footer_location"), href: null, tag: "03" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* ============== Editorial Hero ============== */}
      <section className="relative border-b border-foreground/10 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.3] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
          }}
        />
        <div className="absolute top-32 -end-32 h-[24rem] w-[24rem] rounded-full bg-primary/40 blur-3xl animate-blob" />

        <div className="container mx-auto px-4 pt-16 md:pt-24 pb-12 relative">
          <div className="grid lg:grid-cols-12 gap-6 items-end">
            <div className="lg:col-span-9">
              <h1 className="font-extrabold leading-[0.92] tracking-tight text-5xl sm:text-7xl md:text-[6rem] lg:text-[7.5rem]">
                {t("contact_title")
                  .split(" ")
                  .map((word, i, arr) => (
                    <span
                      key={i}
                      className="inline-block animate-fade-up"
                      style={{ animationDelay: `${i * 140}ms` }}
                    >
                      {word}
                      {i < arr.length - 1 && " "}
                    </span>
                  ))}
                <span className="inline-block ms-3 align-middle text-primary">.</span>
              </h1>
            </div>
            <div className="lg:col-span-3">
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed border-s-2 border-primary ps-5">
                {t("contact_desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============== Main grid: channels list + form ============== */}
      <section className="relative">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Channels — editorial numbered list */}
            <div className="lg:col-span-5">
              <div className="sticky top-24">
                <div className="mb-8 animate-fade-up">
                  <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight">
                    قنوات التواصل
                  </h2>
                </div>

                <ul className="divide-y divide-foreground/15 border-y border-foreground/15">
                  {channels.map((c, i) => {
                    const inner = (
                      <div className="group flex items-center gap-5 py-6 transition-colors">
                        <span className="font-mono-display text-xs uppercase tracking-[0.25em] text-muted-foreground w-10 shrink-0">
                          // {c.tag}
                        </span>
                        <div className="relative h-12 w-12 shrink-0 flex items-center justify-center">
                          <span className="absolute inset-0 bg-primary/30 group-hover:bg-primary transition-colors rounded-sm" />
                          <c.icon className="relative h-5 w-5 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-mono-display uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
                            {c.label}
                          </p>
                          <p className="font-semibold text-base md:text-lg truncate group-hover:text-primary-foreground transition-colors" dir={c.href?.startsWith("mailto") || c.href?.startsWith("tel") ? "ltr" : undefined}>
                            {c.value}
                          </p>
                        </div>
                        {c.href && (
                          <ArrowUpRight className="h-5 w-5 text-foreground/30 group-hover:text-foreground group-hover:-translate-y-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all shrink-0" />
                        )}
                      </div>
                    );
                    return (
                      <li
                        key={i}
                        className="animate-fade-up"
                        style={{ animationDelay: `${i * 80 + 100}ms` }}
                      >
                        {c.href ? (
                          <a href={c.href} className="block hover:bg-primary/10 -mx-2 px-2">
                            {inner}
                          </a>
                        ) : (
                          <div className="-mx-2 px-2">{inner}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* business hours card */}
                <div className="mt-8 relative animate-fade-up delay-300">
                  <div className="absolute inset-0 translate-x-2 translate-y-2 rtl:-translate-x-2 bg-foreground" />
                  <div className="relative bg-primary border-2 border-foreground p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono-display text-[10px] uppercase tracking-[0.25em] font-semibold">
                        // RESPONSE TIME
                      </span>
                      <span className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
                    </div>
                    <p className="text-2xl font-extrabold leading-tight">
                      عادةً نرد خلال أقل من ساعة
                    </p>
                    <p className="mt-2 text-xs opacity-80">{t("footer_location")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-7">
              <div className="relative animate-fade-up delay-200">
                <div className="absolute -top-3 -end-3 z-10 bg-foreground text-primary font-mono-display text-[10px] uppercase tracking-[0.25em] px-3 py-1.5">
                  // FORM
                </div>
                <form
                  onSubmit={submit}
                  className="relative border-2 border-foreground p-6 md:p-10 bg-background"
                >
                  <div className="mb-8 pb-6 border-b border-foreground/15">
                    <p className="font-mono-display text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">→ NEW MESSAGE</p>
                    <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                      {t("send_message")}
                    </h3>
                  </div>

                  <div className="space-y-7">
                    <div className="grid sm:grid-cols-2 gap-7">
                      <div className="space-y-2">
                        <Label
                          htmlFor="name"
                          className="font-mono-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
                        >
                          // 01 — {t("name")}
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          required
                          className="h-12 rounded-none border-0 border-b-2 border-foreground/30 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 text-lg font-medium placeholder:text-muted-foreground/50"
                          placeholder="—"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="email"
                          className="font-mono-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
                        >
                          // 02 — {t("email")}
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          dir="ltr"
                          className="h-12 rounded-none border-0 border-b-2 border-foreground/30 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 text-lg font-medium placeholder:text-muted-foreground/50"
                          placeholder="name@domain.sa"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="message"
                        className="font-mono-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
                      >
                        // 03 — {t("message")}
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        rows={6}
                        required
                        className="rounded-none border-0 border-b-2 border-foreground/30 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 text-lg font-medium placeholder:text-muted-foreground/50 resize-none"
                        placeholder="—"
                      />
                    </div>
                  </div>

                  <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-foreground/15">
                    <p className="text-xs font-mono-display uppercase tracking-[0.25em] text-muted-foreground">
                      Encrypted · No spam · GDPR safe
                    </p>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={sending}
                      className="bg-foreground text-primary hover:bg-primary hover:text-foreground rounded-none h-14 px-8 font-bold uppercase tracking-wider w-full sm:w-auto transition-colors group"
                    >
                      {sending ? (
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                          {t("loading")}
                        </span>
                      ) : (
                        <>
                          {t("send_message")}
                          <ArrowUpRight className="h-5 w-5 ms-2 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
