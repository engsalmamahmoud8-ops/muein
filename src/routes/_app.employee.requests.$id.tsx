import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/ImageUploader";
import { useI18n } from "@/lib/i18n";
import { ALLOWED_NEXT_STATUS, type RequestStatus } from "@/lib/types";
import { fetchNotesWithAuthors } from "@/lib/notes";
import { haversineKm, readCachedEmployeeLocation } from "@/lib/geo";
import { resolveIcon } from "@/lib/icons";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  MapPin,
  Inbox,
  Phone,
  MessageSquare,
  Navigation,
  ExternalLink,
  Send,
  Image as ImageIcon,
  CheckCircle2,
  ArrowLeft,
  Clock,
  Banknote,
  Timer,
  ShieldCheck,
  ChevronRight,
  Radio,
  Crosshair,
  Compass,
  Hash,
  Mail,
  FileSignature,
} from "lucide-react";

export const Route = createFileRoute("/_app/employee/requests/$id")({
  component: EmpDetail,
});

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string | null | undefined): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function postedAgo(t: (k: never) => string, iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return t("posted_ago_just_now" as never);
  if (min < 60) return (t("posted_ago_minutes" as never) as string).replace("{n}", String(min));
  const h = Math.floor(min / 60);
  if (h < 24) return (t("posted_ago_hours" as never) as string).replace("{n}", String(h));
  const d = Math.floor(h / 24);
  return (t("posted_ago_days" as never) as string).replace("{n}", String(d));
}

const STATUS_BAR_TONE: Record<RequestStatus, string> = {
  pending: "bg-foreground text-primary",
  applications_received: "bg-foreground text-primary",
  assigned: "bg-primary text-foreground",
  on_the_way: "bg-primary text-foreground",
  inspection_started: "bg-primary text-foreground",
  quotation_provided: "bg-primary text-foreground",
  customer_approved_quotation: "bg-primary text-foreground",
  work_in_progress: "bg-primary text-foreground",
  waiting_customer_response: "bg-primary text-foreground",
  completed: "bg-foreground text-primary",
  cancelled: "bg-destructive text-destructive-foreground",
  disputed: "bg-destructive text-destructive-foreground",
};

/* ------------------------------------------------------------------ */
/*  primitives                                                         */
/* ------------------------------------------------------------------ */

function SectionHead({ num, label, kicker }: { num: string; label: string; kicker?: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <span className="section-num">{num}</span>
      <h2 className="font-display text-2xl leading-none tracking-tight">{label}</h2>
      {kicker && (
        <span className="ms-auto font-mono-ui text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {kicker}
        </span>
      )}
    </div>
  );
}

function Panel({
  children,
  className = "",
  shadow,
  tone = "card",
}: {
  children: React.ReactNode;
  className?: string;
  shadow?: "sm" | "lg" | null;
  tone?: "card" | "yellow" | "ghost";
}) {
  const bg = tone === "yellow" ? "panel-yellow" : tone === "ghost" ? "bg-background" : "bg-card";
  const sh = shadow === "lg" ? "brutal-shadow" : shadow === "sm" ? "brutal-shadow-sm" : "";
  return (
    <section className={`relative border border-foreground ${bg} ${sh} ${className}`}>
      {children}
    </section>
  );
}

