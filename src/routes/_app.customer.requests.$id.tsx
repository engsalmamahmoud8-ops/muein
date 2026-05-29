import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { LoadingSkeleton, EmptyState } from "@/components/DashboardWidgets";
import { useI18n } from "@/lib/i18n";
import { fetchNotesWithAuthors } from "@/lib/notes";
import { resolveIcon } from "@/lib/icons";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  MapPin, Inbox, User, Phone, MessageSquare, History as HistoryIcon,
  ExternalLink, FileText, Send, Image as ImageIcon, CheckCircle2,
  ArrowLeft, Clock, Star, Check, X, Users, Banknote, Timer, XCircle,
  Hash,
} from "lucide-react";

export const Route = createFileRoute("/_app/customer/requests/$id")({
  component: Detail,
});

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
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

type EmployeeWithProfile = {
  id: string;
  user_id: string;
  avg_rating: number | null;
  total_reviews: number | null;
  profile?: { full_name?: string | null; phone?: string | null; avatar_url?: string | null } | null;
};

function Detail() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => { document.title = t("meta_request_detail_title"); }, [t]);

  const { data, isLoading } = useQuery({
    queryKey: ["req", id],
    queryFn: async () => {
      const [req, images, apps, history, notes, review] = await Promise.all([
        supabase.from("service_requests").select("*, category:service_categories(name_ar, name_en, name_tr, icon), employee:employees(id, user_id, avg_rating, total_reviews, profile:profiles!employees_user_id_profile_fkey(full_name, phone, avatar_url))").eq("id", id).single(),
        supabase.from("request_images").select("*").eq("request_id", id).order("created_at"),
        supabase.from("request_applications").select("*, employee:employees(id, user_id, avg_rating, total_reviews, profile:profiles!employees_user_id_profile_fkey(full_name))").eq("request_id", id),
        supabase.from("request_history").select("*").eq("request_id", id).order("created_at"),
        fetchNotesWithAuthors(id),
        supabase.from("reviews").select("*").eq("request_id", id).maybeSingle(),
      ]);
      return { req: req.data, images: images.data ?? [], apps: apps.data ?? [], history: history.data ?? [], notes, review: review.data };
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`req-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "request_applications", filter: `request_id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ["req", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "request_history", filter: `request_id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ["req", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests", filter: `id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ["req", id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  const images = useMemo(() => (data?.images ?? []), [data?.images]);

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (!data?.req) return <EmptyState icon={Inbox} title={t("no_data")} />;

  const req = data.req;
  const category = req.category as { name_ar?: string; name_en?: string; name_tr?: string; icon?: string | null } | null;
  const CategoryIcon = resolveIcon(category?.icon ?? null);
  const categoryName = category ? (lang === "en" ? category.name_en : lang === "tr" ? category.name_tr : category.name_ar) || category.name_ar || category.name_en : "";
  const assignedEmployee = req.employee as EmployeeWithProfile | null;
  const hasCoords = typeof req.lat === "number" && typeof req.lng === "number";
  const cancelable = ["pending", "applications_received"].includes(req.status);

  const accept = async (appId: string) => {
    const { error } = await supabase.from("request_applications").update({ status: "accepted" }).eq("id", appId);
    if (error) toast.error(error.message); else toast.success(t("request_accepted"));
    qc.invalidateQueries({ queryKey: ["req", id] });
  };
  const reject = async (appId: string) => {
    const { error } = await supabase.from("request_applications").update({ status: "rejected" }).eq("id", appId);
    if (error) toast.error(error.message); else toast.success(t("request_rejected"));
    qc.invalidateQueries({ queryKey: ["req", id] });
  };
  const addNote = async () => {
    if (!note.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("request_notes").insert({ request_id: id, author_id: user!.id, body: note });
    if (error) toast.error(error.message); else { toast.success(t("note_added")); setNote(""); qc.invalidateQueries({ queryKey: ["req", id] }); }
  };
  const submitReview = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("reviews").insert({
      request_id: id, customer_id: user!.id,
      employee_id: req.assigned_employee_id!, rating, comment,
    });
    if (error) toast.error(error.message); else { toast.success(t("thanks_for_rating")); qc.invalidateQueries({ queryKey: ["req", id] }); }
  };
  const cancelRequest = async () => {
    const { error } = await supabase.from("service_requests").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(t("status_cancelled")); qc.invalidateQueries({ queryKey: ["req", id] }); }
  };

  const mapsLink = hasCoords ? `https://www.google.com/maps/search/?api=1&query=${req.lat},${req.lng}` : null;
  const embedSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(req.lng as number) - 0.01}%2C${(req.lat as number) - 0.01}%2C${(req.lng as number) + 0.01}%2C${(req.lat as number) + 0.01}&layer=mapnik&marker=${req.lat}%2C${req.lng}`
    : null;

  const pendingApps = data.apps.filter(a => a.status === "pending");
  const dossierCode = String(id).replace(/-/g, "").slice(0, 8).toUpperCase();

  return (
    <div className="max-w-6xl mx-auto px-2 md:px-4 py-4 md:py-8 space-y-8">
      {/* === RIBBON ============================================ */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b-2 border-foreground animate-fade-in">
        <Link
          to="/customer/requests"
          className="label-mono inline-flex items-center gap-2 text-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("my_requests")}
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="mono-ticker text-muted-foreground inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {postedAgo(t as never, req.created_at)}
          </span>
          <span className="status-dot status-dot-live" aria-hidden />
          <StatusBadge status={req.status} />
        </div>
      </div>

      {/* === MASTHEAD ========================================== */}
      <header className="relative animate-fade-up">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-3">
            <span className="section-num inline-flex items-center gap-1.5">
              <Hash className="h-3 w-3" />DOSSIER
            </span>
            <span className="font-mono-ui text-sm tracking-[0.22em] text-foreground">
              {dossierCode}
            </span>
            <span className="font-mono-ui text-xs text-muted-foreground tracking-widest">
              · {format(new Date(req.created_at), "yyyy.MM.dd")}
            </span>
          </div>
          <div className="seg-group">
            {categoryName && (
              <span className="seg-chip inline-flex items-center gap-1.5" data-active="true">
                <CategoryIcon className="h-3 w-3" />{categoryName}
              </span>
            )}
            <span className="seg-chip inline-flex items-center gap-1.5">
              <Users className="h-3 w-3" />{data.apps.length}
            </span>
            {images.length > 0 && (
              <span className="seg-chip inline-flex items-center gap-1.5">
                <ImageIcon className="h-3 w-3" />{images.length}
              </span>
            )}
          </div>
        </div>

        <div className="rule-bold animate-draw-line" />

        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[0.92] tracking-tight mt-6 mb-4">
          {req.title}
        </h1>

        {req.address && (
          <p className="font-mono-ui text-xs tracking-widest uppercase text-muted-foreground inline-flex items-start gap-2 mt-3">
            <MapPin className="h-3 w-3 mt-0.5 text-foreground shrink-0" />
            <span>{req.address}{req.city ? ` · ${req.city}` : ""}</span>
          </p>
        )}

        <div className="rule-thin mt-6 opacity-40" />
      </header>

      {/* === BODY GRID ======================================== */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6 min-w-0">

          {/* 01 — BRIEF */}
          <section className="brutal-panel p-6 md:p-8 animate-fade-up delay-100">
            <div className="flex items-center gap-3 mb-5">
              <span className="section-num">01</span>
              <h2 className="label-mono">{t("description")}</h2>
              <span className="flex-1 rule-thin opacity-40" />
              <FileText className="h-4 w-4 text-foreground" />
            </div>
            <p className="font-display text-xl md:text-2xl leading-snug text-foreground whitespace-pre-wrap">
              {req.description}
            </p>
          </section>

          {/* 02 — EVIDENCE / image grid */}
          {images.length > 0 && (
            <section className="brutal-panel p-6 md:p-8 animate-fade-up delay-150">
              <div className="flex items-center gap-3 mb-5">
                <span className="section-num">02</span>
                <h2 className="label-mono">{t("request_images")}</h2>
                <span className="mono-ticker text-muted-foreground">[{images.length}]</span>
                <span className="flex-1 rule-thin opacity-40" />
                <ImageIcon className="h-4 w-4 text-foreground" />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setLightboxIdx(i)}
                    className="group relative block border border-foreground overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <img
                      src={img.url}
                      alt={`${t("photo_label")} ${i + 1}`}
                      className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <span className="pointer-events-none absolute inset-0 bg-foreground/0 group-hover:bg-foreground/15 transition-colors" />
                    <span className="absolute top-1 inset-inline-start-1 label-mono px-1 py-0.5 bg-foreground text-primary leading-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 03 — APPLICATIONS */}
          {!req.assigned_employee_id && (
            <section className="brutal-panel p-6 md:p-8 animate-fade-up delay-200">
              <div className="flex items-center gap-3 mb-5">
                <span className="section-num">03</span>
                <h2 className="label-mono">{t("applications")}</h2>
                <span className="mono-ticker text-muted-foreground">[{data.apps.length}]</span>
                <span className="flex-1 rule-thin opacity-40" />
                <Users className="h-4 w-4 text-foreground" />
              </div>

              {data.apps.length === 0 ? (
                <div className="border border-dashed border-foreground/40 p-8 text-center">
                  <p className="label-mono text-muted-foreground">{t("no_applications")}</p>
                </div>
              ) : (
                <div className="divide-y divide-foreground/15 -mx-6 md:-mx-8">
                  {data.apps.map((app, idx) => {
                    const emp = app.employee as EmployeeWithProfile | null;
                    const name = emp?.profile?.full_name ?? t("provider_fallback");
                    return (
                      <div key={app.id} className="px-6 md:px-8 py-5 grid gap-4 md:grid-cols-[auto_1fr_auto] items-start group">
                        {/* Index + avatar */}
                        <div className="flex items-center gap-3">
                          <span className="font-mono-ui text-xs text-muted-foreground tracking-widest">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className="relative">
                            <div className="h-12 w-12 bg-foreground text-primary flex items-center justify-center text-sm font-bold font-mono-ui">
                              {getInitials(name)}
                            </div>
                            <span className="absolute -bottom-1 -end-1 w-3 h-3 bg-primary border border-foreground" />
                          </div>
                        </div>

                        {/* Body */}
                        <div className="min-w-0 space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <p className="font-display text-lg md:text-xl leading-tight">{name}</p>
                            <span className="inline-flex items-center gap-1 font-mono-ui text-xs tracking-wide text-muted-foreground">
                              <Star className="h-3 w-3 fill-primary text-primary" />
                              <span className="text-foreground font-semibold">{emp?.avg_rating ?? 0}</span>
                              <span className="opacity-60">/ {emp?.total_reviews ?? 0}</span>
                            </span>
                          </div>
                          {app.message && (
                            <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap border-l-2 border-primary ps-3 italic">
                              "{app.message}"
                            </p>
                          )}
                          <div className="flex gap-4 mono-ticker text-muted-foreground flex-wrap pt-1">
                            {app.estimated_price != null && (
                              <span className="inline-flex items-center gap-1.5">
                                <Banknote className="h-3 w-3" />
                                <span className="text-foreground font-semibold">{app.estimated_price}</span>
                              </span>
                            )}
                            {app.estimated_arrival_minutes != null && (
                              <span className="inline-flex items-center gap-1.5">
                                <Timer className="h-3 w-3" />
                                <span className="text-foreground font-semibold">{app.estimated_arrival_minutes}</span>
                                <span className="opacity-70">{t("minutes_unit")}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {app.status === "pending" ? (
                          <div className="flex gap-2 items-center self-center">
                            <button
                              type="button"
                              onClick={() => accept(app.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-foreground text-primary border border-foreground label-mono hover:translate-y-[-2px] hover:shadow-[3px_3px_0_0_var(--color-primary)] transition-transform"
                            >
                              <Check className="h-3.5 w-3.5" />{t("accept")}
                            </button>
                            <button
                              type="button"
                              onClick={() => reject(app.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-background text-foreground border border-foreground label-mono hover:bg-foreground hover:text-background transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />{t("reject")}
                            </button>
                          </div>
                        ) : (
                          <div className="self-center">
                            <StatusBadge status={app.status === "accepted" ? "assigned" : "cancelled"} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* 04 — TIMELINE */}
          <section className="brutal-panel p-6 md:p-8 animate-fade-up delay-300">
            <div className="flex items-center gap-3 mb-5">
              <span className="section-num">04</span>
              <h2 className="label-mono">{t("history")}</h2>
              <span className="flex-1 rule-thin opacity-40" />
              <HistoryIcon className="h-4 w-4 text-foreground" />
            </div>
            <Timeline entries={data.history as never} />
          </section>

          {/* 05 — DISPATCH / notes */}
          <section className="brutal-panel p-6 md:p-8 animate-fade-up delay-400">
            <div className="flex items-center gap-3 mb-5">
              <span className="section-num">05</span>
              <h2 className="label-mono">{t("notes")}</h2>
              <span className="mono-ticker text-muted-foreground">[{data.notes.length}]</span>
              <span className="flex-1 rule-thin opacity-40" />
              <MessageSquare className="h-4 w-4 text-foreground" />
            </div>
            <div className="space-y-4">
              {data.notes.length === 0 && (
                <div className="border border-dashed border-foreground/40 p-6 text-center">
                  <p className="label-mono text-muted-foreground">{t("no_data")}</p>
                </div>
              )}
              {data.notes.map((n, i) => (
                <div key={n.id} className="grid grid-cols-[auto_1fr] gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-9 w-9 bg-background border border-foreground text-foreground flex items-center justify-center text-xs font-bold font-mono-ui">
                      {getInitials(n.author?.full_name)}
                    </div>
                    {i < data.notes.length - 1 && <span className="w-px flex-1 bg-foreground/20 mt-1" />}
                  </div>
                  <div className="min-w-0 pb-2">
                    <div className="flex items-baseline gap-2 mb-1">
                      <p className="label-mono text-foreground">{n.author?.full_name ?? "—"}</p>
                      <span className="mono-ticker text-muted-foreground/70">
                        {format(new Date(n.created_at), "HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap border-l-2 border-foreground/15 ps-3">
                      {n.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Compose row */}
            <div className="mt-6 pt-5 border-t-2 border-foreground">
              <label className="label-mono text-muted-foreground block mb-2">{t("add_note")}</label>
              <div className="flex gap-2 items-stretch">
                <Textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="…"
                  rows={2}
                  className="resize-none rounded-none border-foreground focus-visible:ring-0 focus-visible:border-primary"
                />
                <button
                  type="button"
                  onClick={addNote}
                  disabled={!note.trim()}
                  className="shrink-0 inline-flex items-center gap-2 px-4 bg-foreground text-primary border border-foreground label-mono hover:shadow-[4px_4px_0_0_var(--color-primary)] hover:translate-y-[-2px] transition-transform disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                >
                  <Send className="h-3.5 w-3.5" />{t("send")}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* === SIDEBAR =========================================== */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">

          {/* ASSIGNED — yellow with hard offset */}
          {req.assigned_employee_id ? (
            <div className="relative animate-fade-up delay-200">
              <div className="brutal-panel brutal-shadow-sm p-5 bg-primary text-foreground">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="label-mono">{t("assigned_employee")}</span>
                  <span className="ms-auto status-dot status-dot-live" aria-hidden />
                </div>
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14 rounded-none border-2 border-foreground shrink-0">
                    <AvatarImage
                      src={assignedEmployee?.profile?.avatar_url || undefined}
                      alt={assignedEmployee?.profile?.full_name ?? ""}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-none bg-foreground text-primary text-base font-bold font-mono-ui">
                      {getInitials(assignedEmployee?.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg leading-tight">
                      {assignedEmployee?.profile?.full_name ?? t("provider_fallback")}
                    </p>
                    <div className="flex items-center gap-1 mt-1 font-mono-ui text-xs">
                      <Star className="h-3 w-3 fill-foreground" />
                      <span className="font-semibold">{assignedEmployee?.avg_rating ?? 0}</span>
                      <span className="opacity-70">/ {assignedEmployee?.total_reviews ?? 0}</span>
                    </div>
                    {assignedEmployee?.profile?.phone && (
                      <a
                        href={`tel:${assignedEmployee.profile.phone}`}
                        className="mono-ticker mt-2 inline-flex items-center gap-1.5 hover:underline underline-offset-4"
                      >
                        <Phone className="h-3 w-3" />{assignedEmployee.profile.phone}
                      </a>
                    )}
                  </div>
                </div>
                {assignedEmployee?.profile?.phone && (
                  <div className="mt-4 grid grid-cols-2 gap-0 border border-foreground">
                    <a
                      href={`tel:${assignedEmployee.profile.phone}`}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 bg-foreground text-primary label-mono hover:bg-foreground/90 transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" />{t("phone")}
                    </a>
                    <a
                      href={`sms:${assignedEmployee.profile.phone}`}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 bg-primary text-foreground border-s border-foreground label-mono hover:bg-primary-glow transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />{t("send_message")}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="brutal-panel p-5 animate-fade-up delay-200">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4" />
                <span className="label-mono">{t("assigned_employee")}</span>
              </div>
              <div className="border border-dashed border-foreground/40 p-5 text-center">
                <div className="font-display text-4xl text-foreground/80">
                  {String(pendingApps.length).padStart(2, "0")}
                </div>
                <p className="label-mono text-muted-foreground mt-1">
                  {pendingApps.length > 0 ? t("applications") : t("no_applications")}
                </p>
              </div>
            </div>
          )}

          {/* QUICK FACTS — newspaper definition list */}
          <div className="brutal-panel p-5 animate-fade-up delay-300">
            <div className="flex items-center justify-between mb-4">
              <span className="label-mono">FACT SHEET</span>
              <span className="font-mono-ui text-[10px] tracking-widest text-muted-foreground">v.01</span>
            </div>
            <div className="rule-thin opacity-40 mb-3" />
            <dl className="space-y-3">
              <FactRow
                label={t("posted_label")}
                value={format(new Date(req.created_at), "yyyy.MM.dd")}
                sub={format(new Date(req.created_at), "HH:mm")}
              />
              {categoryName && (
                <FactRow label={t("category")} value={categoryName} icon={<CategoryIcon className="h-3 w-3" />} />
              )}
              <FactRow
                label={t("applications")}
                value={String(data.apps.length).padStart(2, "0")}
                accent
              />
              <FactRow
                label={t("request_images")}
                value={String(images.length).padStart(2, "0")}
              />
            </dl>
          </div>

          {/* MAP */}
          <div className="brutal-panel animate-fade-up delay-400 overflow-hidden">
            <div className="p-4 flex items-center justify-between gap-2 flex-wrap border-b border-foreground/20">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="label-mono">{t("customer_location")}</span>
              </div>
              {mapsLink && (
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 label-mono text-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  {t("open_in_maps")}
                </a>
              )}
            </div>
            {hasCoords && embedSrc ? (
              <div className="relative">
                <iframe
                  title="customer-location-map"
                  src={embedSrc}
                  className="w-full h-[220px] border-0 grayscale-[0.4] contrast-[1.05]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="absolute top-3 inset-inline-start-3 bg-foreground text-primary px-2 py-1 label-mono pointer-events-none">
                  ⊕ TARGET
                </div>
                <div className="px-4 py-2 mono-ticker text-muted-foreground bg-muted/40 border-t border-foreground/20 flex items-center justify-between">
                  <span>LAT {(req.lat as number).toFixed(4)}</span>
                  <span>LNG {(req.lng as number).toFixed(4)}</span>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <p className="label-mono text-muted-foreground">{t("no_location")}</p>
              </div>
            )}
          </div>

          {/* REVIEW */}
          {req.status === "completed" && !data.review && (
            <div className="brutal-panel brutal-shadow-sm p-5 animate-fade-up delay-500">
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="label-mono">{t("rate_service")}</span>
              </div>
              <div className="rule-thin opacity-40 mb-4" />
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    type="button"
                    aria-label={`${n}`}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${n <= rating ? "fill-primary text-foreground" : "text-foreground/25"}`}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>
              <div className="font-mono-ui text-xs text-muted-foreground tracking-widest mb-3">
                {String(rating).padStart(2, "0")} / 05
              </div>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={t("comment")}
                rows={3}
                className="resize-none rounded-none border-foreground focus-visible:ring-0 focus-visible:border-primary mb-3"
              />
              <button
                onClick={submitReview}
                className="btn-stamp"
              >
                {t("submit_review")}
              </button>
            </div>
          )}

          {/* CANCEL */}
          {cancelable && (
            <div className="brutal-panel p-5 animate-fade-up delay-500">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="label-mono text-destructive">{t("cancel")}</span>
              </div>
              <button
                onClick={cancelRequest}
                className="w-full py-3 border border-foreground bg-background text-foreground label-mono hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
              >
                {t("cancel")}
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* === FOOTER STAMP ====================================== */}
      <div className="pt-8 mt-8 border-t-2 border-foreground flex items-center justify-between flex-wrap gap-2">
        <span className="font-mono-ui text-xs tracking-[0.3em] text-muted-foreground uppercase">
          END OF DOSSIER · {dossierCode}
        </span>
        <span className="font-mono-ui text-xs tracking-widest text-muted-foreground">
          PRESS · {format(new Date(), "yyyy.MM.dd HH:mm")}
        </span>
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxIdx !== null} onOpenChange={open => !open && setLightboxIdx(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-foreground border-0 rounded-none">
          {lightboxIdx !== null && images[lightboxIdx] && (
            <div className="relative">
              <img
                src={images[lightboxIdx].url}
                alt={t("photo_label")}
                className="w-full max-h-[80vh] object-contain bg-foreground"
              />
              <div className="absolute top-3 inset-inline-start-3 bg-primary text-foreground px-2 py-1 label-mono">
                {String(lightboxIdx + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
              </div>
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightboxIdx(i)}
                      className={`h-1.5 transition-all ${i === lightboxIdx ? "bg-primary w-8" : "bg-background/40 w-3 hover:bg-background/70"}`}
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

function FactRow({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="label-mono text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd className="text-end">
        <span
          className={
            accent
              ? "font-display text-2xl leading-none text-foreground"
              : "font-mono-ui text-sm font-semibold tracking-wide text-foreground"
          }
        >
          {value}
        </span>
        {sub && (
          <span className="block mono-ticker text-muted-foreground/70 mt-0.5">{sub}</span>
        )}
      </dd>
    </div>
  );
}
