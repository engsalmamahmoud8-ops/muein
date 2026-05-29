import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/StatusBadge";
import type { RequestStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/customer/dashboard")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "لوحة التحكم — يمناك" }] }),
  component: Dash,
});

type Bucket = { word: string; cells: number };
const TOTAL_CELLS = 5;

function bucket(n: number): Bucket {
  if (n <= 0) return { word: "ALL QUIET", cells: 0 };
  if (n === 1) return { word: "A WHISPER", cells: 1 };
  if (n === 2) return { word: "A HANDFUL", cells: 2 };
  if (n <= 5) return { word: "A FEW", cells: 3 };
  if (n <= 10) return { word: "A CROWD", cells: 4 };
  return { word: "A FLOOD", cells: 5 };
}

function whenWord(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const days = Math.floor((now - then) / 86400000);
  if (days <= 0) return "TODAY";
  if (days === 1) return "YESTERDAY";
  if (days <= 6) return "THIS WEEK";
  if (days <= 29) return "THIS MONTH";
  if (days <= 89) return "EARLIER THIS SEASON";
  return "FROM THE ARCHIVE";
}

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const DAYS_ORD: Record<number, string> = {
  1: "FIRST", 2: "SECOND", 3: "THIRD", 4: "FOURTH", 5: "FIFTH", 6: "SIXTH", 7: "SEVENTH",
  8: "EIGHTH", 9: "NINTH", 10: "TENTH", 11: "ELEVENTH", 12: "TWELFTH", 13: "THIRTEENTH",
  14: "FOURTEENTH", 15: "FIFTEENTH", 16: "SIXTEENTH", 17: "SEVENTEENTH", 18: "EIGHTEENTH",
  19: "NINETEENTH", 20: "TWENTIETH", 21: "TWENTY‑FIRST", 22: "TWENTY‑SECOND",
  23: "TWENTY‑THIRD", 24: "TWENTY‑FOURTH", 25: "TWENTY‑FIFTH", 26: "TWENTY‑SIXTH",
  27: "TWENTY‑SEVENTH", 28: "TWENTY‑EIGHTH", 29: "TWENTY‑NINTH", 30: "THIRTIETH", 31: "THIRTY‑FIRST",
};
const WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function todayInWords(): { weekday: string; month: string; day: string; year: string } {
  const d = new Date();
  const y = d.getFullYear();
  const yearWords = y === 2026 ? "TWENTY TWENTY‑SIX" : y === 2027 ? "TWENTY TWENTY‑SEVEN" : y === 2025 ? "TWENTY TWENTY‑FIVE" : "THE PRESENT YEAR";
  return {
    weekday: WEEKDAYS[d.getDay()],
    month: MONTHS[d.getMonth()],
    day: DAYS_ORD[d.getDate()] ?? "—",
    year: yearWords,
  };
}

function Glyphs({ filled }: { filled: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: TOTAL_CELLS }).map((_, i) => (
        <span
          key={i}
          className={`h-3 w-3 border border-foreground ${i < filled ? "bg-foreground" : "bg-transparent"}`}
        />
      ))}
    </div>
  );
}

