import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Briefcase,
  CheckCircle2,
  Star,
  MapPin,
  Activity,
  ArrowUpRight,
  ClipboardList,
  MessageSquareQuote,
  Inbox,
  Navigation,
  Calendar,
} from "lucide-react";

export const Route = createFileRoute("/_app/employee/dashboard")({
  head: () => ({ meta: [{ title: "لوحة مقدم الخدمة — يمناك" }] }),
  component: Dash,
});

type Assignment = {
  id: string;
  title: string;
  city: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  category: { name_ar: string; name_en: string; name_tr: string | null } | null;
};
type ReviewRow = { id: string; rating: number; comment: string | null; created_at: string };
type EmpRow = {
  id: string;
  is_available: boolean | null;
  avg_rating: number | string | null;
  total_reviews: number | null;
};

const STATUS_BUCKETS = [
  { key: "assigned", group: "active", labelEn: "ASSIGNED", labelAr: "مُسنَد" },
  { key: "on_the_way", group: "active", labelEn: "EN ROUTE", labelAr: "في الطريق" },
  { key: "inspection_started", group: "active", labelEn: "INSPECT", labelAr: "كشف" },
  { key: "quotation_provided", group: "active", labelEn: "QUOTED", labelAr: "تسعير" },
  { key: "customer_approved_quotation", group: "active", labelEn: "APPROVED", labelAr: "موافقة" },
  { key: "work_in_progress", group: "active", labelEn: "WORKING", labelAr: "تنفيذ" },
  { key: "waiting_customer_response", group: "active", labelEn: "WAIT CUST.", labelAr: "بإنتظار" },
  { key: "completed", group: "done", labelEn: "COMPLETED", labelAr: "مكتمل" },
  { key: "cancelled", group: "lost", labelEn: "CANCELLED", labelAr: "مُلغى" },
  { key: "disputed", group: "lost", labelEn: "DISPUTED", labelAr: "نزاع" },
];

