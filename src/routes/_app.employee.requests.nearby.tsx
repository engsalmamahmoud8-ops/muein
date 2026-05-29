import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  haversineKm,
  readCachedEmployeeLocation,
  refreshEmployeeLocation,
  type Coords,
} from "@/lib/geo";
import {
  DEFAULT_PLATFORM_SETTINGS,
  PLATFORM_SETTINGS_EVENT,
  loadPlatformSettings,
  refreshPlatformSettingsFromServer,
} from "@/lib/platform-settings";
import { resolveIcon } from "@/lib/icons";
import { truncate } from "@/lib/format";
import {
  Inbox,
  MapPin,
  Navigation,
  RefreshCcw,
  AlertTriangle,
  Users,
  ArrowRight,
  Clock,
  Crosshair,
  Filter,
  Layers,
} from "lucide-react";
import { format } from "date-fns";

type Category = {
  id: string;
  name_ar: string;
  name_en: string;
  name_tr: string | null;
  icon: string | null;
};
type SortKey = "newest" | "oldest" | "nearest" | "most_applications";

export const Route = createFileRoute("/_app/employee/requests/nearby")({
  component: Nearby,
});

const SORT_OPTIONS: { key: SortKey; en: string; ar: string }[] = [
  { key: "nearest", en: "NEAREST", ar: "الأقرب" },
  { key: "newest", en: "NEWEST", ar: "الأحدث" },
  { key: "oldest", en: "OLDEST", ar: "الأقدم" },
  { key: "most_applications", en: "HOTTEST", ar: "الأكثر" },
];