function KeyBox({
  icon: Icon,
  label,
  value,
  mono,
  tone = "card",
}: {
  icon: typeof Crosshair;
  label: string;
  value: string;
  mono?: boolean;
  tone?: "card" | "fill";
}) {
  const isFill = tone === "fill";
  return (
    <div
      className={`border border-foreground px-3 py-2.5 flex items-center gap-3 min-w-0 ${
        isFill ? "bg-foreground text-primary" : "bg-card"
      }`}
    >
      <div
        className={`h-9 w-9 flex items-center justify-center shrink-0 ${
          isFill ? "bg-primary text-foreground" : "bg-foreground text-primary"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div
          className={`label-mono truncate ${isFill ? "text-primary/80" : "text-muted-foreground"}`}
        >
          {label}
        </div>
        <div
          className={`${mono ? "font-mono-display text-sm" : "font-display text-lg"} leading-none tabular-nums truncate mt-0.5`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  main                                                               */
/* ------------------------------------------------------------------ */

function EmpDetail() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const isRtl = lang === "ar";
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [price, setPrice] = useState("");
  const [eta, setEta] = useState("");
  const [note, setNote] = useState("");
  const [proof, setProof] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState<string>("");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    document.title = t("meta_employee_request_detail");
  }, [t]);

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["emp-req", id],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: emp } = await supabase
        .from("employees")
        .select("id, lat, lng")
        .eq("user_id", user!.id)
        .maybeSingle();
      const [req, images, app, history, notes] = await Promise.all([
        supabase
          .from("service_requests")
          .select("*, category:service_categories(name_ar, name_en, name_tr, icon)")
          .eq("id", id)
          .single(),
        supabase.from("request_images").select("*").eq("request_id", id).order("created_at"),
        emp
          ? supabase
              .from("request_applications")
              .select("*")
              .eq("request_id", id)
              .eq("employee_id", emp.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("request_history").select("*").eq("request_id", id).order("created_at"),
        fetchNotesWithAuthors(id),
      ]);
      let customer: {
        full_name: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
      } | null = null;
      if (req.data?.customer_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, phone, address, city")
          .eq("id", req.data.customer_id)
          .maybeSingle();
        customer = prof ?? null;
      }
      return {
        emp,
        req: req.data,
        customer,
        images: images.data ?? [],
        myApp: app.data,
        history: history.data ?? [],
        notes,
      };
    },
  });

  const images = useMemo(() => data?.images ?? [], [data?.images]);

  if (isLoading) return <SkeletonDispatch />;
  if (!data?.req) return <EmptyDispatch isRtl={isRtl} title={t("no_data")} />;

  const isAssigned = data.req.assigned_employee_id === data.emp?.id;
  const canApply = !data.myApp && ["pending", "applications_received"].includes(data.req.status);
  const nextOptions = ALLOWED_NEXT_STATUS[data.req.status as RequestStatus] ?? [];
  const category = data.req.category as {
    name_ar?: string;
    name_en?: string;
    name_tr?: string;
    icon?: string | null;
  } | null;
  const customer = data.customer;
  const CategoryIcon = resolveIcon(category?.icon ?? null);
  const categoryName = category
    ? (lang === "en" ? category.name_en : lang === "tr" ? category.name_tr : category.name_ar) ||
      category.name_ar ||
      category.name_en
    : "";
  const hasCoords = typeof data.req.lat === "number" && typeof data.req.lng === "number";
  const empCoords =
    data.emp?.lat && data.emp?.lng
      ? { lat: data.emp.lat, lng: data.emp.lng }
      : readCachedEmployeeLocation();
  const distanceKm =
    hasCoords && empCoords
      ? haversineKm(empCoords, { lat: data.req.lat as number, lng: data.req.lng as number })
      : null;

  const apply = async () => {
    const { error } = await supabase.from("request_applications").insert({
      request_id: id,
      employee_id: data.emp!.id,
      message: msg || null,
      estimated_price: price ? Number(price) : null,
      estimated_arrival_minutes: eta ? Number(eta) : null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(t("application_submitted"));
      setMsg("");
      setPrice("");
      setEta("");
      qc.invalidateQueries({ queryKey: ["emp-req", id] });
    }
  };
  const updateStatus = async () => {
    if (!newStatus) return;
    const { error } = await supabase
      .from("service_requests")
      .update({ status: newStatus as RequestStatus })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("status_updated"));
      setNewStatus("");
      qc.invalidateQueries({ queryKey: ["emp-req", id] });
    }
  };
  const addNote = async () => {
    if (!note.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("request_notes")
      .insert({ request_id: id, author_id: user!.id, body: note });
    if (error) toast.error(error.message);
    else {
      setNote("");
      toast.success(t("note_added"));
      qc.invalidateQueries({ queryKey: ["emp-req", id] });
    }
  };
  const saveProof = async () => {
    if (!proof.length) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("request_images").insert(
      proof.map((url) => ({
        request_id: id,
        uploaded_by: user!.id,
        url,
        type: "completion_proof" as const,
      })),
    );
    if (error) toast.error(error.message);
    else {
      setProof([]);
      toast.success(t("uploaded"));
      qc.invalidateQueries({ queryKey: ["emp-req", id] });
    }
  };

  const mapsLink = hasCoords
    ? empCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${empCoords.lat},${empCoords.lng}&destination=${data.req.lat},${data.req.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${data.req.lat},${data.req.lng}`
    : null;
  const embedSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(data.req.lng as number) - 0.01}%2C${
        (data.req.lat as number) - 0.01
      }%2C${(data.req.lng as number) + 0.01}%2C${(data.req.lat as number) + 0.01}&layer=mapnik&marker=${
        data.req.lat
      }%2C${data.req.lng}`
    : null;

  const ticketCode = id.slice(0, 8).toUpperCase();
  const timeStr = now.toLocaleTimeString(
    lang === "ar" ? "ar-EG" : lang === "tr" ? "tr-TR" : "en-US",
    { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false },
  );
  const dateStr = now.toLocaleDateString(
    lang === "ar" ? "ar-EG" : lang === "tr" ? "tr-TR" : "en-US",
    { weekday: "short", year: "numeric", month: "short", day: "2-digit" },
  );
  const statusTone =
    STATUS_BAR_TONE[data.req.status as RequestStatus] ?? "bg-foreground text-primary";

  return (
    <div className="space-y-6 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 bg-background min-h-[calc(100vh-4rem)]">
      {/* === LIVE STRIP === */}
      <div className="border border-foreground bg-background overflow-hidden animate-fade-down">
        <div className="flex items-center divide-x divide-foreground/20 [&>*]:px-3 [&>*]:py-2 rtl:divide-x-reverse text-[10px] font-mono-ui tracking-[0.22em] uppercase">
          <div className="flex items-center gap-2 bg-foreground text-background">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping bg-primary" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="font-semibold">LIVE</span>
          </div>
          <div className="hidden sm:block">{dateStr}</div>
          <div className="font-mono-display tabular-nums tracking-[0.18em]">{timeStr}</div>
          <div className="hidden md:flex items-center gap-1.5">
            <Hash className="h-3 w-3" /> TICKET-{ticketCode}
          </div>
          <div className="flex-1" />
          <div className="hidden lg:flex items-center gap-1.5">
            <Radio className="h-3 w-3" /> CHANNEL-002
          </div>
          <div className={`font-semibold flex items-center gap-1.5 ${statusTone}`}>
            <span className="status-dot status-dot-warn" />
            {t(`status_${data.req.status}` as never)}
          </div>
        </div>
      </div>

      {/* === BACK + META RAIL === */}
      <div className="flex items-center justify-between gap-3 flex-wrap animate-fade-down delay-75">
        <Link
          to="/employee/requests/nearby"
          className="group inline-flex items-center gap-2 label-mono text-foreground hover:text-primary transition-colors"
        >
          <span className="h-6 w-6 border border-foreground bg-foreground text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-foreground transition-colors">
            <ArrowLeft className={`h-3 w-3 ${isRtl ? "rotate-180" : ""}`} />
          </span>
          {t("back_to_nearby")}
        </Link>
        <div className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {postedAgo(t as never, data.req.created_at)} ·{" "}
          {format(new Date(data.req.created_at), "yyyy.MM.dd")}
        </div>
      </div>

      {/* === MASTHEAD === */}
      <header className="grid grid-cols-12 gap-4 items-end pb-4 border-b-2 border-foreground animate-fade-up delay-100">
        <div className="col-span-12 lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {categoryName && (
              <span className="inline-flex items-center gap-2 border border-foreground bg-foreground text-primary px-2.5 py-1 font-mono-ui text-[10px] uppercase tracking-[0.22em]">
                <CategoryIcon className="h-3 w-3" />
                {categoryName}
              </span>
            )}
            {isAssigned && (
              <span className="inline-flex items-center gap-1.5 border border-foreground bg-primary text-foreground px-2.5 py-1 font-mono-ui text-[10px] uppercase tracking-[0.22em]">
                <ShieldCheck className="h-3 w-3" />
                {t("assigned_employee")}
              </span>
            )}
            {data.myApp && !isAssigned && (
              <span className="inline-flex items-center gap-1.5 border border-foreground bg-card text-foreground px-2.5 py-1 font-mono-ui text-[10px] uppercase tracking-[0.22em]">
                <FileSignature className="h-3 w-3" />
                {t("your_application")}
              </span>
            )}
            <span className="ms-auto font-mono-ui text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              REF · {ticketCode}
            </span>
          </div>

          <div className="label-mono text-muted-foreground mb-2">
            DISPATCH · {isRtl ? "بطاقة الطلب" : "JOB BRIEF"}
          </div>
          <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] tracking-tight text-foreground">
            <span className="block">{data.req.title}</span>
            <span className="text-primary">.</span>
          </h1>

          {data.req.address && (
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-foreground" />
              <span>
                {data.req.address}
                {data.req.city ? `، ${data.req.city}` : ""}
              </span>
            </p>
          )}
        </div>

        <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-2">
          <KeyBox
            icon={Navigation}
            label={isRtl ? "المسافة" : "DISTANCE"}
            value={distanceKm !== null ? `${distanceKm.toFixed(1)} ${t("distance_km")}` : "—"}
            tone={distanceKm !== null ? "fill" : "card"}
          />
          <KeyBox
            icon={ImageIcon}
            label={isRtl ? "صور" : "PHOTOS"}
            value={String(images.length).padStart(2, "0")}
          />
          <KeyBox
            icon={Crosshair}
            label={isRtl ? "إحداثيات" : "COORDS"}
            value={
              hasCoords
                ? `${(data.req.lat as number).toFixed(2)}, ${(data.req.lng as number).toFixed(2)}`
                : "—"
            }
            mono
          />
          <KeyBox icon={Compass} label={isRtl ? "المدينة" : "CITY"} value={data.req.city || "—"} />
        </div>
      </header>

      {/* === GRID === */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6 min-w-0 animate-fade-up delay-200">
          {/* BRIEF */}
          <Panel className="p-6">
            <SectionHead num="01" label={t("description")} kicker={isRtl ? "نص الطلب" : "BRIEF"} />
            <div className="rule-thin mb-4 opacity-30" />
            <p className="font-display text-lg text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {data.req.description}
            </p>
          </Panel>

          {/* PHOTOS */}
          {images.length > 0 && (
            <Panel className="p-6">
              <SectionHead
                num="02"
                label={t("request_images")}
                kicker={`${String(images.length).padStart(2, "0")} ${isRtl ? "صور" : "frames"}`}
              />
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-0 border border-foreground">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setLightboxIdx(i)}
                    className="group relative aspect-square overflow-hidden border border-foreground -ml-px -mt-px focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <img
                      src={img.url}
                      alt={`${t("photo_label")} ${i + 1}`}
                      className="absolute inset-0 h-full w-full object-cover grayscale-[0.15] transition-all duration-500 group-hover:grayscale-0 group-hover:scale-105"
                    />
                    <span className="absolute top-1 left-1 font-mono-ui text-[10px] tracking-[0.18em] bg-foreground text-primary px-1.5 py-0.5">
                      #{String(i + 1).padStart(2, "0")}
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
          )}

          {/* APPLY — yellow stamp panel */}
          {canApply && (
            <Panel tone="yellow" shadow="lg" className="overflow-hidden">
              <div className="panel-stripes absolute inset-0" />
              <div className="panel-noise absolute inset-0" />
              <div className="relative p-6 md:p-8 space-y-5">
                <div className="flex items-baseline gap-3">
                  <span className="section-num">03</span>
                  <h2 className="font-display text-3xl leading-none tracking-tight">
                    {t("apply_now")}
                  </h2>
                  <span className="ms-auto font-mono-ui text-[10px] uppercase tracking-[0.22em] opacity-70">
                    {isRtl ? "تقديم العرض" : "SUBMIT BID"}
                  </span>
                </div>
                <div className="rule-bold opacity-90" />

                <div className="space-y-4">
                  <div>
                    <label className="label-mono block mb-2">{t("message")}</label>
                    <textarea
                      value={msg}
                      onChange={(e) => setMsg(e.target.value)}
                      rows={3}
                      placeholder={isRtl ? "اكتب رسالة موجزة..." : "Type a brief pitch..."}
                      className="w-full bg-background border border-foreground p-3 font-display text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-foreground resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-mono mb-2 flex items-center gap-1.5">
                        <Banknote className="h-3 w-3" />
                        {t("estimated_price")}
                      </label>
                      <div className="num-readout bg-background">
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="0"
                          className="num-readout-value text-2xl"
                        />
                        <span className="num-readout-unit">SAR</span>
                      </div>
                    </div>
                    <div>
                      <label className="label-mono mb-2 flex items-center gap-1.5">
                        <Timer className="h-3 w-3" />
                        {t("estimated_arrival")}
                      </label>
                      <div className="num-readout bg-background">
                        <input
                          type="number"
                          value={eta}
                          onChange={(e) => setEta(e.target.value)}
                          placeholder="0"
                          className="num-readout-value text-2xl"
                        />
                        <span className="num-readout-unit">MIN</span>
                      </div>
                    </div>
                  </div>

                  <button onClick={apply} className="btn-stamp">
                    <Send className="h-3.5 w-3.5 me-2" />
                    {t("apply")}
                    <ChevronRight className={`h-3.5 w-3.5 ms-2 ${isRtl ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {/* STATUS UPDATE — assigned only */}
          {isAssigned && (
            <Panel shadow="sm" className="p-6">
              <SectionHead
                num="04"
                label={t("update_status")}
                kicker={isRtl ? "تحديث الحالة" : "ADVANCE"}
              />
              {nextOptions.length ? (
                <div>
                  <p className="label-mono text-muted-foreground mb-3">
                    {isRtl ? "اختر الحالة التالية" : "SELECT NEXT STATE"}
                  </p>
                  <div className="seg-group w-full">
                    {nextOptions.map((s) => {
                      const active = newStatus === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          data-active={active}
                          onClick={() => setNewStatus(s)}
                          className="seg-chip flex-1 min-w-[8rem]"
                        >
                          {t(`status_${s}` as never)}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={updateStatus} disabled={!newStatus} className="btn-stamp mt-4">
                    <CheckCircle2 className="h-3.5 w-3.5 me-2" />
                    {t("save")}
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-foreground/40 p-4 text-center">
                  <p className="font-mono-ui text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    — {t("no_next_transition")} —
                  </p>
                </div>
              )}
            </Panel>
          )}

          {/* PROOF UPLOAD — assigned only */}
          {isAssigned && (
            <Panel shadow="sm" className="p-6">
              <SectionHead
                num="05"
                label={t("upload_proof")}
                kicker={isRtl ? "إثبات الإنجاز" : "EVIDENCE"}
              />
              <div className="border border-dashed border-foreground/50 p-4">
                <ImageUploader value={proof} onChange={setProof} bucket="completion-proofs" />
              </div>
              {proof.length > 0 && (
                <button onClick={saveProof} className="btn-stamp mt-4">
                  <CheckCircle2 className="h-3.5 w-3.5 me-2" />
                  {t("save")}
                </button>
              )}
            </Panel>
          )}

          {/* TIMELINE */}
          <Panel className="p-6">
            <SectionHead num="06" label={t("history")} kicker={isRtl ? "السجل" : "AUDIT LOG"} />
            <DispatchTimeline entries={data.history as never} />
          </Panel>

          {/* NOTES */}
          {(isAssigned || data.myApp) && (
            <Panel className="p-6">
              <SectionHead
                num="07"
                label={t("notes")}
                kicker={isRtl ? "محادثة الميدان" : "CHATTER"}
              />
              <div className="space-y-3">
                {data.notes.length === 0 && (
                  <div className="border border-dashed border-foreground/30 p-6 text-center">
                    <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      — {isRtl ? "لا توجد ملاحظات" : "no transmissions"} —
                    </p>
                  </div>
                )}
                {data.notes.map((n, i) => (
                  <article
                    key={n.id}
                    className="border border-foreground bg-card p-4 flex items-start gap-3"
                  >
                    <div className="h-10 w-10 border border-foreground bg-foreground text-primary flex items-center justify-center font-mono-ui text-xs font-semibold tracking-[0.1em] shrink-0">
                      {getInitials(n.author?.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <p className="font-display text-base leading-none truncate">
                          {n.author?.full_name ?? "—"}
                        </p>
                        <p className="font-mono-ui text-[9px] uppercase tracking-[0.22em] text-muted-foreground shrink-0">
                          #{String(i + 1).padStart(2, "0")}
                        </p>
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/85">
                        {n.body}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              {isAssigned && (
                <div className="mt-5 border-t-2 border-foreground pt-4">
                  <label className="label-mono mb-2 block">{t("add_note")}</label>
                  <div className="flex gap-2 items-stretch">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={isRtl ? "اكتب ملاحظة جديدة..." : "Transmit a new note..."}
                      rows={2}
                      className="flex-1 bg-background border border-foreground p-3 font-display text-base focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                    <button
                      onClick={addNote}
                      className="border border-foreground bg-foreground text-primary px-4 font-mono-ui text-[10px] uppercase tracking-[0.22em] font-semibold hover:bg-primary hover:text-foreground transition-colors flex flex-col items-center justify-center gap-1 shrink-0"
                    >
                      <Send className="h-4 w-4" />
                      {t("send")}
                    </button>
                  </div>
                </div>
              )}
            </Panel>
          )}
        </div>

        {/* === SIDEBAR === */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start animate-fade-up delay-300">
          {/* CUSTOMER DOSSIER */}
          <Panel shadow="sm">
            <div className="border-b border-foreground bg-foreground text-primary px-4 py-2 flex items-center justify-between">
              <span className="label-mono">CLIENT · DOSSIER</span>
              <Hash className="h-3 w-3" />
            </div>
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-14 w-14 border border-foreground bg-primary text-foreground flex items-center justify-center font-display text-xl font-semibold shrink-0">
                  {getInitials(customer?.full_name)}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="font-display text-xl leading-tight truncate">
                    {customer?.full_name || "—"}
                  </p>
                  <p className="label-mono text-muted-foreground">{t("customer_info")}</p>
                </div>
              </div>

              <ul className="border-t border-foreground/20 divide-y divide-foreground/15 text-sm">
                <li className="flex items-center justify-between gap-2 py-2.5">
                  <span className="label-mono text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> TEL
                  </span>
                  {customer?.phone ? (
                    <a
                      href={`tel:${customer.phone}`}
                      className="font-mono-display text-sm tabular-nums text-foreground hover:text-primary underline-offset-4 hover:underline truncate"
                    >
                      {customer.phone}
                    </a>
                  ) : (
                    <span className="font-mono-display text-muted-foreground">—</span>
                  )}
                </li>
                {data.req.address && (
                  <li className="flex items-start justify-between gap-2 py-2.5">
                    <span className="label-mono text-muted-foreground flex items-center gap-1.5 shrink-0 mt-0.5">
                      <MapPin className="h-3 w-3" /> ADDR
                    </span>
                    <span className="text-end font-display text-sm leading-snug break-words">
                      {data.req.address}
                      {data.req.city ? `، ${data.req.city}` : ""}
                    </span>
                  </li>
                )}
              </ul>

              {customer?.phone && (
                <div className="mt-4 grid grid-cols-2 gap-0 border border-foreground">
                  <a
                    href={`tel:${customer.phone}`}
                    className="flex items-center justify-center gap-2 py-3 font-mono-ui text-[10px] uppercase tracking-[0.22em] font-semibold bg-foreground text-primary border-e border-foreground hover:bg-primary hover:text-foreground transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" /> {t("call_customer")}
                  </a>
                  <a
                    href={`sms:${customer.phone}`}
                    className="flex items-center justify-center gap-2 py-3 font-mono-ui text-[10px] uppercase tracking-[0.22em] font-semibold bg-card text-foreground hover:bg-foreground hover:text-primary transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> {t("send_message")}
                  </a>
                </div>
              )}
            </div>
          </Panel>

          {/* FIELD OPS MAP */}
          <Panel>
            <div className="border-b border-foreground bg-foreground text-primary px-4 py-2 flex items-center justify-between">
              <span className="label-mono flex items-center gap-1.5">
                <Compass className="h-3 w-3" /> FIELD · OPS
              </span>
              <span className="status-dot status-dot-live" />
            </div>
            <div className="p-4 flex items-center justify-between gap-2">
              <h3 className="font-display text-base leading-none">{t("customer_location")}</h3>
              {mapsLink && (
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 font-mono-ui text-[10px] uppercase tracking-[0.18em] font-semibold border border-foreground bg-card px-2 py-1 hover:bg-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  {empCoords ? t("get_directions") : t("open_in_maps")}
                </a>
              )}
            </div>
            {hasCoords && embedSrc ? (
              <div>
                <div className="border-y border-foreground relative">
                  <iframe
                    title="customer-location-map"
                    src={embedSrc}
                    className="w-full h-[220px] border-0 block grayscale-[0.4]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="px-4 py-2 flex items-center justify-between gap-2 font-mono-ui text-[10px] uppercase tracking-[0.22em] text-muted-foreground bg-card">
                  <span>LAT/LNG</span>
                  <span className="font-mono-display text-foreground tabular-nums normal-case tracking-normal">
                    {(data.req.lat as number).toFixed(5)}, {(data.req.lng as number).toFixed(5)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="px-4 pb-4">
                <div className="border border-dashed border-foreground/30 py-6 text-center">
                  <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    — {t("no_location")} —
                  </p>
                </div>
              </div>
            )}
          </Panel>

          {/* QUICK FACTS — stat strip */}
          <Panel>
            <div className="border-b border-foreground bg-foreground text-primary px-4 py-2">
              <span className="label-mono">{t("quick_facts")}</span>
            </div>
            <ul className="divide-y divide-foreground/15">
              <li className="flex items-baseline justify-between gap-2 px-4 py-3">
                <span className="label-mono text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> {t("posted_label")}
                </span>
                <span className="font-mono-display text-sm tabular-nums">
                  {format(new Date(data.req.created_at), "yyyy.MM.dd · HH:mm")}
                </span>
              </li>
              {categoryName && (
                <li className="flex items-baseline justify-between gap-2 px-4 py-3">
                  <span className="label-mono text-muted-foreground flex items-center gap-1.5">
                    <CategoryIcon className="h-3 w-3" /> {t("category")}
                  </span>
                  <span className="font-display text-base leading-none">{categoryName}</span>
                </li>
              )}
              {distanceKm !== null && (
                <li className="flex items-baseline justify-between gap-2 px-4 py-3 bg-primary/10">
                  <span className="label-mono text-foreground flex items-center gap-1.5">
                    <Navigation className="h-3 w-3" /> {t("distance_from_you")}
                  </span>
                  <span className="font-display text-2xl font-light leading-none tabular-nums">
                    {distanceKm.toFixed(1)}
                    <span className="font-mono-ui text-[10px] ms-1 tracking-[0.18em] text-muted-foreground">
                      {t("distance_km").toUpperCase()}
                    </span>
                  </span>
                </li>
              )}
              <li className="flex items-baseline justify-between gap-2 px-4 py-3">
                <span className="label-mono text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-3 w-3" /> {t("request_images")}
                </span>
                <span className="font-mono-display text-sm tabular-nums">
                  {String(images.length).padStart(2, "0")}
                </span>
              </li>
            </ul>
          </Panel>

          {/* MY APPLICATION RECEIPT */}
          {data.myApp && !isAssigned && (
            <Panel shadow="sm" tone="ghost">
              <div className="border-b border-foreground bg-primary text-foreground px-4 py-2 flex items-center justify-between">
                <span className="label-mono flex items-center gap-1.5">
                  <FileSignature className="h-3 w-3" /> RECEIPT · BID
                </span>
                <Mail className="h-3 w-3" />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="label-mono text-muted-foreground">
                    {t("application_status")}
                  </span>
                  <span
                    className={`border border-foreground px-2 py-0.5 font-mono-ui text-[10px] uppercase tracking-[0.22em] font-semibold ${
                      data.myApp.status === "accepted" ? "bg-primary text-foreground" : "bg-card"
                    }`}
                  >
                    {data.myApp.status === "accepted"
                      ? t("status_assigned" as never)
                      : t("status_pending" as never)}
                  </span>
                </div>

                <div className="rule-thin opacity-30" />

                {data.myApp.estimated_price != null && (
                  <div className="flex items-baseline justify-between">
                    <span className="label-mono text-muted-foreground flex items-center gap-1.5">
                      <Banknote className="h-3 w-3" /> {t("estimated_price")}
                    </span>
                    <span className="font-display text-2xl font-light leading-none tabular-nums">
                      {data.myApp.estimated_price}
                      <span className="font-mono-ui text-[10px] ms-1 tracking-[0.18em] text-muted-foreground">
                        SAR
                      </span>
                    </span>
                  </div>
                )}
                {data.myApp.estimated_arrival_minutes != null && (
                  <div className="flex items-baseline justify-between">
                    <span className="label-mono text-muted-foreground flex items-center gap-1.5">
                      <Timer className="h-3 w-3" /> {t("estimated_arrival")}
                    </span>
                    <span className="font-display text-2xl font-light leading-none tabular-nums">
                      {data.myApp.estimated_arrival_minutes}
                      <span className="font-mono-ui text-[10px] ms-1 tracking-[0.18em] text-muted-foreground">
                        {t("minutes_unit").toUpperCase()}
                      </span>
                    </span>
                  </div>
                )}
                {data.myApp.message && (
                  <div className="border-t-2 border-dashed border-foreground/40 pt-3 mt-1">
                    <p className="label-mono text-muted-foreground mb-1.5">{t("message")}</p>
                    <p className="font-display text-sm leading-relaxed whitespace-pre-wrap">
                      {data.myApp.message}
                    </p>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </aside>
      </div>

      {/* === COLOPHON === */}
      <footer className="border-t border-foreground/30 pt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-ui uppercase tracking-[0.22em] text-muted-foreground">
        <span>— END OF BRIEF —</span>
        <span>
          YMNAK / FIELD / TICKET-{ticketCode} · {data.req.status.toUpperCase()}
        </span>
      </footer>

      {/* === LIGHTBOX === */}
      <Dialog open={lightboxIdx !== null} onOpenChange={(open) => !open && setLightboxIdx(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border border-foreground rounded-none">
          {lightboxIdx !== null && images[lightboxIdx] && (
            <div className="relative">
              <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-3 py-2 bg-foreground text-primary font-mono-ui text-[10px] uppercase tracking-[0.22em]">
                <span>
                  FRAME #{String(lightboxIdx + 1).padStart(2, "0")} /{" "}
                  {String(images.length).padStart(2, "0")}
                </span>
                <span>TICKET-{ticketCode}</span>
              </div>
              <img
                src={images[lightboxIdx].url}
                alt={t("photo_label")}
                className="w-full max-h-[80vh] object-contain bg-black pt-8"
              />
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightboxIdx(i)}
                      className={`h-1 transition-all ${
                        i === lightboxIdx ? "bg-primary w-8" : "bg-white/40 hover:bg-white/70 w-3"
                      }`}
                      aria-label={`${t("photo_label")} ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TIMELINE                                                           */
/* ------------------------------------------------------------------ */

type HistoryEntry = {
  id: string;
  event_type: string;
  from_status: RequestStatus | null;
  to_status: RequestStatus | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

function DispatchTimeline({ entries }: { entries: HistoryEntry[] }) {
  const { t, lang } = useI18n();
  const isRtl = lang === "ar";
  if (!entries.length) {
    return (
      <div className="border border-dashed border-foreground/30 p-6 text-center">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          — {isRtl ? "لا توجد أحداث" : "no events recorded"} —
        </p>
      </div>
    );
  }
  return (
    <ol className="relative">
      <span className="absolute top-0 bottom-0 inset-inline-start-[7px] w-px bg-foreground" />
      {entries.map((e, i) => {
        const label =
          e.event_type === "request_created"
            ? isRtl
              ? "تم إنشاء الطلب"
              : "Request created"
            : e.event_type === "status_changed" && e.to_status
              ? `${t("status")}: ${t(`status_${e.to_status}` as never)}`
              : e.event_type;
        const isLast = i === entries.length - 1;
        return (
          <li key={e.id} className="relative ps-7 pb-5 last:pb-0">
            <span
              className={`absolute inset-inline-start-0 top-1 h-3.5 w-3.5 border border-foreground ${
                isLast ? "bg-primary" : "bg-card"
              }`}
            />
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-display text-base leading-tight">{label}</p>
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
                  {format(new Date(e.created_at), "yyyy.MM.dd · HH:mm:ss")}
                </p>
              </div>
              <span className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-muted-foreground tabular-nums">
                #{String(entries.length - i).padStart(3, "0")}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/*  SKELETON + EMPTY                                                   */
/* ------------------------------------------------------------------ */

function SkeletonDispatch() {
  return (
    <div className="space-y-6 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 bg-background min-h-[calc(100vh-4rem)]">
      <div className="h-9 border border-foreground bg-card animate-pulse" />
      <div className="h-32 border border-foreground bg-card animate-pulse" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="h-40 border border-foreground bg-card animate-pulse" />
          <div className="h-56 border border-foreground bg-card animate-pulse" />
          <div className="h-40 border border-foreground bg-card animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-48 border border-foreground bg-card animate-pulse" />
          <div className="h-56 border border-foreground bg-card animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function EmptyDispatch({ isRtl, title }: { isRtl: boolean; title: string }) {
  return (
    <div className="space-y-6 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 bg-background min-h-[calc(100vh-4rem)]">
      <div className="border-2 border-dashed border-foreground/30 bg-card p-16 flex flex-col items-center text-center gap-3">
        <div className="h-14 w-14 border border-foreground bg-background flex items-center justify-center">
          <Inbox className="h-6 w-6 text-foreground/60" />
        </div>
        <h3 className="font-display text-3xl leading-tight">{title}</h3>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          — {isRtl ? "لا توجد بيانات في النظام" : "no signal in registry"} —
        </p>
      </div>
    </div>
  );
}
