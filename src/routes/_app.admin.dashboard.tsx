import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import {
  Users, Briefcase, ClipboardList, CheckCircle2, Star, Tag,
  ArrowUpRight, Activity, MapPin, MessageSquareQuote,
} from "lucide-react";

export const Route = createFileRoute("/_app/admin/dashboard")({
  head: () => ({ meta: [{ title: "لوحة الإدارة — يمناك" }] }),
  component: Dash,
});

type ReqRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  city: string | null;
  category_id: string;
};
type ReviewRow = { id: string; rating: number; comment: string | null; created_at: string };
type CatRow = { id: string; name_ar: string; name_en: string; name_tr: string | null; icon: string | null };

const STATUS_BUCKETS = [
  { key: "pending",      group: "open",   labelEn: "PENDING",   labelAr: "قيد الانتظار" },
  { key: "applications_received", group: "open", labelEn: "BIDS IN", labelAr: "عروض" },
  { key: "assigned",     group: "active", labelEn: "ASSIGNED",  labelAr: "مُسنَد" },
  { key: "on_the_way",   group: "active", labelEn: "EN ROUTE",  labelAr: "في الطريق" },
  { key: "inspection_started", group: "active", labelEn: "INSPECT", labelAr: "كشف" },
  { key: "quotation_provided", group: "active", labelEn: "QUOTED", labelAr: "تسعير" },
  { key: "customer_approved_quotation", group: "active", labelEn: "APPROVED", labelAr: "موافقة" },
  { key: "work_in_progress", group: "active", labelEn: "WORKING", labelAr: "تنفيذ" },
  { key: "waiting_customer_response", group: "active", labelEn: "WAITING CUST.", labelAr: "بإنتظار" },
  { key: "completed",    group: "done",   labelEn: "COMPLETED", labelAr: "مكتمل" },
  { key: "cancelled",    group: "lost",   labelEn: "CANCELLED", labelAr: "مُلغى" },
  { key: "disputed",     group: "lost",   labelEn: "DISPUTED",  labelAr: "نزاع" },
];