function Dash() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? "";
  const firstName = name.trim().split(/\s+/)[0] ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["customer-dash"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: requests } = await supabase
        .from("service_requests")
        .select("id, title, city, status, created_at, category:service_categories(name_ar, name_en, name_tr)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      const list = requests ?? [];
      const active = list.filter(r => !["completed", "cancelled"].includes(r.status)).length;
      const completed = list.filter(r => r.status === "completed").length;
      const pending = list.filter(r => r.status === "applications_received").length;
      return { list, active, completed, pending, total: list.length };
    },
  });

  const today = todayInWords();
  const total = bucket(data?.total ?? 0);
  const active = bucket(data?.active ?? 0);
  const pending = bucket(data?.pending ?? 0);
  const completed = bucket(data?.completed ?? 0);

  const categories = Array.from(
    new Set(
      (data?.list ?? [])
        .map(r => {
          const c = r.category;
          if (!c) return null;
          return (lang === "en" ? c.name_en : lang === "tr" ? (c.name_tr ?? c.name_ar) : c.name_ar) ?? c.name_ar;
        })
        .filter(Boolean) as string[]
    )
  );

  const marqueeWords = categories.length
    ? categories
    : ["PLUMBING", "ELECTRICAL", "CLEANING", "PAINTING", "AC REPAIR", "CARPENTRY", "MOVING", "GARDENING"];

  return (
    <div className="-m-4 md:-m-6 lg:-m-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,700;9..144,900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .dossier-bg {
          background-color: #f4f1ea;
          background-image:
            radial-gradient(circle at 18% 12%, oklch(0.86 0.18 95 / 0.18) 0, transparent 42%),
            radial-gradient(circle at 88% 6%,  oklch(0 0 0 / 0.05) 0, transparent 38%),
            linear-gradient(180deg, transparent 0%, oklch(0 0 0 / 0.04) 100%);
        }
        .dark .dossier-bg {
          background-color: #0e0e0d;
          background-image:
            radial-gradient(circle at 18% 12%, oklch(0.88 0.18 95 / 0.18) 0, transparent 45%),
            radial-gradient(circle at 88% 6%,  oklch(1 0 0 / 0.05) 0, transparent 40%);
        }
        .grain::after {
          content:""; position:absolute; inset:0; pointer-events:none; opacity:.5; mix-blend-mode:multiply;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.28 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          background-size:220px 220px;
        }
        .dark .grain::after { mix-blend-mode: screen; opacity:.35; }
        .ed-display { font-family:'Fraunces', 'IBM Plex Sans Arabic', serif; font-variation-settings:"SOFT" 50, "WONK" 1; letter-spacing:-0.035em; line-height:0.92; }
        .ed-italic { font-family:'Fraunces', serif; font-style: italic; font-variation-settings:"SOFT" 100, "WONK" 1; }
        .ed-mono { font-family:'IBM Plex Mono', ui-monospace, monospace; letter-spacing:0.22em; text-transform:uppercase; }
        .rule { height:1px; background:currentColor; opacity:.35; }
        .rule-thick { height:2px; background:currentColor; }
        .panel { position:relative; background:transparent; border:1px solid currentColor; }
        .panel-fill { background:var(--color-foreground); color:var(--color-background); }
        .stamp {
          position:relative; display:inline-flex; align-items:center; gap:.75rem;
          padding: 1.1rem 1.5rem;
          background:var(--color-foreground); color:var(--color-background);
          font-family:'IBM Plex Mono', monospace; font-size:.72rem; letter-spacing:.32em; text-transform:uppercase; font-weight:600;
          border:1px solid var(--color-foreground); box-shadow:8px 8px 0 0 var(--color-primary);
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .stamp:hover { transform: translate(-2px,-2px); box-shadow: 10px 10px 0 0 var(--color-primary); }
        .stamp:active { transform: translate(2px,2px); box-shadow: 3px 3px 0 0 var(--color-primary); }
        [dir="rtl"] .stamp { box-shadow:-8px 8px 0 0 var(--color-primary); }
        [dir="rtl"] .stamp:hover { transform: translate(2px,-2px); box-shadow:-10px 10px 0 0 var(--color-primary); }
        [dir="rtl"] .stamp:active { transform: translate(-2px,2px); box-shadow:-3px 3px 0 0 var(--color-primary); }
        .ghost-link {
          font-family:'IBM Plex Mono', monospace; font-size:.7rem; letter-spacing:.3em; text-transform:uppercase;
          padding:.6rem 0; border-bottom:1px solid currentColor; display:inline-flex; gap:.5rem; align-items:center;
        }
        .vrule { width:1px; background:currentColor; opacity:.25; }
        .hairline-list > * + * { border-top:1px solid currentColor; }
        .hairline-list { border-color: currentColor; }
        .pulse-dot {
          width:.55rem; height:.55rem; border-radius:9999px; background:var(--color-primary);
          box-shadow:0 0 0 0 var(--color-primary);
          animation: dot-pulse 2.2s ease-out infinite;
        }
        @keyframes dot-pulse {
          0%   { box-shadow:0 0 0 0 oklch(0.86 0.18 95 / .55); }
          70%  { box-shadow:0 0 0 12px oklch(0.86 0.18 95 / 0); }
          100% { box-shadow:0 0 0 0 oklch(0.86 0.18 95 / 0); }
        }
        .marquee-track {
          display:flex; gap:2.5rem; width:max-content;
          animation: dossier-marquee 42s linear infinite;
        }
        @keyframes dossier-marquee { from { transform:translateX(0);} to { transform:translateX(-50%);} }
        [dir="rtl"] .marquee-track { animation-name: dossier-marquee-rtl; }
        @keyframes dossier-marquee-rtl { from { transform:translateX(0);} to { transform:translateX(50%);} }
        .star {
          display:inline-block; width:.7rem; height:.7rem;
          background: var(--color-foreground);
          clip-path: polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
        }
        .corner-tag {
          position:absolute; top:-1px; padding:.35rem .65rem;
          font-family:'IBM Plex Mono', monospace; font-size:.6rem; letter-spacing:.28em; text-transform:uppercase;
          background:var(--color-foreground); color:var(--color-primary);
        }
        .ed-mark::before { content:"§"; margin-inline-end:.4rem; font-family:'Fraunces', serif; }
        .underline-skip {
          background-image: linear-gradient(currentColor, currentColor);
          background-position: 0 92%; background-repeat:no-repeat;
          background-size: 100% 6px;
          padding-bottom:2px;
        }
        .skel { background: linear-gradient(90deg, oklch(0 0 0 / 0.08), oklch(0 0 0 / 0.15), oklch(0 0 0 / 0.08));
                background-size:200% 100%; animation: skel-sh 1.6s linear infinite; }
        .dark .skel { background: linear-gradient(90deg, oklch(1 0 0 / 0.06), oklch(1 0 0 / 0.14), oklch(1 0 0 / 0.06)); background-size:200% 100%; }
        @keyframes skel-sh { 0%{ background-position:200% 0;} 100%{ background-position:-200% 0;} }
      `}</style>

      <div className="dossier-bg min-h-[calc(100vh-4rem)] text-foreground">
        {/* ─── MASTHEAD ────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="relative grain px-6 md:px-12 lg:px-16 pt-10 md:pt-14 pb-6">
            <div className="flex items-baseline justify-between flex-wrap gap-3">
              <div className="ed-mono text-[10px] md:text-[11px] flex items-center gap-3 text-foreground/70">
                <span className="inline-flex h-2 w-2 bg-foreground" />
                <span>VOL.&nbsp;Y &nbsp;·&nbsp; PRIVATE DOSSIER &nbsp;·&nbsp; CUSTOMER EDITION</span>
              </div>
              <div className="ed-mono text-[10px] md:text-[11px] text-foreground/70 hidden md:flex items-center gap-3">
                <span>{today.weekday}</span>
                <span className="opacity-40">/</span>
                <span>{today.day}&nbsp;OF&nbsp;{today.month}</span>
                <span className="opacity-40">/</span>
                <span>{today.year}</span>
              </div>
            </div>
            <div className="mt-3 rule-thick text-foreground" />

            <div className="mt-8 md:mt-10 grid grid-cols-12 gap-6 md:gap-10">
              <div className="col-span-12 lg:col-span-9">
                <div className="ed-mono text-[10px] md:text-[11px] text-foreground/60 mb-3">
                  THE COVER — N° I
                </div>
                <h1 className="ed-display text-[3.2rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[7.5rem] text-foreground">
                  Welcome
                  <span className="ed-italic font-light">&nbsp;back,</span>
                </h1>
                <h2 className="ed-display text-[2.4rem] sm:text-[3.4rem] md:text-[4.6rem] lg:text-[5.6rem] mt-1">
                  <span className="underline-skip" style={{ backgroundColor: "var(--color-primary)" }}>
                    {firstName || "friend"}
                  </span>
                  <span className="ed-italic font-light">.</span>
                </h2>
                <p className="mt-6 max-w-2xl ed-italic text-lg md:text-xl text-foreground/70">
                  {t("tagline")}
                </p>
              </div>

              <aside className="col-span-12 lg:col-span-3 flex flex-col gap-5">
                <div className="panel p-5 relative">
                  <div className="corner-tag start-3">FILED TODAY</div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="pulse-dot" />
                    <span className="ed-mono text-[10px]">THE PRESS IS WARM</span>
                  </div>
                  <p className="ed-italic mt-3 text-foreground/80 leading-snug">
                    Your matters are attended. Speak when you need us.
                  </p>
                </div>

                <Link to="/customer/requests/new" className="stamp w-full justify-between">
                  <span>{t("new_request")}</span>
                  <Arrow />
                </Link>

                <Link to="/customer/requests" className="ghost-link text-foreground">
                  <span>{t("my_requests")}</span>
                  <Arrow small />
                </Link>
              </aside>
            </div>
          </div>

          {/* Marquee strip */}
          <div className="border-y border-foreground/80 overflow-hidden bg-foreground text-background py-2.5">
            <div className="marquee-track ed-mono text-[11px]">
              {[...marqueeWords, ...marqueeWords].map((w, i) => (
                <span key={i} className="flex items-center gap-6">
                  <span className="star" style={{ background: "var(--color-primary)" }} />
                  <span>{w}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ─── STATUS ATLAS ────────────────────────────────────────────── */}
        <section className="px-6 md:px-12 lg:px-16 pt-10">
          <div className="flex items-baseline justify-between mb-5">
            <h3 className="ed-mono text-[11px] text-foreground/70">THE LEDGER &nbsp;·&nbsp; AT A GLANCE</h3>
            <div className="ed-italic text-foreground/60 hidden md:block">a quiet weighing of things</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-0 border border-foreground">
            <AtlasPanel
              label="ON RECORD"
              caption="the entire docket"
              bucketVal={total}
              loading={isLoading}
            />
            <AtlasPanel
              label="OPEN MATTERS"
              caption="under your watch"
              bucketVal={active}
              loading={isLoading}
              accent
            />
            <AtlasPanel
              label="AWAITING VERDICT"
              caption="offers to consider"
              bucketVal={pending}
              loading={isLoading}
            />
            <AtlasPanel
              label="LAID TO REST"
              caption="favourably resolved"
              bucketVal={completed}
              loading={isLoading}
              last
            />
          </div>
        </section>

        {/* ─── INDEX + PULSE ───────────────────────────────────────────── */}
        <section className="px-6 md:px-12 lg:px-16 pt-12 pb-16">
          <div className="grid grid-cols-12 gap-0 border border-foreground bg-background/40">
            {/* INDEX */}
            <div className="col-span-12 lg:col-span-8 p-6 md:p-8 relative">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <div>
                  <div className="ed-mono text-[11px] text-foreground/70">THE INDEX</div>
                  <h3 className="ed-display text-3xl md:text-4xl mt-1">{t("recent_requests")}</h3>
                </div>
                <Link to="/customer/requests" className="ghost-link text-foreground">
                  <span>READ THE FULL DOSSIER</span>
                  <Arrow small />
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border-t border-foreground/20 pt-4">
                      <div className="skel h-6 w-2/3 rounded" />
                      <div className="skel h-3 w-1/3 mt-2 rounded" />
                    </div>
                  ))}
                </div>
              ) : data?.list.length ? (
                <ul className="hairline-list border-foreground/20">
                  {data.list.slice(0, 6).map((r) => {
                    const cat = r.category
                      ? (lang === "en" ? r.category.name_en : lang === "tr" ? (r.category.name_tr ?? r.category.name_ar) : r.category.name_ar) ?? r.category.name_ar
                      : null;
                    return (
                      <li key={r.id} className="group">
                        <Link
                          to="/customer/requests/$id"
                          params={{ id: r.id }}
                          className="flex items-start gap-6 py-5"
                        >
                          <div className="ed-mono text-[10px] pt-2 text-foreground/55 w-20 shrink-0">
                            {whenWord(r.created_at)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="ed-display text-2xl md:text-3xl leading-tight">
                              <span className="group-hover:underline-skip">
                                <span
                                  className="group-hover:px-1 transition-all"
                                  style={{ backgroundImage: "linear-gradient(transparent 70%, var(--color-primary) 70%)" }}
                                >
                                  {r.title}
                                </span>
                              </span>
                            </div>
                            <div className="mt-2 ed-mono text-[10px] text-foreground/60 flex flex-wrap items-center gap-x-4 gap-y-1">
                              {cat && <span>· {cat.toUpperCase()}</span>}
                              {r.city && <span>· {r.city.toUpperCase()}</span>}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <StatusBadge status={r.status as RequestStatus} />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyDocket />
              )}
            </div>

            {/* PULSE column */}
            <div className="col-span-12 lg:col-span-4 border-t lg:border-t-0 lg:border-s border-foreground p-6 md:p-8 flex flex-col gap-8 bg-foreground text-background relative grain">
              <div>
                <div className="ed-mono text-[10px] text-background/60">THE PULSE</div>
                <h4 className="ed-display text-3xl mt-1">How things stand.</h4>
              </div>

              <PulseRow label="Open matters" bucketVal={active} dark />
              <PulseRow label="Awaiting verdict" bucketVal={pending} dark />
              <PulseRow label="Laid to rest" bucketVal={completed} dark />

              <div className="rule" />

              <div>
                <div className="ed-mono text-[10px] text-background/60">A SUGGESTION</div>
                <p className="ed-italic mt-2 text-lg leading-snug">
                  {active.cells === 0
                    ? "Begin a new chapter. Pen the first request of the day."
                    : "Tend to the open matters. They wait kindly, but they wait."}
                </p>
                <Link
                  to={active.cells === 0 ? "/customer/requests/new" : "/customer/requests"}
                  className="mt-5 ed-mono text-[10px] inline-flex items-center gap-2 pb-1 border-b border-background"
                >
                  {active.cells === 0 ? "OPEN A NEW MATTER" : "ATTEND TO THEM"}
                  <Arrow small light />
                </Link>
              </div>

              {/* Decorative folio */}
              <div className="mt-auto flex items-end justify-between pt-6">
                <div className="ed-display text-5xl opacity-90">Y.</div>
                <div className="ed-mono text-[9px] text-background/60 text-end">
                  <div>FOLIO &nbsp;·&nbsp; PRIVATE</div>
                  <div>SET IN FRAUNCES &amp; PLEX</div>
                </div>
              </div>
            </div>
          </div>

          {/* Closing rule */}
          <div className="mt-10 flex items-center gap-4 text-foreground/60">
            <div className="flex-1 rule" />
            <span className="ed-mono text-[10px]">— FIN DE DOSSIER —</span>
            <div className="flex-1 rule" />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── building blocks ──────────────────────────────────────────────── */

function AtlasPanel({
  label, caption, bucketVal, loading, accent, last,
}: { label: string; caption: string; bucketVal: Bucket; loading?: boolean; accent?: boolean; last?: boolean }) {
  return (
    <div
      className={`relative p-6 md:p-7 border-foreground ${last ? "" : "md:border-e xl:border-e"} border-b md:border-b-0 last:border-b-0 ${accent ? "bg-primary text-primary-foreground" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="ed-mono text-[10px]">{label}</div>
        <span className="ed-mono text-[10px] opacity-60">№</span>
      </div>
      <div className="mt-7 md:mt-10">
        {loading ? (
          <div className="skel h-9 w-32 rounded" />
        ) : (
          <div className="ed-display text-4xl md:text-5xl leading-none">
            {bucketVal.word.split(" ").map((w, i, arr) =>
              i === arr.length - 1 ? (
                <span key={i} className="ed-italic font-light">{" " + w.toLowerCase()}</span>
              ) : (
                <span key={i}>{i === 0 ? "" : " "}{w.toLowerCase()}</span>
              )
            )}
            <span className="ed-italic">.</span>
          </div>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <Glyphs filled={bucketVal.cells} />
        <span className="ed-italic text-sm opacity-70">{caption}</span>
      </div>
    </div>
  );
}

function PulseRow({ label, bucketVal, dark }: { label: string; bucketVal: Bucket; dark?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className={`ed-mono text-[10px] ${dark ? "text-background/60" : "text-foreground/60"}`}>
            {label.toUpperCase()}
          </div>
          <div className="ed-display text-2xl mt-1">
            <span className="ed-italic font-light">{bucketVal.word.toLowerCase()}.</span>
          </div>
        </div>
        <div className={dark ? "[&_span]:border-background [&_.on]:bg-background" : ""}>
          <DarkGlyphs filled={bucketVal.cells} dark={!!dark} />
        </div>
      </div>
    </div>
  );
}

function DarkGlyphs({ filled, dark }: { filled: number; dark: boolean }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: TOTAL_CELLS }).map((_, i) => (
        <span
          key={i}
          className={`h-3 w-3 border ${dark ? "border-background" : "border-foreground"} ${
            i < filled ? (dark ? "bg-background" : "bg-foreground") : "bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}

function EmptyDocket() {
  return (
    <div className="py-16 md:py-20 text-center max-w-xl mx-auto">
      <div className="ed-mono text-[10px] text-foreground/60">NIHIL · NOTHING ON THE TABLE</div>
      <h4 className="ed-display text-5xl md:text-6xl mt-3">
        The docket
        <span className="ed-italic font-light"> is quiet.</span>
      </h4>
      <p className="ed-italic mt-4 text-foreground/70 text-lg">
        Pen the first request, and we shall take it from here.
      </p>
      <div className="mt-8 inline-block">
        <Link to="/customer/requests/new" className="stamp">
          <span>OPEN A MATTER</span>
          <Arrow />
        </Link>
      </div>
    </div>
  );
}

function Arrow({ small, light }: { small?: boolean; light?: boolean } = {}) {
  const size = small ? 14 : 18;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={light ? "currentColor" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className="rtl:rotate-180"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M13 5l7 7-7 7" />
    </svg>
  );
}
