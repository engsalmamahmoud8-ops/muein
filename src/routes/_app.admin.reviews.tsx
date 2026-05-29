import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Star, Search, ArrowUpRight, Quote, Flame, MessageSquareOff, TrendingUp } from "lucide-react";

type TFn = ReturnType<typeof useI18n>["t"];

export const Route = createFileRoute("/_app/admin/reviews")({ component: AdminReviews });

type RawReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer_id: string;
  employee_id: string;
  service_requests: { id: string; title: string | null } | null;
};

type Review = RawReview & {
  customer_name: string | null;
  employee_name: string | null;
};

type RatingFilter = "all" | "5" | "4" | "3" | "low" | "with_comment";
type SortKey = "newest" | "oldest" | "highest" | "lowest";

function AdminReviews() {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RatingFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, customer_id, employee_id, service_requests(id, title)")
        .order("created_at", { ascending: false })
        .limit(200);

      const raw = (data ?? []) as unknown as RawReview[];

      const customerIds = Array.from(new Set(raw.map(r => r.customer_id))).filter(Boolean);
      const employeeIds = Array.from(new Set(raw.map(r => r.employee_id))).filter(Boolean);

      const [{ data: customerProfiles }, { data: employees }] = await Promise.all([
        customerIds.length
          ? supabase.from("profiles").select("id, full_name").in("id", customerIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
        employeeIds.length
          ? supabase.from("employees").select("id, user_id").in("id", employeeIds)
          : Promise.resolve({ data: [] as { id: string; user_id: string }[] }),
      ]);

      const empUserIds = Array.from(new Set((employees ?? []).map(e => e.user_id)));
      const { data: employeeProfiles } = empUserIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", empUserIds)
        : { data: [] as { id: string; full_name: string | null }[] };

      const customerMap = new Map((customerProfiles ?? []).map(p => [p.id, p.full_name]));
      const empUserMap = new Map((employees ?? []).map(e => [e.id, e.user_id]));
      const empProfileMap = new Map((employeeProfiles ?? []).map(p => [p.id, p.full_name]));

      const enriched: Review[] = raw.map(r => ({
        ...r,
        customer_name: customerMap.get(r.customer_id) ?? null,
        employee_name: empProfileMap.get(empUserMap.get(r.employee_id) ?? "") ?? null,
      }));

      if (!cancelled) {
        setRows(enriched);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    if (!rows.length) return { total: 0, avg: 0, fivePct: 0, weekCount: 0, hist: [0, 0, 0, 0, 0] };
    const total = rows.length;
    const sum = rows.reduce((a, r) => a + r.rating, 0);
    const avg = sum / total;
    const hist = [1, 2, 3, 4, 5].map(n => rows.filter(r => r.rating === n).length);
    const fivePct = Math.round((hist[4] / total) * 100);
    const since = Date.now() - 7 * 24 * 3600 * 1000;
    const weekCount = rows.filter(r => new Date(r.created_at).getTime() >= since).length;
    return { total, avg, fivePct, weekCount, hist };
  }, [rows]);

  const topProviders = useMemo(() => {
    const map = new Map<string, { name: string; count: number; sum: number }>();
    rows.forEach(r => {
      const key = r.employee_id;
      const entry = map.get(key) ?? { name: r.employee_name ?? "—", count: 0, sum: 0 };
      entry.count += 1;
      entry.sum += r.rating;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, name: v.name, count: v.count, avg: v.sum / v.count }))
      .filter(v => v.count >= 1)
      .sort((a, b) => b.avg - a.avg || b.count - a.count)
      .slice(0, 5);
  }, [rows]);

  const featured = useMemo(() => {
    return rows
      .filter(r => r.rating >= 5 && r.comment && r.comment.trim().length > 30)
      .slice(0, 1)[0] ?? rows.find(r => r.comment && r.comment.trim().length > 0) ?? null;
  }, [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (filter === "5") out = out.filter(r => r.rating === 5);
    else if (filter === "4") out = out.filter(r => r.rating === 4);
    else if (filter === "3") out = out.filter(r => r.rating === 3);
    else if (filter === "low") out = out.filter(r => r.rating <= 2);
    else if (filter === "with_comment") out = out.filter(r => (r.comment ?? "").trim().length > 0);
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter(r =>
        (r.comment ?? "").toLowerCase().includes(q) ||
        (r.customer_name ?? "").toLowerCase().includes(q) ||
        (r.employee_name ?? "").toLowerCase().includes(q) ||
        (r.service_requests?.title ?? "").toLowerCase().includes(q),
      );
    }
    if (sort === "newest") out = [...out].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else if (sort === "oldest") out = [...out].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    else if (sort === "highest") out = [...out].sort((a, b) => b.rating - a.rating);
    else if (sort === "lowest") out = [...out].sort((a, b) => a.rating - b.rating);
    return out;
  }, [rows, filter, query, sort]);

  const filterOptions: { key: RatingFilter; label: string; sub?: string }[] = [
    { key: "all", label: t("filter_all"), sub: String(rows.length) },
    { key: "5", label: "5★", sub: String(stats.hist[4]) },
    { key: "4", label: "4★", sub: String(stats.hist[3]) },
    { key: "3", label: "3★", sub: String(stats.hist[2]) },
    { key: "low", label: "≤2★", sub: String(stats.hist[0] + stats.hist[1]) },
    { key: "with_comment", label: t("comment"), sub: String(rows.filter(r => (r.comment ?? "").trim().length > 0).length) },
  ];

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "newest", label: t("sort_newest") },
    { key: "oldest", label: t("sort_oldest") },
    { key: "highest", label: "★ ↓" },
    { key: "lowest", label: "★ ↑" },
  ];

  return (
    <div className="space-y-10 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pt-2">
      {/* ===== MASTHEAD ===== */}
      <header className="relative">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b-[3px] border-foreground pb-6">
          <h1 className="font-display text-5xl md:text-7xl leading-[0.92] tracking-tight">
            {t("manage_reviews")}
          </h1>
        </div>
      </header>

      {/* ===== MAIN GRID ===== */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-10 lg:gap-12">
        {/* ===== LEFT: CONTROLS + LIST ===== */}
        <main className="min-w-0">
          {/* Filter rail */}
          <div className="border-2 border-foreground bg-card p-4 md:p-5 mb-6 animate-fade-up">
            <div className="flex flex-wrap items-stretch gap-3 mb-4">
              {filterOptions.map(opt => {
                const active = filter === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFilter(opt.key)}
                    className={`group relative px-3 py-2 border border-foreground font-mono-ui text-xs flex items-center gap-2 transition-all hover:-translate-y-0.5 ${
                      active ? "bg-foreground text-background" : "bg-transparent hover:bg-foreground/5"
                    }`}
                  >
                    <span className="font-medium uppercase tracking-[0.18em]">{opt.label}</span>
                    {opt.sub && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] ${
                          active ? "bg-primary text-foreground" : "bg-foreground/10 text-foreground/70"
                        }`}
                      >
                        {opt.sub}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <label className="flex items-center gap-3 flex-1 border-b-2 border-foreground/80 focus-within:border-primary transition-colors">
                <Search className="h-4 w-4 text-foreground/50 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`${t("search")} — ${t("comment")}, ${t("customer")}, ${t("employee")}…`}
                  className="bg-transparent w-full py-2 text-sm font-display placeholder:font-sans placeholder:text-foreground/40 outline-none"
                />
              </label>
              <div className="flex items-center gap-1 border border-foreground self-start">
                {sortOptions.map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSort(s.key)}
                    className={`px-3 py-2 font-mono-ui text-[11px] uppercase tracking-[0.18em] transition-colors ${
                      sort === s.key ? "bg-primary text-foreground" : "hover:bg-foreground/5"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {(filter !== "all" || query) && (
              <div className="mt-3 flex items-center justify-end label-mono text-foreground/60">
                <button
                  onClick={() => { setFilter("all"); setQuery(""); }}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {t("reset_filters")}
                </button>
              </div>
            )}
          </div>

          {/* List */}
          {loading ? (
            <ListSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState t={t} />
          ) : (
            <ol className="border-t-2 border-foreground">
              {filtered.map((r, idx) => (
                <ReviewEntry
                  key={r.id}
                  r={r}
                  index={idx + 1}
                  lang={lang}
                  t={t}
                />
              ))}
            </ol>
          )}
        </main>

        {/* ===== RIGHT: SIDEBAR ===== */}
        <aside className="space-y-8">
          {/* Featured pull-quote */}
          {featured && (
            <div className="relative panel-yellow border-2 border-foreground p-6 animate-fade-up overflow-hidden">
              <div className="absolute inset-0 panel-stripes" aria-hidden />
              <div className="absolute inset-0 panel-noise" aria-hidden />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="label-mono">FIVE-STAR PICK</span>
                  <Flame className="h-4 w-4" />
                </div>
                <Quote className="h-9 w-9 mb-2 -ms-1 fill-foreground text-foreground" />
                <blockquote className="font-display text-2xl leading-[1.15] tracking-tight">
                  {(featured.comment ?? "").slice(0, 220)}
                  {(featured.comment?.length ?? 0) > 220 && "…"}
                </blockquote>
                <div className="mt-5 pt-4 border-t border-foreground/30 flex items-center justify-between label-mono">
                  <span className="truncate max-w-[60%]">
                    — {featured.customer_name ?? t("customer")}
                  </span>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-foreground text-foreground" />
                    ))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Rating histogram */}
          <div className="border-2 border-foreground bg-card p-5 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <span className="label-mono">DISTRIBUTION</span>
              <span className="label-mono text-foreground/50">n={stats.total}</span>
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(n => {
                const count = stats.hist[n - 1];
                const pct = stats.total ? (count / stats.total) * 100 : 0;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      setFilter(n === 5 ? "5" : n === 4 ? "4" : n === 3 ? "3" : "low")
                    }
                    className="w-full group flex items-center gap-3 text-start"
                  >
                    <span className="font-mono-ui text-xs w-6 shrink-0">{n}★</span>
                    <span className="flex-1 h-6 bg-foreground/[0.06] border border-foreground/15 relative overflow-hidden">
                      <span
                        className="absolute inset-y-0 start-0 bg-primary transition-[width] duration-700 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-y-0 start-0 panel-stripes opacity-30" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="font-mono-ui text-xs w-10 text-end tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Top providers */}
          <div className="border-2 border-foreground bg-card p-5 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <span className="label-mono">TOP RATED</span>
              <TrendingUp className="h-3.5 w-3.5 text-foreground/50" />
            </div>
            {topProviders.length === 0 ? (
              <p className="font-mono-ui text-xs text-foreground/50">{t("no_data")}</p>
            ) : (
              <ol className="divide-y divide-foreground/10">
                {topProviders.map((p, i) => (
                  <li key={p.id} className="py-3 flex items-center gap-3 first:pt-0 last:pb-0">
                    <span className="font-display text-2xl leading-none w-7 text-foreground/40 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-base truncate leading-tight">
                        {p.name || t("provider_fallback")}
                      </div>
                      <div className="label-mono text-foreground/50 mt-0.5">
                        {p.count} {p.count === 1 ? t("applications_count") : t("applications_count_plural")}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-0.5 font-mono-ui">
                      <Star className="h-3 w-3 fill-primary text-primary self-center" />
                      <span className="font-semibold tabular-nums">{p.avg.toFixed(1)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Colophon */}
          <div className="border-t border-dashed border-foreground/30 pt-4 label-mono text-foreground/40 leading-relaxed">
            <p>SET IN FRAUNCES &amp; IBM PLEX MONO.</p>
            <p>PRINTED HOT — UPDATED LIVE.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ===== sub-components ===== */

function ReviewEntry({
  r,
  index,
  lang,
  t,
}: {
  r: Review;
  index: number;
  lang: "ar" | "en" | "tr";
  t: TFn;
}) {
  const date = new Date(r.created_at);
  const dateStr = date.toLocaleDateString(lang === "ar" ? "ar" : lang === "tr" ? "tr-TR" : "en-US", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const lowRating = r.rating <= 2;
  return (
    <li className="border-b-2 border-foreground py-6 md:py-7 grid grid-cols-1 md:grid-cols-[88px_1fr_auto] gap-5 md:gap-6 items-start hover:bg-foreground/[0.02] transition-colors group">
      {/* Serial */}
      <div className="flex md:flex-col md:items-start items-center gap-3 md:gap-1">
        <div className="font-display text-4xl md:text-5xl leading-none text-foreground/30 tabular-nums">
          {String(index).padStart(3, "0")}
        </div>
        <div className="label-mono text-foreground/60 md:mt-2">{dateStr}</div>
      </div>

      {/* Body */}
      <div className="min-w-0">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <RatingDisplay rating={r.rating} />
          {lowRating && (
            <span className="label-mono inline-flex items-center gap-1 px-2 py-1 bg-destructive text-destructive-foreground">
              <MessageSquareOff className="h-3 w-3" />
              FLAGGED
            </span>
          )}
          {!r.comment && (
            <span className="label-mono text-foreground/40">RATING ONLY</span>
          )}
        </div>
        {r.comment ? (
          <blockquote className="font-display text-xl md:text-[22px] leading-[1.3] tracking-tight text-foreground/90 break-words">
            <span className="text-primary me-1 -ms-1 select-none">“</span>
            {r.comment}
            <span className="text-primary ms-0.5 select-none">”</span>
          </blockquote>
        ) : (
          <p className="font-display italic text-foreground/40 text-lg">{t("no_data")}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 label-mono text-foreground/60">
          <span className="inline-flex items-center gap-1.5">
            <span className="opacity-50">{t("customer").toUpperCase()}</span>
            <span className="text-foreground/90 normal-case font-display tracking-normal text-sm" style={{ letterSpacing: 0 }}>
              {r.customer_name ?? "—"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="opacity-50">{t("employee").toUpperCase()}</span>
            <span className="text-foreground/90 normal-case font-display tracking-normal text-sm" style={{ letterSpacing: 0 }}>
              {r.employee_name ?? "—"}
            </span>
          </span>
          {r.service_requests?.title && (
            <span className="inline-flex items-center gap-1.5 max-w-full">
              <span className="opacity-50">REQ</span>
              <span className="text-foreground/80 normal-case font-mono-ui truncate" style={{ letterSpacing: 0 }}>
                {r.service_requests.title}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="md:self-stretch flex md:items-end justify-end">
        {r.service_requests?.id ? (
          <Link
            to="/customer/requests/$id"
            params={{ id: r.service_requests.id }}
            className="group/btn inline-flex items-center gap-2 px-4 py-2.5 border-2 border-foreground font-mono-ui text-[11px] uppercase tracking-[0.22em] font-medium bg-card hover:bg-foreground hover:text-background transition-colors"
          >
            <span>OPEN FILE</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </Link>
        ) : (
          <span className="label-mono text-foreground/40">—</span>
        )}
      </div>
    </li>
  );
}

function RatingDisplay({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? "fill-primary text-primary" : "text-foreground/20"}`}
          />
        ))}
      </span>
      <span className="font-mono-ui text-xs font-semibold tabular-nums px-1.5 py-0.5 bg-foreground/[0.06] border border-foreground/15">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ol className="border-t-2 border-foreground">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="border-b-2 border-foreground py-7 grid grid-cols-[88px_1fr_120px] gap-6 items-start"
        >
          <div className="space-y-2">
            <div className="h-12 w-16 bg-foreground/5 animate-pulse" />
            <div className="h-3 w-20 bg-foreground/5 animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-5 w-32 bg-foreground/5 animate-pulse" />
            <div className="h-6 w-full bg-foreground/5 animate-pulse" />
            <div className="h-6 w-3/4 bg-foreground/5 animate-pulse" />
            <div className="h-3 w-1/2 bg-foreground/5 animate-pulse" />
          </div>
          <div className="h-10 bg-foreground/5 animate-pulse" />
        </li>
      ))}
    </ol>
  );
}

function EmptyState({ t }: { t: TFn }) {
  return (
    <div className="border-2 border-dashed border-foreground/30 py-20 px-6 text-center relative overflow-hidden">
      <div className="font-display text-[180px] leading-none text-foreground/10 select-none">“</div>
      <p className="font-display text-3xl mt-[-40px] relative">{t("no_reviews")}</p>
      <p className="label-mono text-foreground/50 mt-3">NO ENTRIES MATCH YOUR FILTER</p>
    </div>
  );
}
