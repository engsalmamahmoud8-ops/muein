import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { StatusBadge } from "@/components/StatusBadge";
import type { RequestStatus } from "@/lib/types";
import { format } from "date-fns";
import { ArrowUpRight, MapPin, PlusCircle, Search } from "lucide-react";

export const Route = createFileRoute("/_app/customer/requests/")({
  component: List,
});

type Row = {
  id: string;
  title: string;
  city: string | null;
  status: RequestStatus;
  created_at: string;
  category: { name_ar: string; name_en: string; name_tr: string | null } | null;
};

const FILTERS = ["all", "active", "completed", "cancelled"] as const;
type Filter = (typeof FILTERS)[number];

function List() {
  const { t, lang } = useI18n();
  useEffect(() => {
    document.title = t("meta_my_requests_title");
  }, [t]);

  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["my-requests"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("service_requests")
        .select(
          "id, title, city, status, created_at, category:service_categories(name_ar, name_en, name_tr)",
        )
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Row[];
    },
  });

  const rows = data ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const passFilter = (r: Row) =>
      filter === "all"
        ? true
        : filter === "active"
        ? !["completed", "cancelled"].includes(r.status)
        : r.status === filter;
    const passQuery = (r: Row) =>
      !q ||
      r.title.toLowerCase().includes(q) ||
      (r.city ?? "").toLowerCase().includes(q);
    const arr = rows.filter((r) => passFilter(r) && passQuery(r));
    arr.sort((a, b) => {
      const A = new Date(a.created_at).getTime();
      const B = new Date(b.created_at).getTime();
      return sort === "newest" ? B - A : A - B;
    });
    return arr;
  }, [rows, filter, sort, query]);

  const counts = useMemo(() => {
    const active = rows.filter(
      (r) => !["completed", "cancelled"].includes(r.status),
    ).length;
    return {
      all: rows.length,
      active,
      completed: rows.filter((r) => r.status === "completed").length,
      cancelled: rows.filter((r) => r.status === "cancelled").length,
    };
  }, [rows]);

  const today = useMemo(() => format(new Date(), "EEEE · dd LLL yyyy"), []);
  const issueNo = useMemo(
    () => `VOL.${new Date().getFullYear() % 100}·№${String(rows.length || 0).padStart(3, "0")}`,
    [rows.length],
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Masthead */}
      <header className="brutal-panel brutal-shadow p-6 md:p-8 relative overflow-hidden animate-fade-down">
        <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between gap-4 mono-ticker text-foreground/70">
            <span className="flex items-center gap-2">
              <span className="status-dot status-dot-live" />
              <span>{t("my_requests")}</span>
            </span>
            <span className="hidden sm:inline">{today}</span>
            <span className="font-mono-ui">{issueNo}</span>
          </div>

          <div className="rule-bold mt-4" />

          <div className="mt-6 flex items-end justify-between flex-wrap gap-6">
            <div className="min-w-0 flex-1">
              <p className="label-mono text-foreground/60">
                {t("filter_all")} · {counts.all}
              </p>
              <h1 className="font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.9] font-medium mt-2">
                {lang === "en"
                  ? "Case Ledger"
                  : lang === "tr"
                  ? "Dosya Defteri"
                  : "سِجِلّ الطَّلَبات"}
                <span className="text-primary">.</span>
              </h1>
              <p className="mt-3 font-mono-ui text-sm text-foreground/60 max-w-md">
                {lang === "en"
                  ? "Every request you've filed — open, archived, or in motion."
                  : lang === "tr"
                  ? "Açtığınız tüm talepler — açık, arşivlenmiş veya devam eden."
                  : "كل طلب أرسلتَه — مفتوح، مؤرشف، أو قيد التنفيذ."}
              </p>
            </div>

            <Link
              to="/customer/requests/new"
              className="group inline-flex items-center gap-3 self-start sm:self-end"
            >
              <span className="btn-stamp !w-auto !px-5 !py-3 !text-[0.7rem]">
                <PlusCircle className="h-4 w-4 me-2" />
                {t("new_request")}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Controls strip */}
      <section className="brutal-panel animate-fade-up delay-100">
        <div className="flex items-stretch flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[240px] flex items-center gap-3 px-5 py-4 border-b sm:border-b-0 sm:border-e border-foreground">
            <Search className="h-4 w-4 text-foreground/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                lang === "en"
                  ? "Search title or city…"
                  : lang === "tr"
                  ? "Başlık veya şehir ara…"
                  : "ابحث بالعنوان أو المدينة…"
              }
              className="w-full bg-transparent outline-none font-mono-ui text-sm placeholder:text-foreground/40"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="label-mono text-foreground/50 hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center px-5 py-4 gap-3 border-b sm:border-b-0 sm:border-e border-foreground">
            <span className="label-mono text-foreground/60">{t("sort_by")}</span>
            <div className="flex">
              {(["newest", "oldest"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  data-active={sort === s}
                  className="seg-chip !text-[10px] !py-1.5 !px-3 !border-foreground"
                >
                  {t(`sort_${s}` as never)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter strip */}
        <div className="border-t border-foreground flex flex-wrap">
          {FILTERS.map((f, i) => {
            const active = filter === f;
            const c = counts[f];
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                data-active={active}
                className={`group relative flex-1 min-w-[140px] px-5 py-5 text-start border-foreground transition-colors ${
                  i > 0 ? "border-s" : ""
                } ${active ? "bg-foreground text-background" : "hover:bg-foreground/5"}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`font-mono-ui text-[10px] tracking-[0.22em] uppercase ${
                      active ? "text-primary" : "text-foreground/60"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")} ·{" "}
                    {t(`filter_${f}` as never)}
                  </span>
                  <span
                    className={`font-mono-display text-2xl font-medium tabular-nums ${
                      active ? "text-primary" : ""
                    }`}
                  >
                    {String(c).padStart(2, "0")}
                  </span>
                </div>
                <div
                  className={`mt-3 h-[2px] origin-left transition-transform ${
                    active ? "bg-primary scale-x-100" : "bg-foreground/30 scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* Ledger entries */}
      <section className="animate-fade-up delay-200">
        {isLoading ? (
          <LedgerSkeleton />
        ) : filtered.length === 0 ? (
          <LedgerEmpty hasQuery={query.length > 0 || filter !== "all"} />
        ) : (
          <ol className="brutal-panel divide-y divide-foreground">
            <li className="hidden md:grid grid-cols-[80px_1fr_180px_140px_160px] gap-4 px-5 py-3 bg-foreground text-primary label-mono">
              <span>№</span>
              <span>{lang === "en" ? "Filing" : lang === "tr" ? "Kayıt" : "العنوان"}</span>
              <span>{lang === "en" ? "Locale" : lang === "tr" ? "Konum" : "الموقع"}</span>
              <span>{lang === "en" ? "Filed" : lang === "tr" ? "Tarih" : "تاريخ"}</span>
              <span className="text-end">{lang === "en" ? "Status" : lang === "tr" ? "Durum" : "الحالة"}</span>
            </li>

            {filtered.map((r, i) => (
              <Entry
                key={r.id}
                row={r}
                index={i + 1}
                total={filtered.length}
                lang={lang}
              />
            ))}
          </ol>
        )}
      </section>

      {/* Foot ticker */}
      {!isLoading && filtered.length > 0 && (
        <footer className="flex items-center justify-between mono-ticker text-foreground/60 animate-fade-in delay-300">
          <span>
            {lang === "en"
              ? `Showing ${filtered.length} of ${counts.all}`
              : lang === "tr"
              ? `${counts.all} kayıttan ${filtered.length} gösteriliyor`
              : `عرض ${filtered.length} من ${counts.all}`}
          </span>
          <span className="hidden sm:inline">— END OF LEDGER —</span>
          <span>{format(new Date(), "HH:mm")}</span>
        </footer>
      )}
    </div>
  );
}

function Entry({
  row,
  index,
  total,
  lang,
}: {
  row: Row;
  index: number;
  total: number;
  lang: "ar" | "en" | "tr";
}) {
  const categoryName = row.category
    ? lang === "en"
      ? row.category.name_en
      : lang === "tr"
      ? row.category.name_tr ?? row.category.name_ar
      : row.category.name_ar
    : null;

  return (
    <li>
      <Link
        to="/customer/requests/$id"
        params={{ id: row.id }}
        className="group grid grid-cols-1 md:grid-cols-[80px_1fr_180px_140px_160px] gap-2 md:gap-4 px-5 py-5 hover:bg-primary/10 transition-colors"
      >
        {/* № */}
        <div className="flex items-center gap-3">
          <span className="section-num">
            {String(index).padStart(3, "0")}/{String(total).padStart(3, "0")}
          </span>
        </div>

        {/* Filing */}
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="font-display text-xl md:text-2xl leading-tight font-medium truncate group-hover:text-primary transition-colors">
              {row.title}
            </h3>
            <ArrowUpRight className="h-4 w-4 mt-1.5 text-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
          </div>
          {categoryName && (
            <p className="mt-1 label-mono text-foreground/60">
              <span className="text-primary">▸</span> {categoryName}
            </p>
          )}
        </div>

        {/* Locale */}
        <div className="flex md:items-center font-mono-ui text-sm text-foreground/70">
          {row.city ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {row.city}
            </span>
          ) : (
            <span className="text-foreground/30">—</span>
          )}
        </div>

        {/* Filed */}
        <div className="flex md:items-center font-mono-ui text-sm text-foreground/70 tabular-nums">
          {format(new Date(row.created_at), "dd LLL yyyy")}
        </div>

        {/* Status */}
        <div className="flex md:items-center md:justify-end">
          <StatusBadge status={row.status} />
        </div>
      </Link>
    </li>
  );
}

function LedgerSkeleton() {
  return (
    <ol className="brutal-panel divide-y divide-foreground">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="grid grid-cols-[80px_1fr_140px] md:grid-cols-[80px_1fr_180px_140px_160px] gap-4 px-5 py-6"
        >
          <div className="section-num !bg-foreground/20 !text-transparent">
            ___
          </div>
          <div className="space-y-2">
            <div className="h-6 w-2/3 bg-foreground/10 animate-pulse" />
            <div className="h-3 w-1/3 bg-foreground/10 animate-pulse" />
          </div>
          <div className="hidden md:block h-3 w-3/4 bg-foreground/10 animate-pulse self-center" />
          <div className="hidden md:block h-3 w-2/3 bg-foreground/10 animate-pulse self-center" />
          <div className="h-6 w-24 bg-foreground/10 animate-pulse self-center md:justify-self-end" />
        </li>
      ))}
    </ol>
  );
}

function LedgerEmpty({ hasQuery }: { hasQuery: boolean }) {
  const { t, lang } = useI18n();
  return (
    <div className="brutal-panel brutal-shadow-sm p-10 md:p-16 text-center relative overflow-hidden">
      <div className="absolute inset-0 panel-stripes" />
      <div className="relative space-y-5">
        <p className="label-mono text-foreground/50">
          {lang === "en" ? "Ledger entry · empty" : lang === "tr" ? "Kayıt · boş" : "السجل · فارغ"}
        </p>
        <h3 className="font-display text-3xl md:text-5xl font-medium leading-tight">
          {hasQuery
            ? lang === "en"
              ? "No filings match."
              : lang === "tr"
              ? "Eşleşen kayıt yok."
              : "لا توجد طلبات مطابقة."
            : lang === "en"
            ? "The page is blank."
            : lang === "tr"
            ? "Sayfa boş."
            : "الصفحة فارغة."}
          <span className="text-primary">.</span>
        </h3>
        <p className="font-mono-ui text-sm text-foreground/60 max-w-md mx-auto">
          {hasQuery
            ? t("no_data")
            : lang === "en"
            ? "File your first request to start a ledger entry."
            : lang === "tr"
            ? "İlk talebinizi oluşturup defterinizi başlatın."
            : "افتح أوّل طلب لتبدأ سجلّك."}
        </p>
        {!hasQuery && (
          <div className="pt-2">
            <Link to="/customer/requests/new" className="inline-block">
              <span className="btn-stamp !w-auto !px-6 !py-3">
                <PlusCircle className="h-4 w-4 me-2" />
                {t("new_request")}
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
