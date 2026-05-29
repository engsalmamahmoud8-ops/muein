import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import {
  Star,
  MessageSquareQuote,
  ClipboardList,
  ArrowUpRight,
  Inbox,
  TrendingUp,
  User,
} from "lucide-react";

export const Route = createFileRoute("/_app/employee/reviews")({
  component: EmployeeReviews,
});

type RawReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer_id: string;
  request_id: string | null;
};

type Review = RawReview & {
  customer_name: string | null;
  request_title: string | null;
};

const FILTERS: { key: "all" | "5" | "4" | "3" | "low" | "with_comment"; en: string; ar: string }[] =
  [
    { key: "all", en: "ALL", ar: "الكل" },
    { key: "5", en: "5★", ar: "٥" },
    { key: "4", en: "4★", ar: "٤" },
    { key: "3", en: "3★", ar: "٣" },
    { key: "low", en: "≤ 2★", ar: "منخفض" },
    { key: "with_comment", en: "WITH NOTE", ar: "مع تعليق" },
  ];

function EmployeeReviews() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const isRtl = lang === "ar";
  const fmt = useMemo(
    () => new Intl.NumberFormat(lang === "ar" ? "ar-EG" : lang === "tr" ? "tr-TR" : "en-US"),
    [lang],
  );

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ avg: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: emp } = await supabase
        .from("employees")
        .select("id, avg_rating, total_reviews")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!emp) {
        if (!cancelled) setLoading(false);
        return;
      }
      const empAvg = Number(emp.avg_rating ?? 0) || 0;
      const empTotal = emp.total_reviews ?? 0;

      const { data: raw } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, customer_id, request_id")
        .eq("employee_id", emp.id)
        .order("created_at", { ascending: false })
        .limit(200);

      const rawRows = (raw ?? []) as RawReview[];
      const customerIds = Array.from(new Set(rawRows.map((r) => r.customer_id))).filter(Boolean);
      const requestIds = Array.from(
        new Set(rawRows.map((r) => r.request_id).filter((x): x is string => !!x)),
      );

      const [{ data: customers }, { data: requests }] = await Promise.all([
        customerIds.length
          ? supabase.from("profiles").select("id, full_name").in("id", customerIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
        requestIds.length
          ? supabase.from("service_requests").select("id, title").in("id", requestIds)
          : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      ]);

      const cMap = new Map((customers ?? []).map((c) => [c.id, c.full_name]));
      const rMap = new Map((requests ?? []).map((r) => [r.id, r.title]));

      const enriched: Review[] = rawRows.map((r) => ({
        ...r,
        customer_name: cMap.get(r.customer_id) ?? null,
        request_title: r.request_id ? (rMap.get(r.request_id) ?? null) : null,
      }));

      if (!cancelled) {
        setReviews(enriched);
        setStats({ avg: empAvg, total: empTotal });
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const analytics = useMemo(() => {
    const total = reviews.length;
    const ratingDist = [1, 2, 3, 4, 5].map((s) => reviews.filter((r) => r.rating === s).length);
    const ratingTotal = ratingDist.reduce((a, b) => a + b, 0);
    const fivePct = ratingTotal ? Math.round((ratingDist[4] / ratingTotal) * 100) : 0;
    const withComment = reviews.filter((r) => r.comment && r.comment.trim().length > 0).length;

    const nowMs = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const last30 = reviews.filter((r) => nowMs - new Date(r.created_at).getTime() <= 30 * day);
    const last30Avg = last30.length ? last30.reduce((a, b) => a + b.rating, 0) / last30.length : 0;

    return {
      total,
      ratingDist,
      ratingTotal,
      fivePct,
      withComment,
      last30Count: last30.length,
      last30Avg,
    };
  }, [reviews]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "5":
        return reviews.filter((r) => r.rating === 5);
      case "4":
        return reviews.filter((r) => r.rating === 4);
      case "3":
        return reviews.filter((r) => r.rating === 3);
      case "low":
        return reviews.filter((r) => r.rating <= 2);
      case "with_comment":
        return reviews.filter((r) => r.comment && r.comment.trim().length > 0);
      case "all":
      default:
        return reviews;
    }
  }, [reviews, filter]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : lang === "tr" ? "tr-TR" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 bg-background min-h-[calc(100vh-4rem)]">
      {/* === HEADER === */}
      <header className="flex flex-col gap-2 pb-4 border-b border-foreground/15">
        <h1 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1] tracking-tight text-foreground">
          {isRtl ? "تقييماتك" : "Your reviews"}
          <span className="text-primary">.</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          {isRtl
            ? "ملخّص شفّاف لتقييمات العملاء وتعليقاتهم على خدماتك."
            : "A clear summary of customer ratings and the notes they left."}
        </p>
      </header>

      {/* === STAT CARDS === */}
      <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("avg_rating")}
          value={stats.avg.toFixed(2)}
          accent
          footer={
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i <= Math.round(stats.avg)
                      ? "fill-foreground text-foreground"
                      : "text-foreground/25"
                  }`}
                  strokeWidth={1.5}
                />
              ))}
            </div>
          }
        />
        <StatCard
          label={isRtl ? "إجمالي التقييمات" : "Total reviews"}
          value={fmt.format(stats.total)}
        />
        <StatCard
          label={isRtl ? "نسبة الخمس نجوم" : "5★ share"}
          value={`${analytics.fivePct}%`}
        />
        <StatCard
          label={isRtl ? "بتعليق" : "With a note"}
          value={fmt.format(analytics.withComment)}
          icon={MessageSquareQuote}
        />
      </section>

      {/* === DISTRIBUTION === */}
      <section className="border border-foreground/20 bg-card">
        <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-3 border-b border-foreground/10">
          <h2 className="font-display text-lg leading-none">
            {isRtl ? "توزيع التقييمات" : "Rating distribution"}
          </h2>
          {analytics.last30Count > 0 && (
            <span className="flex items-center gap-1.5 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {analytics.last30Avg.toFixed(1)}★ · {fmt.format(analytics.last30Count)}{" "}
              {isRtl ? "آخر ٣٠ يوم" : "last 30d"}
            </span>
          )}
        </div>
        <div className="p-5 flex flex-col gap-2.5">
          {[5, 4, 3, 2, 1].map((s) => {
            const n = analytics.ratingDist[s - 1];
            const pct = analytics.ratingTotal ? (n / analytics.ratingTotal) * 100 : 0;
            const barColor =
              s >= 4 ? "bg-primary" : s === 3 ? "bg-foreground/70" : "bg-destructive/70";
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s === 5 ? "5" : s === 4 ? "4" : s === 3 ? "3" : "low")}
                className="grid grid-cols-12 items-center gap-3 hover:bg-muted/40 px-2 -mx-2 py-1.5 rounded-sm transition-colors text-start"
              >
                <div className="col-span-2 sm:col-span-1 flex items-center gap-1 font-mono-display tabular-nums text-sm">
                  {s}
                  <Star className="h-3 w-3 fill-foreground text-foreground" />
                </div>
                <div className="col-span-7 sm:col-span-8 relative h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 start-0 rounded-full ${barColor}`}
                    style={{
                      width: `${pct}%`,
                      animation: "draw-line 0.9s cubic-bezier(.7,.1,.2,1) both",
                    }}
                  />
                </div>
                <div className="col-span-3 font-mono-display text-xs text-end tabular-nums text-muted-foreground">
                  <span className="text-foreground font-semibold">{fmt.format(n)}</span>
                  <span className="ms-1.5">{pct.toFixed(0)}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* === FILTER PILLS === */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground me-2">
          {isRtl ? "تصفية" : "Filter"}
        </span>
        {FILTERS.map((opt) => {
          const active = filter === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className={`px-3 py-1.5 border text-xs tracking-wide rounded-full transition-colors ${
                active
                  ? "bg-foreground text-primary border-foreground font-semibold"
                  : "border-foreground/25 text-foreground/80 hover:border-foreground hover:bg-muted"
              }`}
            >
              {isRtl ? opt.ar : opt.en}
            </button>
          );
        })}
        <span className="ms-auto font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {fmt.format(filtered.length)} {isRtl ? "نتيجة" : "shown"}
        </span>
      </div>

      {/* === REVIEW CARDS === */}
      {loading ? (
        <ReviewsSkeleton />
      ) : reviews.length === 0 ? (
        <EmptyState isRtl={isRtl} title={t("no_reviews")} />
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-foreground/25 bg-card p-10 text-center text-sm text-muted-foreground">
          {isRtl ? "لا توجد نتائج مطابقة لهذا الفلتر." : "No reviews match this filter."}
        </div>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <ReviewCard key={r.id} review={r} formatDate={formatDate} isRtl={isRtl} />
          ))}
        </section>
      )}
    </div>
  );
}