function Dash() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const isRtl = lang === "ar";
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dash-broadcast"],
    queryFn: async () => {
      const sinceISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const prevSinceISO = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const [profiles, emps, reqsAll, reviewsAll, cats, recentReqs, recentRevs] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("employees").select("*", { count: "exact", head: true }),
        supabase.from("service_requests").select("id,title,status,created_at,completed_at,city,category_id"),
        supabase.from("reviews").select("id,rating,comment,created_at"),
        supabase.from("service_categories").select("id,name_ar,name_en,name_tr,icon"),
        supabase
          .from("service_requests")
          .select("id,title,status,created_at,completed_at,city,category_id")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("reviews")
          .select("id,rating,comment,created_at")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      const reqList = (reqsAll.data ?? []) as ReqRow[];
      const revList = (reviewsAll.data ?? []) as ReviewRow[];
      const last30Reqs = reqList.filter(r => r.created_at >= sinceISO).length;
      const prev30Reqs = reqList.filter(r => r.created_at >= prevSinceISO && r.created_at < sinceISO).length;
      const avg = revList.length ? revList.reduce((a, b) => a + b.rating, 0) / revList.length : 0;
      return {
        users: profiles.count ?? 0,
        emps: emps.count ?? 0,
        total: reqList.length,
        completed: reqList.filter(r => r.status === "completed").length,
        cancelled: reqList.filter(r => r.status === "cancelled" || r.status === "disputed").length,
        cats: cats.count ?? 0,
        avg,
        last30: last30Reqs,
        prev30: prev30Reqs,
        reqs: reqList,
        reviews: revList,
        recentReqs: (recentReqs.data ?? []) as ReqRow[],
        recentRevs: (recentRevs.data ?? []) as ReviewRow[],
        categories: (cats.data ?? []) as CatRow[],
      };
    },
  });

  // Derived analytics
  const analytics = useMemo(() => {
    if (!data) return null;
    const completionRate = data.total ? Math.round((data.completed / data.total) * 100) : 0;
    const trend30 = data.prev30 === 0
      ? (data.last30 > 0 ? 100 : 0)
      : Math.round(((data.last30 - data.prev30) / data.prev30) * 100);

    // 14-day bar series
    const days: { d: Date; n: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date();
      dt.setHours(0, 0, 0, 0);
      dt.setDate(dt.getDate() - i);
      days.push({ d: dt, n: 0 });
    }
    data.reqs.forEach(r => {
      const t0 = new Date(r.created_at).setHours(0, 0, 0, 0);
      const idx = days.findIndex(x => x.d.getTime() === t0);
      if (idx >= 0) days[idx].n += 1;
    });
    const peak = Math.max(1, ...days.map(d => d.n));

    // Status buckets
    const statusCounts: Record<string, number> = {};
    data.reqs.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });

    // Top categories by demand
    const catCount: Record<string, number> = {};
    data.reqs.forEach(r => { catCount[r.category_id] = (catCount[r.category_id] || 0) + 1; });
    const ranked = data.categories
      .map(c => ({ c, n: catCount[c.id] || 0 }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
    const topMax = Math.max(1, ranked[0]?.n ?? 1);

    // Rating distribution 1..5
    const ratingDist = [1, 2, 3, 4, 5].map(s => data.reviews.filter(r => r.rating === s).length);
    const ratingTotal = ratingDist.reduce((a, b) => a + b, 0);

    return { completionRate, trend30, days, peak, statusCounts, ranked, topMax, ratingDist, ratingTotal };
  }, [data]);

  if (isLoading || !data || !analytics) return <DashSkeleton />;

  const fmt = new Intl.NumberFormat(lang === "ar" ? "ar-EG" : lang === "tr" ? "tr-TR" : "en-US");

  return (
    <div className="space-y-6 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 bg-background min-h-[calc(100vh-4rem)]">
      {/* === MASTHEAD === */}
      <header className="grid grid-cols-12 gap-4 items-end pb-2 border-b-2 border-foreground">
        <div className="col-span-12 lg:col-span-8">
          <h1 className="font-display text-[clamp(2.5rem,6.5vw,5.25rem)] leading-[0.9] tracking-tight text-foreground">
            <span className="block">{t("welcome_back")}{name ? "،" : ""}</span>
            <span className="block italic font-light">
              {name || "admin"}<span className="text-primary">.</span>
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground leading-relaxed">
            {t("tagline")} <span className="font-mono-ui text-foreground/70">// {fmt.format(analytics.statusCounts["pending"] || 0)} {isRtl ? "طلب ينتظر التوزيع." : "requests await dispatch."}</span>
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 flex lg:justify-end gap-2">
          <KeyBox icon={Users} label={t("users")} value={fmt.format(data.users)} />
          <KeyBox icon={Briefcase} label={t("employees")} value={fmt.format(data.emps)} />
        </div>
      </header>

      {/* === HERO ROW === */}
      <section className="grid grid-cols-12 gap-4">
        {/* HERO METRIC */}
        <div className="col-span-12 lg:col-span-8 relative border border-foreground bg-card overflow-hidden group">
          <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
          <div className="relative p-6 md:p-8 grid grid-cols-2 gap-6">
            <div>
              <div className="label-mono text-muted-foreground flex items-center gap-2">
                <ClipboardList className="h-3 w-3" /> {t("total_requests")}
              </div>
              <div className="mt-3 font-display font-light text-[clamp(4rem,9vw,7.5rem)] leading-none tabular-nums">
                {fmt.format(data.total)}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 border text-[11px] font-mono-ui ${
                  analytics.trend30 >= 0 ? "border-foreground bg-primary text-foreground" : "border-destructive text-destructive"
                }`}>
                  <ArrowUpRight className={`h-3 w-3 ${analytics.trend30 < 0 ? "rotate-90" : ""}`} />
                  {analytics.trend30 >= 0 ? "+" : ""}{analytics.trend30}%
                </span>
                <span className="text-xs text-muted-foreground font-mono-ui uppercase tracking-wider">
                  30D · {fmt.format(data.last30)} {isRtl ? "جديد" : "new"}
                </span>
              </div>
            </div>

            {/* 14-day bars */}
            <div className="flex flex-col">
              <div className="label-mono text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-2"><Activity className="h-3 w-3" /> 14-DAY PULSE</span>
                <span className="font-mono-ui normal-case tracking-normal text-foreground">peak {analytics.peak}</span>
              </div>
              <div className="mt-4 flex-1 flex items-end gap-[3px] min-h-[140px]">
                {analytics.days.map((d, i) => {
                  const h = Math.max(4, (d.n / analytics.peak) * 100);
                  const today = i === analytics.days.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full transition-all duration-700 ${today ? "bg-primary" : "bg-foreground/85 group-hover:bg-foreground"}`}
                        style={{ height: `${h}%`, animation: `fade-up 0.6s ease-out ${i * 30}ms both` }}
                        title={`${d.d.toDateString()} · ${d.n}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-mono-ui text-muted-foreground">
                <span>{analytics.days[0].d.getDate()}/{analytics.days[0].d.getMonth() + 1}</span>
                <span>{isRtl ? "اليوم" : "today"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* YELLOW COMPLETION RATE PANEL */}
        <div className="col-span-12 lg:col-span-4 relative border border-foreground panel-yellow overflow-hidden">
          <div className="panel-stripes absolute inset-0" />
          <div className="panel-noise absolute inset-0" />
          <div className="relative p-6 h-full flex flex-col justify-between min-h-[280px]">
            <div className="flex items-start justify-between">
              <div className="label-mono">COMPLETION RATE</div>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="my-4">
              <div className="font-display font-light text-[clamp(5rem,12vw,9rem)] leading-[0.85] tabular-nums -tracking-[0.04em]">
                {analytics.completionRate}
                <span className="text-[0.4em] align-top ms-1">%</span>
              </div>
            </div>
            <div className="font-mono-ui text-[11px] uppercase tracking-[0.18em] space-y-1">
              <div className="flex justify-between border-t border-foreground/30 pt-2">
                <span>completed</span><span className="font-semibold">{fmt.format(data.completed)}</span>
              </div>
              <div className="flex justify-between">
                <span>cancelled / disputed</span><span className="font-semibold">{fmt.format(data.cancelled)}</span>
              </div>
              <div className="flex justify-between">
                <span>in pipeline</span><span className="font-semibold">{fmt.format(data.total - data.completed - data.cancelled)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === FUNNEL + ACTIVITY === */}
      <section className="grid grid-cols-12 gap-4">
        {/* STATUS FUNNEL */}
        <div className="col-span-12 lg:col-span-7 border border-foreground bg-card">
          <SectionHeader title={isRtl ? "خط أنابيب الطلبات" : "REQUEST PIPELINE"} subtitle={`${fmt.format(data.total)} · ${isRtl ? "بحسب الحالة" : "by status"}`} />
          <div className="p-5 space-y-3">
            {STATUS_BUCKETS.map((b) => {
              const n = analytics.statusCounts[b.key] || 0;
              const pct = data.total ? (n / data.total) * 100 : 0;
              const isDone = b.group === "done";
              const isLost = b.group === "lost";
              return (
                <div key={b.key} className="group/row grid grid-cols-12 items-center gap-3">
                  <div className="col-span-4 sm:col-span-3 label-mono text-foreground/80 truncate">
                    {isRtl ? b.labelAr : b.labelEn}
                  </div>
                  <div className="col-span-6 sm:col-span-7 relative h-4 bg-muted overflow-hidden">
                    <div
                      className={`absolute inset-y-0 start-0 transition-all duration-700 ${
                        isDone ? "bg-primary" : isLost ? "bg-destructive/70" : "bg-foreground"
                      }`}
                      style={{ width: `${Math.max(pct, n > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <div className="col-span-2 font-mono-display text-sm text-end tabular-nums">
                    {fmt.format(n)}
                    <span className="ms-1 text-[10px] text-muted-foreground">{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RATING + AVG */}
        <div className="col-span-12 lg:col-span-5 border border-foreground bg-card flex flex-col">
          <SectionHeader title={isRtl ? "تقييم الخدمة" : "SERVICE RATING"} subtitle={`${data.reviews.length} ${isRtl ? "تقييم" : "reviews"}`} />
          <div className="p-5 flex-1 flex flex-col gap-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="label-mono text-muted-foreground">{t("avg_rating")}</div>
                <div className="font-display text-7xl font-light leading-none mt-2 tabular-nums">
                  {data.avg.toFixed(1)}
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`h-5 w-5 ${i <= Math.round(data.avg) ? "fill-primary text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
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
                      <div className="absolute inset-y-0 start-0 bg-foreground" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-end tabular-nums">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* === LEDGER + CATEGORIES === */}
      <section className="grid grid-cols-12 gap-4">
        {/* LEDGER */}
        <div className="col-span-12 lg:col-span-7 border border-foreground bg-card">
          <SectionHeader title={isRtl ? "السجل الحي" : "LIVE LEDGER"} subtitle={isRtl ? "آخر النشاطات" : "latest activity"} />
          <ol className="divide-y divide-border">
            {mergeActivity(data.recentReqs, data.recentRevs).slice(0, 9).map((item, i) => (
              <li key={item.k} className="flex gap-4 px-5 py-3 group/item hover:bg-muted/40 transition-colors">
                <div className="font-mono-ui text-[10px] text-muted-foreground tabular-nums pt-1 w-8 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="shrink-0 mt-1">
                  {item.kind === "review" ? (
                    <div className="h-7 w-7 border border-foreground bg-primary flex items-center justify-center">
                      <MessageSquareQuote className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <div className="h-7 w-7 border border-foreground bg-foreground text-background flex items-center justify-center">
                      <ClipboardList className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {item.kind === "review" ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base leading-tight">{item.r.rating.toFixed(1)}★ {isRtl ? "تقييم جديد" : "new review"}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5 italic">
                        {item.r.comment ? `"${item.r.comment}"` : (isRtl ? "بدون تعليق" : "no comment")}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-base leading-tight truncate">{item.q.title}</span>
                        <StatusPill status={item.q.status} isRtl={isRtl} />
                      </div>
                      <div className="text-xs text-muted-foreground font-mono-ui mt-0.5 flex items-center gap-2">
                        {item.q.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{item.q.city}</span>}
                        <span>· {timeAgo(item.q.created_at, isRtl)}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-[10px] font-mono-ui text-muted-foreground tabular-nums pt-1 hidden sm:block">
                  {timeAgo(item.kind === "review" ? item.r.created_at : item.q.created_at, isRtl)}
                </div>
              </li>
            ))}
            {data.recentReqs.length === 0 && data.recentRevs.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground font-mono-ui">— {isRtl ? "لا توجد بيانات بعد" : "no signal yet"} —</li>
            )}
          </ol>
        </div>

        {/* TOP CATEGORIES */}
        <div className="col-span-12 lg:col-span-5 border border-foreground bg-card">
          <SectionHeader title={isRtl ? "الفئات الأكثر طلباً" : "TOP CATEGORIES"} subtitle={isRtl ? "حسب الحجم" : "by volume"} />
          <ol className="p-5 space-y-4">
            {analytics.ranked.map((row, i) => {
              const nm = lang === "ar" ? row.c.name_ar : lang === "tr" ? (row.c.name_tr || row.c.name_en) : row.c.name_en;
              const pct = (row.n / analytics.topMax) * 100;
              return (
                <li key={row.c.id} className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-1 font-display text-3xl font-light leading-none text-muted-foreground tabular-nums">
                    {i + 1}
                  </div>
                  <div className="col-span-9">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-display text-lg leading-tight truncate">{nm}</span>
                      <span className="font-mono-ui text-xs text-muted-foreground tabular-nums">{fmt.format(row.n)}</span>
                    </div>
                    <div className="mt-2 h-[3px] bg-muted overflow-hidden">
                      <div className="h-full bg-foreground" style={{ width: `${pct}%`, animation: "draw-line 0.9s cubic-bezier(.7,.1,.2,1) both" }} />
                    </div>
                  </div>
                  <div className="col-span-2 text-end">
                    <span className="inline-block px-2 py-0.5 border border-foreground/60 font-mono-ui text-[10px]">
                      {Math.round(pct)}%
                    </span>
                  </div>
                </li>
              );
            })}
            {analytics.ranked.length === 0 && (
              <li className="text-center text-sm text-muted-foreground font-mono-ui py-6">— {isRtl ? "لا توجد فئات بعد" : "no categories"} —</li>
            )}
          </ol>
        </div>
      </section>

    </div>
  );
}

/* ---------- subcomponents ---------- */

function KeyBox({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline justify-between px-5 pt-4 pb-3 border-b border-foreground/15">
      <h2 className="label-mono text-foreground tracking-[0.24em]">{title}</h2>
      {subtitle && <span className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{subtitle}</span>}
    </div>
  );
}

function StatusPill({ status, isRtl }: { status: string; isRtl: boolean }) {
  const bucket = STATUS_BUCKETS.find(b => b.key === status);
  const label = bucket ? (isRtl ? bucket.labelAr : bucket.labelEn) : status;
  const tone = bucket?.group === "done" ? "bg-primary text-foreground" :
               bucket?.group === "lost" ? "border border-destructive text-destructive" :
               "border border-foreground text-foreground";
  return <span className={`px-1.5 py-0.5 font-mono-ui text-[10px] tracking-[0.16em] uppercase ${tone}`}>{label}</span>;
}

/* ---------- helpers ---------- */

type LedgerItem =
  | { k: string; kind: "request"; q: ReqRow; ts: number }
  | { k: string; kind: "review"; r: ReviewRow; ts: number };

function mergeActivity(reqs: ReqRow[], revs: ReviewRow[]): LedgerItem[] {
  const items: LedgerItem[] = [
    ...reqs.map<LedgerItem>(q => ({ k: "q-" + q.id, kind: "request", q, ts: new Date(q.created_at).getTime() })),
    ...revs.map<LedgerItem>(r => ({ k: "r-" + r.id, kind: "review", r, ts: new Date(r.created_at).getTime() })),
  ];
  return items.sort((a, b) => b.ts - a.ts);
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
    <div className="space-y-4 animate-pulse">
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
