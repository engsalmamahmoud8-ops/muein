import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Tag,
  Upload,
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

type LucideIcon = LucideIcons.LucideIcon;
const ICON_MAP = LucideIcons as unknown as Record<string, LucideIcon>;
const kebabToPascal = (s: string) =>
  s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Tag;
  return (ICON_MAP[name] as LucideIcon) ?? (ICON_MAP[kebabToPascal(name)] as LucideIcon) ?? Tag;
}

type Category = {
  id: string;
  name_ar: string;
  name_en: string;
  name_tr: string | null;
  description_ar: string | null;
  description_en: string | null;
  description_tr: string | null;
  icon: string | null;
};

type GeoState =
  | { status: "idle" }
  | { status: "detecting" }
  | { status: "detected"; lat: number; lng: number }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "unsupported" };

export const Route = createFileRoute("/_app/customer/requests/new")({
  component: NewReq,
});

const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
const WEEKDAYS = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];

function todayLine(): string {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")} · ${d.getFullYear()}`;
}

function NewReq() {
  const { t, lang, dir } = useI18n() as { t: (k: string) => string; lang: string; dir?: "ltr" | "rtl" };
  const nav = useNavigate();
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const formTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = t("meta_new_request_title");
  }, [t]);

  const schema = z.object({
    category_id: z.string().uuid(t("select_service_required")),
    title: z.string().min(3, t("title_required")).max(120),
    description: z.string().min(20, t("description_min")).max(2000),
    address: z.string().min(5, t("address_required")).max(300),
    city: z.string().max(80).optional(),
  });
  type FormVals = z.infer<typeof schema>;

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      ((await supabase.from("service_categories").select("*").eq("is_active", true)).data ?? []) as Category[],
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", address: "", city: "" },
  });
  const catId = watch("category_id");
  const titleVal = watch("title") ?? "";
  const descVal = watch("description") ?? "";
  const addressVal = watch("address") ?? "";
  const cityVal = watch("city") ?? "";

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo({ status: "unsupported" });
      toast.error(t("location_unsupported"));
      return;
    }
    setGeo({ status: "detecting" });
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeo({ status: "detected", lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success(t("location_detected"));
      },
      err => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeo({ status: "denied" });
          toast.error(t("location_denied"));
        } else {
          setGeo({ status: "unavailable" });
          toast.error(t("location_unavailable"));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [t]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const displayName = (c: Category) =>
    (lang === "en" ? c.name_en : lang === "tr" ? c.name_tr : c.name_ar) || c.name_ar || c.name_en;
  const displayDesc = (c: Category) =>
    (lang === "en" ? c.description_en : lang === "tr" ? c.description_tr : c.description_ar) ?? "";

  const selectedCat = useMemo(
    () => (categories ?? []).find(c => c.id === catId),
    [categories, catId],
  );

  const completion = useMemo(() => {
    let n = 0;
    if (catId) n += 1;
    if (titleVal.trim().length >= 3) n += 1;
    if (descVal.trim().length >= 20) n += 1;
    if (addressVal.trim().length >= 5) n += 1;
    if (geo.status === "detected") n += 1;
    return n; // out of 5
  }, [catId, titleVal, descVal, addressVal, geo]);
  const readyToFile = completion === 5;

  const onSubmit = async (values: FormVals) => {
    if (geo.status !== "detected") {
      toast.error(t("location_required_to_submit"));
      requestLocation();
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data: req, error } = await supabase
      .from("service_requests")
      .insert({
        customer_id: user.id,
        ...values,
        lat: geo.lat,
        lng: geo.lng,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (images.length && req) {
      await supabase.from("request_images").insert(
        images.map(url => ({
          request_id: req.id,
          uploaded_by: user.id,
          url,
          type: "issue_photo" as const,
        })),
      );
    }
    toast.success(t("request_created"));
    nav({ to: `/customer/requests/${req!.id}` });
  };

  const isRTL = dir === "rtl";
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  const todayStr = todayLine();

  return (
    <div className="-m-4 md:-m-6 lg:-m-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,700;9..144,900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        .matter-bg {
          background-color: #f4f1ea;
          background-image:
            radial-gradient(circle at 12% 8%,  oklch(0.86 0.18 95 / 0.22) 0, transparent 38%),
            radial-gradient(circle at 92% 18%, oklch(0 0 0 / 0.05) 0, transparent 34%),
            radial-gradient(circle at 80% 92%, oklch(0.86 0.18 95 / 0.12) 0, transparent 40%),
            linear-gradient(180deg, transparent 0%, oklch(0 0 0 / 0.04) 100%);
        }
        .dark .matter-bg {
          background-color: #0e0e0d;
          background-image:
            radial-gradient(circle at 12% 8%,  oklch(0.88 0.18 95 / 0.18) 0, transparent 42%),
            radial-gradient(circle at 92% 18%, oklch(1 0 0 / 0.05) 0, transparent 36%),
            radial-gradient(circle at 80% 92%, oklch(0.88 0.18 95 / 0.10) 0, transparent 40%);
        }
        .grain { position: relative; }
        .grain::after {
          content:""; position:absolute; inset:0; pointer-events:none; opacity:.5; mix-blend-mode:multiply;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.28 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          background-size:220px 220px;
        }
        .dark .grain::after { mix-blend-mode: screen; opacity:.32; }

        .ed-display { font-family:'Fraunces', 'IBM Plex Sans Arabic', serif; font-variation-settings:"SOFT" 50, "WONK" 1; letter-spacing:-0.035em; line-height:0.92; }
        .ed-italic  { font-family:'Fraunces', serif; font-style: italic; font-variation-settings:"SOFT" 100, "WONK" 1; }
        .ed-serif   { font-family:'Fraunces', 'IBM Plex Sans Arabic', serif; }
        .ed-mono    { font-family:'IBM Plex Mono', ui-monospace, monospace; letter-spacing:0.22em; text-transform:uppercase; }

        .rule-thick { height:3px; background:currentColor; }
        .rule-thin  { height:1px; background:currentColor; opacity:.35; }
        .rule-hair  { height:1px; background:currentColor; opacity:.18; }

        .panel       { position:relative; background:transparent; border:1px solid currentColor; border-radius:0; }
        .panel-fill  { background:var(--color-foreground); color:var(--color-background); }
        .corner-tag {
          position:absolute; top:-1px; padding:.35rem .65rem; z-index:2;
          font-family:'IBM Plex Mono', monospace; font-size:.6rem; letter-spacing:.28em; text-transform:uppercase;
          background:var(--color-foreground); color:var(--color-primary);
        }

        /* Hero highlight bar — sits behind a serif word */
        .word-mark {
          position: relative;
          display: inline-block;
        }
        .word-mark::before {
          content:""; position:absolute; inset:auto -.15em .12em -.15em; height:.46em; z-index:-1;
          background: var(--color-primary);
          transform: skewX(-7deg);
        }

        /* Underline-only big field */
        .matter-field {
          width:100%; background:transparent; border:0;
          border-bottom: 1px solid var(--color-foreground);
          font-family: 'Fraunces', 'IBM Plex Sans Arabic', serif;
          font-size: 1.5rem; line-height: 1.35;
          padding: .65rem 0 .65rem 0;
          color: var(--color-foreground); outline: none;
          transition: border-color .2s, padding .2s, background-color .2s;
          border-radius: 0;
        }
        .matter-field::placeholder {
          color: color-mix(in oklab, var(--color-foreground), transparent 65%);
          font-family:'IBM Plex Sans Arabic','Inter', system-ui, sans-serif;
          font-style: italic;
          font-size: 1rem;
        }
        .matter-field:focus {
          border-bottom-color: var(--color-primary);
          border-bottom-width: 3px;
          padding-bottom: calc(.65rem - 2px);
        }
        .matter-field-err { border-bottom-color: var(--color-destructive) !important; }

        .matter-area {
          width:100%; background:transparent; border:1px solid var(--color-foreground);
          font-family: 'Fraunces', 'IBM Plex Sans Arabic', serif;
          font-size: 1.05rem; line-height: 1.55;
          padding: 1rem 1.1rem; color: var(--color-foreground); outline: none;
          border-radius:0; resize: vertical; min-height: 9rem;
          transition: box-shadow .18s ease, border-color .18s ease;
        }
        .matter-area:focus {
          box-shadow: 6px 6px 0 0 var(--color-primary);
        }
        [dir="rtl"] .matter-area:focus { box-shadow: -6px 6px 0 0 var(--color-primary); }

        /* Brutalist category tile */
        .trade-tile {
          position:relative; display:flex; flex-direction:column; gap:.85rem;
          padding: 1.1rem 1.1rem 1.15rem 1.1rem;
          background: var(--color-background);
          border: 1px solid var(--color-foreground);
          border-radius:0; text-align:start; cursor:pointer;
          transition: transform .18s ease, box-shadow .18s ease, background-color .18s, color .18s;
        }
        .trade-tile:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 0 var(--color-foreground); }
        [dir="rtl"] .trade-tile:hover { box-shadow:-5px 5px 0 0 var(--color-foreground); }
        .trade-tile[data-active="true"] {
          background: var(--color-foreground);
          color: var(--color-background);
          box-shadow: 6px 6px 0 0 var(--color-primary);
          transform: translate(-2px,-2px);
        }
        [dir="rtl"] .trade-tile[data-active="true"] { box-shadow:-6px 6px 0 0 var(--color-primary); }
        .trade-tile:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

        .trade-glyph {
          width: 2.6rem; height: 2.6rem; display:flex; align-items:center; justify-content:center;
          border: 1px solid currentColor;
        }
        .trade-tile[data-active="true"] .trade-glyph { background: var(--color-primary); color: var(--color-foreground); border-color: var(--color-primary); }

        /* Section heading layout */
        .sec-num {
          display:inline-flex; align-items:center; justify-content:center;
          height: 2.25rem; min-width: 4rem; padding: 0 .9rem;
          background: var(--color-foreground); color: var(--color-primary);
          font-family:'IBM Plex Mono', monospace; font-size:.7rem; letter-spacing:.32em; font-weight:600;
          text-transform: uppercase;
        }

        /* Big stamp CTA */
        .stamp-btn {
          position:relative; display:inline-flex; align-items:center; justify-content:space-between;
          gap:.75rem; width:100%; padding: 1.05rem 1.25rem;
          background: var(--color-foreground); color: var(--color-background);
          font-family:'IBM Plex Mono', monospace; font-size:.78rem; letter-spacing:.32em; font-weight:600; text-transform:uppercase;
          border: 1px solid var(--color-foreground); border-radius:0;
          box-shadow: 7px 7px 0 0 var(--color-primary);
          transition: transform .18s, box-shadow .18s, background-color .18s, color .18s;
          cursor: pointer;
        }
        .stamp-btn:hover:not(:disabled) { transform: translate(-2px,-2px); box-shadow: 9px 9px 0 0 var(--color-primary); }
        .stamp-btn:active:not(:disabled) { transform: translate(2px,2px); box-shadow: 3px 3px 0 0 var(--color-primary); }
        .stamp-btn:disabled { opacity:.55; cursor:not-allowed; box-shadow: 4px 4px 0 0 oklch(0 0 0 / 0.15); }
        [dir="rtl"] .stamp-btn { box-shadow:-7px 7px 0 0 var(--color-primary); }
        [dir="rtl"] .stamp-btn:hover:not(:disabled) { transform: translate(2px,-2px); box-shadow:-9px 9px 0 0 var(--color-primary); }
        [dir="rtl"] .stamp-btn:active:not(:disabled) { transform: translate(-2px,2px); box-shadow:-3px 3px 0 0 var(--color-primary); }
        [dir="rtl"] .stamp-btn:disabled { box-shadow:-4px 4px 0 0 oklch(0 0 0 / 0.15); }

        .ghost-btn {
          display:inline-flex; align-items:center; gap:.55rem;
          padding:.85rem 1rem; background:transparent; color: var(--color-foreground);
          border:1px solid var(--color-foreground); border-radius:0;
          font-family:'IBM Plex Mono', monospace; font-size:.72rem; letter-spacing:.28em; text-transform:uppercase;
          cursor:pointer; transition: background-color .15s, color .15s;
        }
        .ghost-btn:hover { background: var(--color-foreground); color: var(--color-primary); }

        /* Pulse dot for live state */
        .pulse-dot { position:relative; width:.6rem; height:.6rem; border-radius:9999px; background: oklch(0.7 0.18 145); }
        .pulse-dot::before {
          content:""; position:absolute; inset:-2px; border-radius:9999px;
          background: oklch(0.7 0.18 145 / 0.55);
          animation: matter-pulse 2s ease-out infinite;
        }
        @keyframes matter-pulse {
          0% { transform: scale(.6); opacity: .8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .pulse-dot-warn   { background: var(--color-primary); }
        .pulse-dot-warn::before { background: var(--color-primary); opacity: .35; }
        .pulse-dot-off    { background: color-mix(in oklab, var(--color-foreground), transparent 50%); }
        .pulse-dot-off::before { display:none; }

        /* Completion meter */
        .meter { display:grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
        .meter > span { height: 12px; border: 1px solid currentColor; }
        .meter > span.on { background: var(--color-primary); border-color: var(--color-primary); }

        /* Image tile */
        .img-tile {
          position: relative; aspect-ratio: 1 / 1; overflow: hidden;
          border: 1px solid var(--color-foreground); background: var(--color-background); border-radius:0;
        }
        .img-tile img { width:100%; height:100%; object-fit: cover; display:block; }
        .img-rm {
          position:absolute; top:6px; inset-inline-end:6px; height:1.75rem; width:1.75rem;
          background: var(--color-foreground); color: var(--color-primary); border:0;
          display:flex; align-items:center; justify-content:center; cursor:pointer; border-radius:0;
          box-shadow: 2px 2px 0 0 var(--color-primary);
        }
        [dir="rtl"] .img-rm { box-shadow:-2px 2px 0 0 var(--color-primary); }
        .img-add {
          position:relative; aspect-ratio: 1/1; display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:.5rem; cursor:pointer; border:1px dashed var(--color-foreground); background: transparent;
          font-family:'IBM Plex Mono', monospace; font-size:.65rem; letter-spacing:.28em; text-transform:uppercase;
          color: color-mix(in oklab, var(--color-foreground), transparent 30%);
          transition: background-color .18s, color .18s, border-style .18s;
        }
        .img-add:hover { background: var(--color-foreground); color: var(--color-primary); border-style: solid; }

        .ed-mark::before { content:"§"; margin-inline-end:.4rem; font-family:'Fraunces', serif; }

        /* Marquee */
        .matter-marquee { display:flex; gap:2.5rem; width:max-content; animation: matter-mq 38s linear infinite; }
        [dir="rtl"] .matter-marquee { animation-name: matter-mq-rtl; }
        @keyframes matter-mq      { from { transform: translateX(0);} to { transform: translateX(-50%);} }
        @keyframes matter-mq-rtl  { from { transform: translateX(0);} to { transform: translateX(50%);} }

        .star {
          display:inline-block; width:.7rem; height:.7rem; background: var(--color-primary);
          clip-path: polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
        }

        /* Fancy underline-skip used in hero/index */
        .underline-skip {
          background-image: linear-gradient(currentColor, currentColor);
          background-position: 0 92%; background-repeat:no-repeat;
          background-size: 100% 6px;
          padding-bottom: 2px;
        }

        /* Drawn entrance for hero rule */
        .draw-line { transform-origin: left; animation: draw .9s cubic-bezier(.7,.1,.2,1) both; }
        [dir="rtl"] .draw-line { transform-origin: right; }
        @keyframes draw { from { transform: scaleX(0);} to { transform: scaleX(1);} }

        /* Sidebar sticky on lg */
        @media (min-width: 1024px) {
          .bureau-stick { position: sticky; top: 1.5rem; }
        }

        /* Field label */
        .field-label {
          display:flex; align-items:baseline; justify-content:space-between; gap:.75rem;
          font-family:'IBM Plex Mono', monospace; font-size:.66rem; letter-spacing:.3em; text-transform:uppercase;
          color: color-mix(in oklab, var(--color-foreground), transparent 25%);
          margin-bottom:.35rem;
        }
        .field-count { font-family:'IBM Plex Mono', monospace; font-size:.65rem; letter-spacing:.18em; }

        .err-line {
          font-family:'IBM Plex Mono', monospace; font-size:.65rem; letter-spacing:.18em; text-transform:uppercase;
          color: var(--color-destructive); margin-top:.5rem; display:inline-flex; align-items:center; gap:.4rem;
        }

        .skel { background: linear-gradient(90deg, oklch(0 0 0 / 0.08), oklch(0 0 0 / 0.15), oklch(0 0 0 / 0.08));
                background-size:200% 100%; animation: skel-sh 1.6s linear infinite; }
        .dark .skel { background: linear-gradient(90deg, oklch(1 0 0 / 0.06), oklch(1 0 0 / 0.14), oklch(1 0 0 / 0.06)); background-size:200% 100%; }
        @keyframes skel-sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        /* Hairline list separator inside sidebar */
        .bureau-list > * + * { border-top: 1px solid color-mix(in oklab, currentColor, transparent 80%); }
      `}</style>

      <div className="matter-bg min-h-[calc(100vh-4rem)] text-foreground">
        {/* ═══ MASTHEAD ═══════════════════════════════════════════════ */}
        <section className="relative grain px-5 md:px-10 lg:px-16 pt-9 md:pt-12 pb-5">
          <div className="flex items-baseline justify-between flex-wrap gap-3">
            <div className="ed-mono text-[10px] md:text-[11px] text-foreground/70 flex items-center gap-3">
              <span className="inline-flex h-2 w-2 bg-foreground" />
              <span>VOL.&nbsp;Y &nbsp;·&nbsp; INTAKE BUREAU &nbsp;·&nbsp; A NEW MATTER</span>
            </div>
            <div className="ed-mono text-[10px] md:text-[11px] text-foreground/70 hidden md:flex items-center gap-3">
              <span>{todayStr}</span>
            </div>
          </div>
          <div className="mt-3 rule-thick text-foreground draw-line" />

          <div ref={formTopRef} className="mt-9 md:mt-12 grid grid-cols-12 gap-6 md:gap-10 items-end">
            <div className="col-span-12 lg:col-span-8">
              <div className="ed-mono text-[10px] md:text-[11px] text-foreground/60 mb-3 animate-fade-up">
                THE COVER &nbsp;·&nbsp; N° 0 &nbsp;·&nbsp; INTAKE
              </div>
              <h1 className="ed-display text-[3rem] sm:text-[4.25rem] md:text-[5.75rem] lg:text-[7rem] animate-fade-up">
                File a
                <span className="ed-italic font-light">&nbsp;new</span>
              </h1>
              <h2 className="ed-display text-[3rem] sm:text-[4.25rem] md:text-[5.75rem] lg:text-[7rem] -mt-2 animate-fade-up delay-100">
                <span className="word-mark">matter</span>
                <span className="ed-italic font-light">.</span>
              </h2>
              <p className="mt-6 max-w-2xl ed-italic text-lg md:text-xl text-foreground/75 animate-fade-up delay-200">
                Place it on the record. The bureau routes your request to the
                nearest qualified hand &mdash; quietly, without fuss.
              </p>
            </div>

            <aside className="col-span-12 lg:col-span-4 animate-fade-up delay-300">
              <BureauStrip geo={geo} requestLocation={requestLocation} />
            </aside>
          </div>
        </section>

        {/* Marquee strip */}
        <div className="border-y border-foreground/80 overflow-hidden bg-foreground text-background py-2.5 mt-3">
          <div className="matter-marquee ed-mono text-[11px]">
            {Array.from({ length: 2 }).flatMap((_, k) =>
              ["INTAKE OPEN", "ROUTED IN MINUTES", "VERIFIED HANDS", "FAIR PRICE", "QUIET DISPATCH", "ON THE RECORD", "FILED WITH CARE", "TRADESPEOPLE AT THE READY"].map((w, i) => (
                <span key={`${k}-${i}`} className="flex items-center gap-6">
                  <span className="star" />
                  <span>{w}</span>
                </span>
              )),
            )}
          </div>
        </div>

        {/* ═══ BODY: form + bureau ════════════════════════════════════ */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="px-5 md:px-10 lg:px-16 pt-10 md:pt-14 pb-20 grid grid-cols-12 gap-6 md:gap-10"
        >
          {/* ── LEFT: the manuscript ────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-8 space-y-14">
            {/* N° I — THE TRADE */}
            <SectionShell num="I" eyebrow="Choose the trade" title="The trade" italic="what shall we attend to?">
              {catsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="trade-tile">
                      <div className="skel h-10 w-10" />
                      <div className="skel h-4 w-2/3" />
                      <div className="skel h-3 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div role="radiogroup" aria-label={t("select_service")} className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(categories ?? []).map((c, idx) => {
                    const Icon = resolveIcon(c.icon);
                    const selected = catId === c.id;
                    const name = displayName(c);
                    const desc = displayDesc(c);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setValue("category_id", c.id, { shouldValidate: true })}
                        className="trade-tile"
                        data-active={selected ? "true" : "false"}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="trade-glyph">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="ed-mono text-[9px] opacity-60 leading-none pt-2">
                            № {String(idx + 1).padStart(2, "0")}
                          </div>
                        </div>
                        <div className="ed-serif text-lg leading-tight font-medium">{name}</div>
                        {desc && (
                          <div className="ed-italic text-xs leading-snug opacity-80 line-clamp-2">{desc}</div>
                        )}
                        {selected && (
                          <div className="absolute bottom-2 inset-inline-end-2 end-2 ed-mono text-[9px] flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            FILED
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.category_id && (
                <p className="err-line"><AlertTriangle className="h-3 w-3" />{errors.category_id.message}</p>
              )}
            </SectionShell>

            {/* N° II — THE PARTICULARS */}
            <SectionShell num="II" eyebrow="The particulars" title="The particulars" italic="state your case, plainly">
              <div className="space-y-7">
                <div>
                  <div className="field-label">
                    <span>{t("title")} &nbsp;·&nbsp; A short line</span>
                    <span className="field-count">{titleVal.length}/120</span>
                  </div>
                  <input
                    {...register("title")}
                    placeholder={t("request_title_placeholder")}
                    className={cn("matter-field", errors.title && "matter-field-err")}
                  />
                  {errors.title && (
                    <p className="err-line"><AlertTriangle className="h-3 w-3" />{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <div className="field-label">
                    <span>{t("description")} &nbsp;·&nbsp; The full account</span>
                    <span className="field-count">{descVal.length}/2000</span>
                  </div>
                  <textarea
                    {...register("description")}
                    rows={5}
                    placeholder={t("request_description_placeholder")}
                    className="matter-area"
                  />
                  {errors.description && (
                    <p className="err-line"><AlertTriangle className="h-3 w-3" />{errors.description.message}</p>
                  )}
                </div>
              </div>
            </SectionShell>

            {/* N° III — THE WHEREABOUTS */}
            <SectionShell num="III" eyebrow="The whereabouts" title="The whereabouts" italic="where we are to call">
              <div className="grid md:grid-cols-2 gap-7">
                <div>
                  <div className="field-label">
                    <span>{t("address")}</span>
                    <MapPin className="h-3 w-3" />
                  </div>
                  <input
                    {...register("address")}
                    placeholder={isRTL ? "العنوان التفصيلي" : "Street, building, apt..."}
                    className={cn("matter-field", errors.address && "matter-field-err")}
                  />
                  {errors.address && (
                    <p className="err-line"><AlertTriangle className="h-3 w-3" />{errors.address.message}</p>
                  )}
                </div>
                <div>
                  <div className="field-label">
                    <span>{t("city")}</span>
                  </div>
                  <input
                    {...register("city")}
                    placeholder={isRTL ? "المدينة" : "City, district..."}
                    className="matter-field"
                  />
                </div>
              </div>

              <div className="mt-6 panel p-4 md:p-5 text-foreground/85">
                <div className="flex items-start gap-3">
                  {geo.status === "detected" ? (
                    <span className="pulse-dot mt-2" aria-hidden />
                  ) : geo.status === "detecting" ? (
                    <Loader2 className="h-4 w-4 animate-spin mt-1.5" />
                  ) : (
                    <span className="pulse-dot pulse-dot-warn mt-2" aria-hidden />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="ed-mono text-[10px] mb-1">
                      {geo.status === "detected"
                        ? "PRESS · LOCATION FIXED"
                        : geo.status === "detecting"
                          ? "PRESS · TAKING THE BEARINGS"
                          : "PRESS · BEARINGS REQUIRED"}
                    </div>
                    {geo.status === "detected" ? (
                      <div className="ed-italic text-base">
                        {t("current_location")}: <span className="ed-mono not-italic tracking-normal text-sm">
                          {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
                        </span>
                      </div>
                    ) : geo.status === "detecting" ? (
                      <div className="ed-italic text-base">{t("detecting_location")}&hellip;</div>
                    ) : (
                      <>
                        <div className="ed-italic text-base">
                          {geo.status === "denied"
                            ? t("location_denied")
                            : geo.status === "unavailable"
                              ? t("location_unavailable")
                              : geo.status === "unsupported"
                                ? t("location_unsupported")
                                : t("location_required_desc")}
                        </div>
                        {geo.status !== "unsupported" && (
                          <button type="button" onClick={requestLocation} className="ghost-btn mt-3">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>
                              {geo.status === "denied" || geo.status === "unavailable"
                                ? t("retry_location")
                                : t("enable_location")}
                            </span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </SectionShell>

            {/* N° IV — THE EVIDENCE */}
            <SectionShell num="IV" eyebrow="The evidence" title="The evidence" italic="up to five photographs, kindly">
              <BrutalUploader value={images} onChange={setImages} />
            </SectionShell>
          </div>

          {/* ── RIGHT: BUREAU sidebar (sticky on lg) ─────────────────── */}
          <aside className="col-span-12 lg:col-span-4">
            <div className="bureau-stick space-y-5">
              <BureauDocket
                completion={completion}
                selectedCat={selectedCat ? displayName(selectedCat) : null}
                titleVal={titleVal}
                descVal={descVal}
                addressVal={addressVal}
                cityVal={cityVal}
                geo={geo}
                imageCount={images.length}
                isRTL={isRTL}
              />

              <button
                type="submit"
                disabled={loading || geo.status !== "detected" || !readyToFile}
                className="stamp-btn"
              >
                {loading ? (
                  <>
                    <span>FILING&hellip;</span>
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </>
                ) : !readyToFile ? (
                  <>
                    <span>{`COMPLETE ${completion}/5 TO FILE`}</span>
                    <Sparkles className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>{t("submit")} &nbsp;·&nbsp; STAMP &amp; FILE</span>
                    <Arrow className="h-4 w-4" />
                  </>
                )}
              </button>

              <Link
                to="/customer/requests"
                className="ghost-btn w-full justify-center"
              >
                <X className="h-3.5 w-3.5" />
                {t("cancel")}
              </Link>

              <div className="ed-mono text-[10px] text-foreground/55 leading-relaxed pt-2 border-t border-foreground/15">
                <span className="ed-mark" />
                ALL FILINGS ARE PRIVATE. ONLY THE TRADESPEOPLE WHO ACCEPT
                YOUR MATTER WILL SEE ITS PARTICULARS.
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Sub-components                                                       */
/* ──────────────────────────────────────────────────────────────────── */

function SectionShell({
  num,
  eyebrow,
  title,
  italic,
  children,
}: {
  num: string;
  eyebrow: string;
  title: string;
  italic: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <span className="sec-num">N° {num}</span>
          <span className="ed-mono text-[10px] text-foreground/55">{eyebrow}</span>
        </div>
        <div className="ed-italic text-foreground/55 hidden md:block">{italic}</div>
      </div>
      <h3 className="ed-display text-[2.4rem] md:text-[3.25rem] mb-5">
        {title}
        <span className="ed-italic font-light">.</span>
      </h3>
      <div className="rule-thick text-foreground mb-7" />
      {children}
    </section>
  );
}

function BureauStrip({
  geo,
  requestLocation,
}: {
  geo: GeoState;
  requestLocation: () => void;
}) {
  const live = geo.status === "detected";
  const detecting = geo.status === "detecting";
  return (
    <div className="panel p-5 relative">
      <div className="corner-tag start-3">PRESS STATUS</div>
      <div className="mt-5 flex items-center gap-3">
        <span
          className={cn(
            "pulse-dot",
            live ? "" : detecting ? "pulse-dot-warn" : "pulse-dot-off",
          )}
          aria-hidden
        />
        <span className="ed-mono text-[10px]">
          {live ? "THE PRESS IS WARM" : detecting ? "WARMING UP" : "AWAITING SIGNAL"}
        </span>
      </div>
      <p className="ed-italic mt-3 text-foreground/85 leading-snug text-sm">
        {live
          ? "Your bearings are taken. Proceed when ready."
          : detecting
            ? "One moment — we are checking your whereabouts."
            : "We require your bearings before we may dispatch."}
      </p>
      {!live && geo.status !== "detecting" && geo.status !== "unsupported" && (
        <button type="button" onClick={requestLocation} className="ghost-btn mt-4 text-[10px]">
          <MapPin className="h-3 w-3" /> ENABLE BEARINGS
        </button>
      )}
    </div>
  );
}

function BureauDocket({
  completion,
  selectedCat,
  titleVal,
  descVal,
  addressVal,
  cityVal,
  geo,
  imageCount,
  isRTL,
}: {
  completion: number;
  selectedCat: string | null;
  titleVal: string;
  descVal: string;
  addressVal: string;
  cityVal: string;
  geo: GeoState;
  imageCount: number;
  isRTL: boolean;
}) {
  const rows: Array<{ key: string; label: string; value: string; ok: boolean }> = [
    {
      key: "trade",
      label: "TRADE",
      value: selectedCat ?? (isRTL ? "—" : "—"),
      ok: !!selectedCat,
    },
    {
      key: "headline",
      label: "HEADLINE",
      value: titleVal.trim().length ? titleVal : "—",
      ok: titleVal.trim().length >= 3,
    },
    {
      key: "account",
      label: "ACCOUNT",
      value:
        descVal.trim().length === 0
          ? "—"
          : `${descVal.trim().slice(0, 64)}${descVal.length > 64 ? "…" : ""}`,
      ok: descVal.trim().length >= 20,
    },
    {
      key: "where",
      label: "WHERE",
      value:
        addressVal.trim().length === 0 && cityVal.trim().length === 0
          ? "—"
          : [addressVal, cityVal].filter(Boolean).join(" · "),
      ok: addressVal.trim().length >= 5,
    },
    {
      key: "bearings",
      label: "BEARINGS",
      value:
        geo.status === "detected"
          ? `${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}`
          : geo.status === "detecting"
            ? "Taking the bearings…"
            : "Not yet given",
      ok: geo.status === "detected",
    },
    {
      key: "evidence",
      label: "EVIDENCE",
      value: imageCount === 0 ? "None attached" : `${imageCount} photograph${imageCount === 1 ? "" : "s"}`,
      ok: true, // optional
    },
  ];

  return (
    <div className="panel-fill grain p-5 relative">
      <div className="corner-tag" style={{ insetInlineStart: "0.75rem" }}>
        DOCKET № PENDING
      </div>
      <div className="mt-7 flex items-baseline justify-between">
        <div className="ed-mono text-[10px] opacity-75">CONFIRMATION DESK</div>
        <div className="ed-mono text-[10px] opacity-75">{completion}/5</div>
      </div>
      <h4 className="ed-display text-3xl md:text-[2.5rem] mt-2 leading-none">
        At a
        <span className="ed-italic font-light">&nbsp;glance</span>.
      </h4>

      <div className="meter mt-5 text-background">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={i < completion ? "on" : ""} />
        ))}
      </div>

      <ul className="bureau-list mt-6">
        {rows.map(r => (
          <li key={r.key} className="py-3 flex items-start gap-4">
            <span className="ed-mono text-[9px] opacity-65 pt-1 w-20 shrink-0">{r.label}</span>
            <span className="flex-1 ed-serif text-[0.95rem] leading-snug break-words min-w-0">
              {r.ok ? r.value : <span className="opacity-55 ed-italic">{r.value}</span>}
            </span>
            <span
              className={cn(
                "shrink-0 w-2 h-2 mt-2 rounded-full",
                r.ok ? "bg-[var(--color-primary)]" : "bg-background/30",
              )}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function BrutalUploader({
  value,
  onChange,
  max = 5,
  bucket = "request-images",
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  bucket?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    if (value.length + files.length > max) {
      toast.error(`MAX ${max} PHOTOGRAPHS`);
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} > 5MB`);
          continue;
        }
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file);
        if (error) {
          toast.error(error.message);
          continue;
        }
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
        uploaded.push(pub.publicUrl);
      }
      onChange([...value, ...uploaded]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="ed-mono text-[10px] text-foreground/55 flex items-center justify-between">
        <span>{value.length} / {max} ATTACHED</span>
        <span className="ed-italic normal-case tracking-normal">jpg · png · webp · 5MB</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {value.map((u, i) => (
          <div key={u} className="img-tile group">
            <img src={u} alt="" />
            <div className="absolute top-1.5 inset-inline-start-1.5 ed-mono text-[9px] bg-foreground text-primary px-1.5 py-0.5">
              № {String(i + 1).padStart(2, "0")}
            </div>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="img-rm"
              aria-label="remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label className="img-add">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            <span>{uploading ? "UPLOADING" : "ATTACH"}</span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={e => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
    </div>
  );
}