/* ---------- subcomponents ---------- */

function StatCard({
  label,
  value,
  footer,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  footer?: React.ReactNode;
  icon?: typeof Star;
  accent?: boolean;
}) {
  return (
    <div
      className={`border bg-card p-4 flex flex-col gap-2 ${
        accent ? "border-foreground" : "border-foreground/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        {Icon && <Icon className="h-3.5 w-3.5 text-foreground/60" />}
      </div>
      <div className="font-display text-3xl leading-none tabular-nums">{value}</div>
      {footer}
    </div>
  );
}

function ReviewCard({
  review,
  formatDate,
  isRtl,
}: {
  review: Review;
  formatDate: (iso: string) => string;
  isRtl: boolean;
}) {
  const hasComment = review.comment && review.comment.trim().length > 0;

  return (
    <article className="group border border-foreground/20 bg-card p-5 flex flex-col gap-4 hover:border-foreground transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i <= review.rating ? "fill-foreground text-foreground" : "text-foreground/20"
              }`}
              strokeWidth={1.5}
            />
          ))}
          <span className="ms-2 font-mono-display text-sm tabular-nums font-semibold">
            {review.rating}.0
          </span>
        </div>
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
          {formatDate(review.created_at)}
        </span>
      </div>

      {hasComment ? (
        <p className="text-foreground/90 leading-relaxed text-[15px]">{review.comment}</p>
      ) : (
        <p className="text-muted-foreground text-sm italic">
          {isRtl ? "لم يُترك تعليق." : "No comment left."}
        </p>
      )}

      <div className="mt-auto pt-3 border-t border-foreground/10 flex items-end justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 border border-foreground/20 bg-muted flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-foreground/70" />
          </div>
          <div className="min-w-0">
            <div className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {isRtl ? "العميل" : "Customer"}
            </div>
            <div className="text-sm leading-tight truncate font-medium">
              {review.customer_name ?? (isRtl ? "عميل" : "Anonymous")}
            </div>
          </div>
        </div>
        {review.request_title && (
          <Link
            to={`/employee/requests/${review.request_id}`}
            className="inline-flex items-center gap-1 font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors truncate max-w-[60%]"
          >
            <ClipboardList className="h-3 w-3 shrink-0" />
            <span className="truncate">{review.request_title}</span>
            <ArrowUpRight className="h-3 w-3 shrink-0" />
          </Link>
        )}
      </div>
    </article>
  );
}

function ReviewsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border border-foreground/15 bg-card h-48" />
      ))}
    </div>
  );
}

function EmptyState({ isRtl, title }: { isRtl: boolean; title: string }) {
  return (
    <div className="border border-dashed border-foreground/25 bg-card p-16 flex flex-col items-center text-center gap-4">
      <div className="h-14 w-14 border border-foreground/30 bg-background flex items-center justify-center">
        <Inbox className="h-6 w-6 text-foreground/60" />
      </div>
      <h3 className="font-display text-2xl leading-tight">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {isRtl
          ? "لم تستلم تقييمات بعد. أكمل أول مهمة لتظهر أول شهادة هنا."
          : "No reviews yet. Complete your first job and they'll appear here."}
      </p>
    </div>
  );
}