function Dash() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isRtl = lang === "ar";
  const fmt = useMemo(
    () => new Intl.NumberFormat(lang === "ar" ? "ar-EG" : lang === "tr" ? "tr-TR" : "en-US"),
    [lang],
  );
  const name =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["emp-dash-broadcast"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: emp } = await supabase
        .from("employees")
        .select("id, is_available, avg_rating, total_reviews")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!emp) return null;
      const empRow = emp as EmpRow;

      const [{ data: assigned }, { data: reviews }] = await Promise.all([
        supabase
          .from("service_requests")
          .select(
            "id, title, city, status, created_at, completed_at, category:service_categories(name_ar, name_en, name_tr)",
          )
          .eq("assigned_employee_id", empRow.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("reviews")
          .select("id, rating, comment, created_at")
          .eq("employee_id", empRow.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      return {
        emp: empRow,
        assignments: (assigned ?? []) as Assignment[],
        reviews: (reviews ?? []) as ReviewRow[],
      };
    },
  });

  const toggleAvail = async (next: boolean) => {
    if (!data?.emp) return;
    const { error } = await supabase
      .from("employees")
      .update({ is_available: next })
      .eq("id", data.emp.id);
    if (error) toast.error(error.message);
    else {
      toast.success(next ? (isRtl ? "متاح للعمل" : "On duty") : isRtl ? "خارج الخدمة" : "Off duty");
      qc.invalidateQueries({ queryKey: ["emp-dash-broadcast"] });
    }
  };

  const analytics = useMemo(() => {
    if (!data) return null;
    const list = data.assignments;
    const active = list.filter((r) => !["completed", "cancelled", "disputed"].includes(r.status));
    const completed = list.filter((r) => r.status === "completed");
    const total = list.length;
    const completionRate = total ? Math.round((completed.length / total) * 100) : 0;

    // Last 30 vs prev 30
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const last30 = list.filter((r) => now - new Date(r.created_at).getTime() <= 30 * day).length;
    const prev30 = list.filter((r) => {
      const t = now - new Date(r.created_at).getTime();
      return t > 30 * day && t <= 60 * day;
    }).length;
    const trend =
      prev30 === 0 ? (last30 > 0 ? 100 : 0) : Math.round(((last30 - prev30) / prev30) * 100);

    // 14-day bar series
    const days: { d: Date; n: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date();
      dt.setHours(0, 0, 0, 0);
      dt.setDate(dt.getDate() - i);
      days.push({ d: dt, n: 0 });
    }
    list.forEach((r) => {
      const t0 = new Date(r.created_at).setHours(0, 0, 0, 0);
      const idx = days.findIndex((x) => x.d.getTime() === t0);
      if (idx >= 0) days[idx].n += 1;
    });
    const peak = Math.max(1, ...days.map((d) => d.n));

    // Status counts (among my assignments)
    const statusCounts: Record<string, number> = {};
    list.forEach((r) => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    // Rating distribution
    const ratingDist = [1, 2, 3, 4, 5].map(
      (s) => data.reviews.filter((r) => r.rating === s).length,
    );
    const ratingTotal = ratingDist.reduce((a, b) => a + b, 0);
    const fiveStarPct = ratingTotal ? Math.round((ratingDist[4] / ratingTotal) * 100) : 0;

    const avg = Number(data.emp.avg_rating ?? 0) || 0;

    return {
      active,
      completed,
      total,
      completionRate,
      last30,
      trend,
      days,
      peak,
      statusCounts,
      ratingDist,
      ratingTotal,
      fiveStarPct,
      avg,
    };
  }, [data]);

  if (isLoading || !data || !analytics) return <DashSkeleton />;

  const onDuty = Boolean(data.emp.is_available);

  const categoryName = (c: Assignment["category"]) => {
    if (!c) return null;
    return (
      (lang === "en" ? c.name_en : lang === "tr" ? (c.name_tr ?? c.name_ar) : c.name_ar) ||
      c.name_ar
    );
  };

  return (
    <div className="space-y-6 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 bg-background min-h-[calc(100vh-4rem)]">
      {/* === MASTHEAD === */}
      <header className="grid grid-cols-12 gap-4 items-end pb-2 border-b-2 border-foreground">
        <div className="col-span-12 lg:col-span-8">
          <h1 className="font-display text-[clamp(2.5rem,6.5vw,5.25rem)] leading-[0.9] tracking-tight text-foreground">
            <span className="block">
              {t("welcome_back")}
              {name ? "،" : ""}
            </span>
            <span className="block italic font-light">
              {name || "operative"}
              <span className="text-primary">.</span>
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground leading-relaxed">
            {t("tagline")}{" "}
            <span className="font-mono-ui text-foreground/70">
              // {fmt.format(analytics.active.length)} {isRtl ? "مهمة نشطة." : "active on roster."}
            </span>
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 flex lg:justify-end gap-2">
          <KeyBox
            icon={Briefcase}
            label={t("my_assignments")}
            value={fmt.format(data.assignments.length)}
          />
          <KeyBox
            icon={CheckCircle2}
            label={t("completed_requests")}
            value={fmt.format(analytics.completed.length)}
          />
        </div>
      </header>

      {/* === HERO ROW: ACTIVE METRIC + AVAILABILITY === */}
      <section className="grid grid-cols-12 gap-4">
        {/* HERO METRIC */}
        <div className="col-span-12 lg:col-span-8 relative border border-foreground bg-card overflow-hidden group">
          <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
          <div className="relative p-6 md:p-8 grid grid-cols-2 gap-6">
            <div>
              <div className="label-mono text-muted-foreground flex items-center gap-2">
                <Activity className="h-3 w-3" /> {t("active_requests")}
              </div>
              <div className="mt-3 font-display font-light text-[clamp(4rem,9vw,7.5rem)] leading-none tabular-nums">
                {fmt.format(analytics.active.length)}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 border text-[11px] font-mono-ui ${
                    analytics.trend >= 0
                      ? "border-foreground bg-primary text-foreground"
                      : "border-destructive text-destructive"
                  }`}
                >
                  <ArrowUpRight className={`h-3 w-3 ${analytics.trend < 0 ? "rotate-90" : ""}`} />
                  {analytics.trend >= 0 ? "+" : ""}
                  {analytics.trend}%
                </span>
                <span className="text-xs text-muted-foreground font-mono-ui uppercase tracking-wider">
                  30D · {fmt.format(analytics.last30)} {isRtl ? "جديد" : "new"}
                </span>
              </div>
            </div>

            {/* 14-day bars */}
            <div className="flex flex-col">
              <div className="label-mono text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="h-3 w-3" /> 14-DAY PULSE
                </span>
                <span className="font-mono-ui normal-case tracking-normal text-foreground">
                  peak {analytics.peak}
                </span>
              </div>
              <div className="mt-4 flex-1 flex items-end gap-[3px] min-h-[140px]">
                {analytics.days.map((d, i) => {
                  const h = Math.max(4, (d.n / analytics.peak) * 100);
                  const today = i === analytics.days.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full transition-all duration-700 ${today ? "bg-primary" : "bg-foreground/85 group-hover:bg-foreground"}`}
                        style={{
                          height: `${h}%`,
                          animation: `fade-up 0.6s ease-out ${i * 30}ms both`,
                        }}
                        title={`${d.d.toDateString()} · ${d.n}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-mono-ui text-muted-foreground">
                <span>
                  {analytics.days[0].d.getDate()}/{analytics.days[0].d.getMonth() + 1}
                </span>
                <span>{isRtl ? "اليوم" : "today"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* YELLOW DUTY PANEL */}
        <div className="col-span-12 lg:col-span-4 relative border border-foreground panel-yellow overflow-hidden">
          <div className="panel-stripes absolute inset-0" />
          <div className="panel-noise absolute inset-0" />
          <div className="relative p-6 h-full flex flex-col justify-between min-h-[280px]">
            <div className="flex items-start justify-between">
              <div className="label-mono">{t("availability")}</div>
              <span
                className={`text-[10px] font-mono-ui tracking-[0.22em] font-semibold ${onDuty ? "" : "opacity-60"}`}
              >
                {onDuty ? "● LIVE" : "○ STANDBY"}
              </span>
            </div>
            <div className="my-4">
              <div className="font-display font-light text-[clamp(3rem,7vw,5rem)] leading-[0.9] -tracking-[0.04em]">
                {onDuty ? (isRtl ? "متاح" : "ON DUTY") : isRtl ? "خارج الخدمة" : "OFF DUTY"}
              </div>
              <p className="mt-2 text-[11px] font-mono-ui uppercase tracking-[0.18em] opacity-70 max-w-[18ch]">
                {onDuty
                  ? isRtl
                    ? "ستظهر في نتائج العملاء القريبين."
                    : "Visible to nearby customers."
                  : isRtl
                    ? "لن تتلقى توزيع جديد."
                    : "Hidden from dispatch."}
              </p>
            </div>
            <label className="flip-shell w-full cursor-pointer select-none">
              <input
                className="flip-input"
                type="checkbox"
                checked={onDuty}
                onChange={(e) => toggleAvail(e.target.checked)}
                aria-label={onDuty ? "GO OFF DUTY" : "GO ON DUTY"}
              />
              <span className="flip-track" aria-hidden>
                <span className="flip-knob" />
              </span>
              <span className="label-mono flex-1 text-start">
                {onDuty
                  ? isRtl
                    ? "إيقاف البث"
                    : "GO OFF DUTY"
                  : isRtl
                    ? "بدء البث"
                    : "GO ON DUTY"}
              </span>
              <span className="flip-state">{onDuty ? "ON" : "OFF"}</span>
            </label>
          </div>
        </div>
      </section>

      {/* === TICKER === */}
      <div className="border-y border-foreground py-3 overflow-hidden bg-card">
        <div className="marquee-row gap-12 font-mono-ui text-xs uppercase tracking-[0.2em]">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex items-center gap-12 px-6 shrink-0">
              <Tick label={t("my_assignments")} value={fmt.format(data.assignments.length)} />
              <Tick label={t("active_requests")} value={fmt.format(analytics.active.length)} />
              <Tick
                label={t("completed_requests")}
                value={fmt.format(analytics.completed.length)}
                accent
              />
              <Tick label={t("avg_rating")} value={analytics.avg.toFixed(2)} />
              <Tick
                label={isRtl ? "تقييمات" : "Reviews"}
                value={fmt.format(data.emp.total_reviews ?? 0)}
              />
              <Tick label={isRtl ? "إتمام" : "Completion"} value={`${analytics.completionRate}%`} />
              <Tick
                label={isRtl ? "آخر ٣٠ يوم" : "Last 30d"}
                value={"+" + fmt.format(analytics.last30)}
                accent
              />
            </div>
          ))}
        </div>
      </div>

      {/* === ROSTER + RATING === */}
      <section className="grid grid-cols-12 gap-4">
        {/* ROSTER */}
        <div className="col-span-12 lg:col-span-7 border border-foreground bg-card">
          <SectionHeader
            title={isRtl ? "كشف المهام" : "MISSION ROSTER"}
            subtitle={`${fmt.format(data.assignments.length)} · ${isRtl ? "إجمالي" : "total"}`}
            actionLabel={isRtl ? "كل الطلبات →" : "ALL →"}
            actionTo="/employee/requests/nearby"
          />
          <ol className="divide-y divide-border">
            {data.assignments.slice(0, 8).map((q, i) => {
              const bucket = STATUS_BUCKETS.find((b) => b.key === q.status);
              const cat = categoryName(q.category);
              return (
                <li key={q.id}>
                  <Link
                    to={`/employee/requests/${q.id}`}
                    className="flex gap-4 px-5 py-3 group/item hover:bg-muted/40 transition-colors"
                  >
                    <div className="font-mono-ui text-[10px] text-muted-foreground tabular-nums pt-1 w-8 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="shrink-0 mt-1">
                      <div
                        className={`h-7 w-7 border border-foreground flex items-center justify-center ${
                          bucket?.group === "done"
                            ? "bg-primary"
                            : bucket?.group === "lost"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-foreground text-background"
                        }`}
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-base leading-tight truncate">
                          {q.title}
                        </span>
                        <StatusPill status={q.status} isRtl={isRtl} />
                      </div>
                      <div className="text-xs text-muted-foreground font-mono-ui mt-0.5 flex items-center gap-2 flex-wrap">
                        {cat && <span className="text-foreground/70">{cat}</span>}
                        {q.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {q.city}
                          </span>
                        )}
                        <span>· {timeAgo(q.created_at, isRtl)}</span>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono-ui text-muted-foreground tabular-nums pt-1 hidden sm:block">
                      {format(new Date(q.created_at), "MM/dd")}
                    </div>
                  </Link>
                </li>
              );
            })}
            {data.assignments.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground font-mono-ui flex flex-col items-center gap-3">
                <Inbox className="h-8 w-8 text-foreground/30" />—{" "}
                {isRtl ? "لا توجد مهام بعد" : "no missions yet"} —
                <Link
                  to="/employee/requests/nearby"
                  className="btn-stamp mt-2 px-6 py-3 w-auto inline-flex"
                >
                  <Navigation className="h-3.5 w-3.5 me-2" />
                  {t("nearby_requests")}
                </Link>
              </li>
            )}
          </ol>
        </div>

        {/* RATING + RECENT REVIEW */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
          <div className="border border-foreground bg-card flex flex-col">
            <SectionHeader
              title={isRtl ? "السمعة" : "REPUTATION"}
              subtitle={`${fmt.format(data.emp.total_reviews ?? 0)} ${isRtl ? "تقييم" : "reviews"}`}
            />
            <div className="p-5 flex-1 flex flex-col gap-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="label-mono text-muted-foreground">{t("avg_rating")}</div>
                  <div className="font-display text-7xl font-light leading-none mt-2 tabular-nums">
                    {analytics.avg.toFixed(1)}
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i <= Math.round(analytics.avg) ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((s) => {
                  const n = analytics.ratingDist[s - 1];
                  const pct = analytics.ratingTotal ? (n / analytics.ratingTotal) * 100 : 0;
                  return (
                    <div key={s} className="flex items-center gap-2 text-xs font-mono-ui">
                      <span className="w-4 tabular-nums">{s}</span>
                      <Star className="h-3 w-3 fill-foreground text-foreground" />
                      <div className="flex-1 h-2 bg-muted relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 start-0 bg-foreground"
                          style={{
                            width: `${pct}%`,
                            animation: "draw-line 0.9s cubic-bezier(.7,.1,.2,1) both",
                          }}
                        />
                      </div>
                      <span className="w-8 text-end tabular-nums">{n}</span>
                    </div>
                  );
                })}
              </div>
              <Link
                to="/employee/reviews"
                className="mt-1 inline-flex items-center justify-between border border-foreground px-3 py-2 font-mono-ui text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-primary transition-colors"
              >
                <span>{isRtl ? "كل التقييمات" : "ALL REVIEWS"}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Latest review pull-quote */}
          {data.reviews[0] && (
            <div className="relative border border-foreground bg-card p-5 brutal-shadow-sm">
              <div className="label-mono text-muted-foreground flex items-center gap-2 mb-3">
                <MessageSquareQuote className="h-3 w-3" /> {isRtl ? "آخر تعليق" : "LATEST"}
              </div>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${i <= data.reviews[0].rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <blockquote className="font-display text-lg leading-snug italic text-foreground/90 before:content-['“'] before:text-2xl before:me-1 after:content-['”'] after:text-2xl after:ms-1">
                {data.reviews[0].comment ?? (isRtl ? "بدون تعليق" : "No comment")}
              </blockquote>
              <div className="mt-3 text-[10px] font-mono-ui uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3" /> {timeAgo(data.reviews[0].created_at, isRtl)}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* === STATUS FUNNEL (MY) === */}
      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-12 border border-foreground bg-card">
          <SectionHeader
            title={isRtl ? "تدفّق مهامي" : "MY PIPELINE"}
            subtitle={`${fmt.format(data.assignments.length)} · ${isRtl ? "بحسب الحالة" : "by status"}`}
          />
          <div className="p-5 grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {STATUS_BUCKETS.map((b) => {
              const n = analytics.statusCounts[b.key] || 0;
              const pct = data.assignments.length ? (n / data.assignments.length) * 100 : 0;
              const isDone = b.group === "done";
              const isLost = b.group === "lost";
              return (
                <div key={b.key} className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-5 label-mono text-foreground/80 truncate">
                    {isRtl ? b.labelAr : b.labelEn}
                  </div>
                  <div className="col-span-5 relative h-4 bg-muted overflow-hidden">
                    <div
                      className={`absolute inset-y-0 start-0 transition-all duration-700 ${
                        isDone ? "bg-primary" : isLost ? "bg-destructive/70" : "bg-foreground"
                      }`}
                      style={{ width: `${Math.max(pct, n > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <div className="col-span-2 font-mono-display text-sm text-end tabular-nums">
                    {fmt.format(n)}
                    <span className="ms-1 text-[10px] text-muted-foreground">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* === COLOPHON === */}
      <footer className="border-t border-foreground/30 pt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-ui uppercase tracking-[0.22em] text-muted-foreground">
        <span>— END OF BRIEF —</span>
        <span>YMNAK / FIELD / OPERATIVE · {fmt.format(analytics.fiveStarPct)}% 5★</span>
      </footer>
    </div>
  );
}

/* ---------- subcomponents ---------- */

function KeyBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
}) {
  return (
    <div className="flex-1 lg:flex-none lg:min-w-[120px] border border-foreground bg-card px-3 py-2 flex items-center gap-3">
      <div className="h-8 w-8 bg-foreground text-background flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="label-mono text-muted-foreground truncate">{label}</div>
        <div className="font-display text-xl leading-none tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  actionLabel,
  actionTo,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-3 border-b border-foreground/15">
      <div className="flex items-baseline gap-3">
        <h2 className="label-mono text-foreground tracking-[0.24em]">{title}</h2>
        {subtitle && (
          <span className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-foreground hover:text-primary transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

function Tick({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-mono-display tabular-nums px-1.5 py-0.5 ${accent ? "bg-primary text-foreground" : "text-foreground"}`}
      >
        {value}
      </span>
      <span className="text-muted-foreground/50">/</span>
    </div>
  );
}

function StatusPill({ status, isRtl }: { status: string; isRtl: boolean }) {
  const bucket = STATUS_BUCKETS.find((b) => b.key === status);
  const label = bucket ? (isRtl ? bucket.labelAr : bucket.labelEn) : status;
  const tone =
    bucket?.group === "done"
      ? "bg-primary text-foreground"
      : bucket?.group === "lost"
        ? "border border-destructive text-destructive"
        : "border border-foreground text-foreground";
  return (
    <span className={`px-1.5 py-0.5 font-mono-ui text-[10px] tracking-[0.16em] uppercase ${tone}`}>
      {label}
    </span>
  );
}

function timeAgo(iso: string, isRtl: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return isRtl ? "الآن" : "now";
  if (m < 60) return isRtl ? `قبل ${m}د` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return isRtl ? `قبل ${h}س` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return isRtl ? `قبل ${d}ي` : `${d}d ago`;
}

function DashSkeleton() {
  return (
    <div className="space-y-4 animate-pulse -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
      <div className="h-9 bg-muted" />
      <div className="h-24 bg-muted" />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 h-72 bg-muted" />
        <div className="col-span-12 lg:col-span-4 h-72 bg-primary/40" />
      </div>
      <div className="h-10 bg-muted" />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7 h-96 bg-muted" />
        <div className="col-span-12 lg:col-span-5 h-96 bg-muted" />
      </div>
    </div>
  );
}