function Nearby() {
  const { t, lang } = useI18n();
  const isRtl = lang === "ar";
  const fmt = useMemo(
    () => new Intl.NumberFormat(lang === "ar" ? "ar-EG" : lang === "tr" ? "tr-TR" : "en-US"),
    [lang],
  );

  const [empCoords, setEmpCoords] = useState<Coords | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [maxDistance, setMaxDistance] = useState<number>(DEFAULT_PLATFORM_SETTINGS.maxDistance);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("nearest");

  useEffect(() => {
    document.title = t("meta_nearby_title");
  }, [t]);

  useEffect(() => {
    const sync = () => setMaxDistance(loadPlatformSettings().maxDistance);
    sync();
    refreshPlatformSettingsFromServer();
    const onFocus = () => sync();
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(PLATFORM_SETTINGS_EVENT, sync);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(PLATFORM_SETTINGS_EVENT, sync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const initLocation = async (force = false) => {
    setLoadingLocation(true);
    setLocationError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: emp } = await supabase
        .from("employees")
        .select("id, lat, lng")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!emp) {
        setLocationError(t("no_location"));
        return;
      }
      if (!force && typeof emp.lat === "number" && typeof emp.lng === "number") {
        setEmpCoords({ lat: emp.lat, lng: emp.lng });
        return;
      }
      const cached = readCachedEmployeeLocation();
      if (!force && cached) {
        setEmpCoords(cached);
        return;
      }
      const coords = await refreshEmployeeLocation(emp.id, force);
      if (coords) setEmpCoords(coords);
      else setLocationError(t("location_denied"));
    } finally {
      setLoadingLocation(false);
    }
  };

  useEffect(() => {
    initLocation(false);
  }, []);

  const { data: categories } = useQuery({
    queryKey: ["categories-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_categories")
        .select("id, name_ar, name_en, name_tr, icon")
        .eq("is_active", true);
      return (data ?? []) as Category[];
    },
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["nearby-all-detailed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_requests")
        .select(
          "id, title, description, address, city, status, created_at, lat, lng, category_id, category:service_categories(id, name_ar, name_en, name_tr, icon), applications:request_applications(count)",
        )
        .in("status", ["pending", "applications_received"])
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const categoryName = (
    c: { name_ar?: string | null; name_en?: string | null; name_tr?: string | null } | null,
  ) => {
    if (!c) return "";
    return (
      (lang === "en" ? c.name_en : lang === "tr" ? c.name_tr : c.name_ar) ||
      c.name_ar ||
      c.name_en ||
      ""
    );
  };

  const enriched = useMemo(() => {
    if (!empCoords || !requests) return [];
    return requests
      .map((r) => {
        if (typeof r.lat !== "number" || typeof r.lng !== "number") return null;
        const distance = haversineKm(empCoords, { lat: r.lat, lng: r.lng });
        const appsArr = r.applications as Array<{ count: number }> | null | undefined;
        const applicationsCount = Array.isArray(appsArr) && appsArr[0] ? appsArr[0].count : 0;
        return { ...r, distance, applicationsCount };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r.distance <= maxDistance);
  }, [empCoords, requests, maxDistance]);

  const counts = useMemo(() => {
    const byCat = new Map<string, number>();
    for (const r of enriched) {
      if (r.category_id) byCat.set(r.category_id, (byCat.get(r.category_id) ?? 0) + 1);
    }
    return byCat;
  }, [enriched]);

  const visible = useMemo(() => {
    const filtered =
      selectedCategory === "all"
        ? enriched
        : enriched.filter((r) => r.category_id === selectedCategory);
    const sorted = [...filtered];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "most_applications":
        sorted.sort((a, b) => b.applicationsCount - a.applicationsCount || a.distance - b.distance);
        break;
      case "nearest":
      default:
        sorted.sort((a, b) => a.distance - b.distance);
    }
    return sorted;
  }, [enriched, selectedCategory, sort]);

  const nearest = visible[0];
  const totalInRadius = enriched.length;

  return (
    <div className="space-y-6 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 bg-background min-h-[calc(100vh-4rem)]">
      {/* === MASTHEAD === */}
      <header className="grid grid-cols-12 gap-4 items-end pb-2 border-b-2 border-foreground">
        <div className="col-span-12 lg:col-span-8">
          <h1 className="font-display text-[clamp(2.5rem,6vw,4.75rem)] leading-[0.9] tracking-tight text-foreground">
            <span className="block italic font-light">{t("nearby_requests")}</span>
            <span className="block">
              {fmt.format(totalInRadius)}
              <span className="text-primary">.</span>
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground leading-relaxed">
            {t("within_radius").replace("{km}", String(maxDistance))}{" "}
            <span className="font-mono-ui text-foreground/70">
              // {fmt.format(visible.length)} {isRtl ? "نتيجة بعد التصفية." : "after filters."}
            </span>
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-2 lg:justify-end">
          <KeyBox
            icon={Crosshair}
            label={isRtl ? "إحداثيات" : "POSITION"}
            value={empCoords ? `${empCoords.lat.toFixed(2)}, ${empCoords.lng.toFixed(2)}` : "—"}
            mono
          />
          <KeyBox
            icon={Navigation}
            label={isRtl ? "أقرب" : "NEAREST"}
            value={nearest ? `${nearest.distance.toFixed(1)} ${t("distance_km")}` : "—"}
          />
        </div>
      </header>

      {/* === LOCATION CALLOUT === */}
      {!empCoords && !loadingLocation && (
        <div className="relative border border-foreground panel-yellow overflow-hidden">
          <div className="panel-stripes absolute inset-0" />
          <div className="panel-noise absolute inset-0" />
          <div className="relative p-6 md:p-8 flex items-start gap-5 flex-wrap">
            <div className="h-14 w-14 border-2 border-foreground bg-background flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-[16rem] space-y-2">
              <div className="label-mono">ACTION REQUIRED · {isRtl ? "ابدأ البث" : "GO LIVE"}</div>
              <h2 className="font-display text-2xl md:text-3xl leading-tight">
                {t("enable_employee_location")}
              </h2>
              <p className="font-mono-ui text-xs uppercase tracking-[0.16em] opacity-80 max-w-md">
                {locationError ?? t("location_required_for_nearby")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => initLocation(true)}
              className="btn-stamp w-auto min-w-[12rem]"
            >
              <Navigation className="h-3.5 w-3.5 me-2" />
              {t("enable_location")}
            </button>
          </div>
        </div>
      )}

      {/* === COMMAND BAR === */}
      <div className="border border-foreground bg-card flex flex-wrap items-stretch divide-x divide-foreground rtl:divide-x-reverse">
        <div className="flex items-center gap-3 px-4 py-3 min-w-0">
          <Filter className="h-3.5 w-3.5 text-foreground/70" />
          <span className="label-mono text-foreground">SORT</span>
        </div>
        <div className="flex flex-wrap divide-x divide-foreground/30 rtl:divide-x-reverse flex-1 min-w-0">
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSort(opt.key)}
                className={`px-4 py-3 font-mono-ui text-[11px] tracking-[0.18em] uppercase transition-colors ${
                  active
                    ? "bg-foreground text-primary font-semibold"
                    : "text-foreground/80 hover:bg-muted"
                }`}
              >
                {isRtl ? opt.ar : opt.en}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => initLocation(true)}
          disabled={loadingLocation}
          className="px-4 py-3 font-mono-ui text-[11px] tracking-[0.18em] uppercase flex items-center gap-2 hover:bg-foreground hover:text-primary transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${loadingLocation ? "animate-spin" : ""}`} />
          {isRtl ? "تحديث" : "RELOC"}
        </button>
      </div>

      {/* === GRID: CATEGORIES SIDEBAR + RESULTS === */}
      {empCoords && (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* CATEGORIES SIDEBAR */}
          <aside className="border border-foreground bg-card self-start">
            <div className="flex items-baseline justify-between px-4 pt-3 pb-2 border-b border-foreground/15">
              <div className="flex items-center gap-2">
                <Layers className="h-3 w-3 text-foreground/70" />
                <h2 className="label-mono text-foreground tracking-[0.24em]">
                  {isRtl ? "الفئات" : "CATEGORIES"}
                </h2>
              </div>
              {(selectedCategory !== "all" || sort !== "nearest") && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSort("nearest");
                  }}
                  className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-foreground/70 hover:text-primary"
                >
                  {t("reset_filters")}
                </button>
              )}
            </div>
            <ul className="divide-y divide-border">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`w-full text-start flex items-center justify-between gap-2 px-4 py-3 transition-colors ${
                    selectedCategory === "all"
                      ? "bg-foreground text-primary"
                      : "hover:bg-muted text-foreground/85"
                  }`}
                >
                  <span className="font-display text-base leading-none">{t("all_services")}</span>
                  <span className="font-mono-ui text-[10px] tabular-nums">
                    {fmt.format(enriched.length)}
                  </span>
                </button>
              </li>
              {(categories ?? []).map((c) => {
                const Icon = resolveIcon(c.icon);
                const count = counts.get(c.id) ?? 0;
                const active = selectedCategory === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(c.id)}
                      className={`w-full text-start flex items-center justify-between gap-2 px-4 py-3 transition-colors ${
                        active ? "bg-foreground text-primary" : "hover:bg-muted text-foreground/85"
                      } ${count === 0 ? "opacity-50" : ""}`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="font-display text-base truncate leading-tight">
                          {categoryName(c)}
                        </span>
                      </span>
                      <span className="font-mono-ui text-[10px] tabular-nums shrink-0">
                        {fmt.format(count)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* RESULTS */}
          <section className="space-y-4 min-w-0">
            <div className="flex items-baseline justify-between px-1">
              <p className="label-mono text-foreground/70">
                {isRtl ? "نتائج" : "RESULTS"} · {fmt.format(visible.length)}
              </p>
              {selectedCategory !== "all" && (
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {categoryName((categories ?? []).find((c) => c.id === selectedCategory) ?? null)}
                </p>
              )}
            </div>

            {isLoading || loadingLocation ? (
              <ResultsSkeleton />
            ) : visible.length === 0 ? (
              <EmptyTickets isRtl={isRtl} title={t("no_nearby_requests")} />
            ) : (
              <ol className="grid gap-3 md:grid-cols-2">
                {visible.map((r, i) => {
                  const cat = r.category as Category | null;
                  const Icon = resolveIcon(cat?.icon ?? null);
                  const isHot = r.applicationsCount >= 3;
                  return (
                    <li key={r.id}>
                      <Link
                        to={`/employee/requests/${r.id}`}
                        className="group/card relative flex flex-col gap-3 border border-foreground bg-card p-4 hover:brutal-shadow-sm hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all"
                      >
                        {/* Ticket header strip */}
                        <div className="flex items-center justify-between -mx-4 -mt-4 px-4 py-2 border-b border-foreground/20 bg-muted/30 font-mono-ui text-[10px] uppercase tracking-[0.22em]">
                          <span className="tabular-nums text-foreground/70">
                            №{String(i + 1).padStart(3, "0")} · {r.id.slice(0, 6).toUpperCase()}
                          </span>
                          {isHot && (
                            <span className="px-1.5 py-0.5 bg-primary text-foreground font-semibold">
                              HOT
                            </span>
                          )}
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 border border-foreground bg-foreground text-primary flex items-center justify-center shrink-0">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            {cat && (
                              <div className="label-mono text-foreground/70 truncate">
                                {categoryName(cat)}
                              </div>
                            )}
                            <h3 className="font-display text-xl leading-tight mt-0.5 truncate">
                              {r.title}
                            </h3>
                          </div>
                        </div>

                        {r.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                            {truncate(r.description, 140)}
                          </p>
                        )}

                        {/* Distance hero */}
                        <div className="flex items-end justify-between border-y border-foreground/15 py-2 my-1">
                          <div>
                            <div className="label-mono text-muted-foreground">
                              {isRtl ? "المسافة" : "DISTANCE"}
                            </div>
                            <div className="font-display font-light text-3xl leading-none tabular-nums mt-1">
                              {r.distance.toFixed(1)}
                              <span className="text-sm font-mono-ui ms-1 tracking-[0.18em] text-muted-foreground">
                                {t("distance_km").toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="text-end">
                            <div className="label-mono text-muted-foreground">
                              {isRtl ? "عروض" : "BIDS"}
                            </div>
                            <div className="font-display font-light text-3xl leading-none tabular-nums mt-1">
                              {fmt.format(r.applicationsCount)}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          {r.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {r.city}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(r.created_at), "MM/dd HH:mm")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {r.applicationsCount === 1
                              ? t("applications_count")
                              : t("applications_count_plural")}
                          </span>
                        </div>

                        <div className="mt-auto pt-3 border-t border-foreground/20 flex items-center justify-between">
                          <span className="label-mono text-foreground group-hover/card:text-primary transition-colors">
                            {t("apply_now")}
                          </span>
                          <span className="h-7 w-7 border border-foreground bg-foreground text-primary flex items-center justify-center group-hover/card:bg-primary group-hover/card:text-foreground transition-colors">
                            <ArrowRight className={`h-3.5 w-3.5 ${isRtl ? "rotate-180" : ""}`} />
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      )}

    </div>
  );
}

/* ---------- subcomponents ---------- */

function KeyBox({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Crosshair;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="border border-foreground bg-card px-3 py-2 flex items-center gap-3 min-w-0">
      <div className="h-8 w-8 bg-foreground text-background flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="label-mono text-muted-foreground truncate">{label}</div>
        <div
          className={`${mono ? "font-mono-display text-sm" : "font-display text-lg"} leading-none tabular-nums truncate`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-foreground/40 bg-card h-56" />
      ))}
    </div>
  );
}

function EmptyTickets({ isRtl, title }: { isRtl: boolean; title: string }) {
  return (
    <div className="border-2 border-dashed border-foreground/30 bg-card p-12 flex flex-col items-center text-center gap-3">
      <div className="h-14 w-14 border border-foreground bg-background flex items-center justify-center">
        <Inbox className="h-6 w-6 text-foreground/60" />
      </div>
      <h3 className="font-display text-2xl leading-tight">{title}</h3>
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {isRtl ? "— لا توجد إشارة في النطاق —" : "— no signal in range —"}
      </p>
    </div>
  );
}
