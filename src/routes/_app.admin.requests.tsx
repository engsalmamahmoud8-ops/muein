import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowUpRight,
  Search,
  Filter,
  Radio,
  CircleDot,
  TimerReset,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock3,
} from "lucide-react";
import type { RequestStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/admin/requests")({ component: AdminRequests });

type Row = {
  id: string;
  title: string;
  description: string | null;
  status: RequestStatus;
  city: string | null;
  created_at: string;
  service_categories: { name_ar: string | null } | null;
};

const OPEN_SET: RequestStatus[] = ["pending", "applications_received"];
const ACTIVE_SET: RequestStatus[] = [
  "assigned", "on_the_way", "inspection_started", "quotation_provided",
  "customer_approved_quotation", "work_in_progress", "waiting_customer_response",
];
const CLOSED_SET: RequestStatus[] = ["completed", "cancelled", "disputed"];

type Bucket = "all" | "open" | "active" | "closed";

// Status -> visual "ink" treatment for the stamp.
const STAMP: Record<RequestStatus, { ink: string; ring: string; label: string }> = {
  pending:                       { ink: "text-zinc-700",   ring: "ring-zinc-400",   label: "PND" },
  applications_received:         { ink: "text-blue-700",   ring: "ring-blue-500",   label: "APL" },
  assigned:                      { ink: "text-indigo-700", ring: "ring-indigo-500", label: "ASN" },
  on_the_way:                    { ink: "text-cyan-700",   ring: "ring-cyan-500",   label: "OTW" },
  inspection_started:            { ink: "text-violet-700", ring: "ring-violet-500", label: "INS" },
  quotation_provided:            { ink: "text-amber-700",  ring: "ring-amber-500",  label: "QTE" },
  customer_approved_quotation:   { ink: "text-lime-700",   ring: "ring-lime-500",   label: "APR" },
  work_in_progress:              { ink: "text-orange-700", ring: "ring-orange-500", label: "WIP" },
  waiting_customer_response:     { ink: "text-yellow-700", ring: "ring-yellow-500", label: "WCR" },
  completed:                     { ink: "text-emerald-700",ring: "ring-emerald-500",label: "DON" },
  cancelled:                     { ink: "text-red-700",    ring: "ring-red-500",    label: "CXL" },
  disputed:                      { ink: "text-rose-700",   ring: "ring-rose-500",   label: "DSP" },
};

function classifyBucket(s: RequestStatus): Bucket {
  if (OPEN_SET.includes(s)) return "open";
  if (ACTIVE_SET.includes(s)) return "active";
  return "closed";
}

function fmtDate(d: string) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${day}`, time: `${hh}:${mm}` };
}

function shortId(id: string) {
  // 6-char compact id, e.g. "A7F-92C"
  const clean = id.replace(/-/g, "").toUpperCase();
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
}

function AdminRequests() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState<Bucket>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("service_requests")
        .select("id, title, description, status, city, created_at, service_categories(name_ar)")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const t24 = today.getTime();
    let open = 0, active = 0, closed = 0, today_count = 0;
    for (const r of rows) {
      const b = classifyBucket(r.status);
      if (b === "open") open++;
      else if (b === "active") active++;
      else closed++;
      if (new Date(r.created_at).getTime() >= t24) today_count++;
    }
    return { total: rows.length, open, active, closed, today: today_count };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      if (bucket !== "all" && classifyBucket(r.status) !== bucket) return false;
      if (!q) return true;
      return (
        r.title?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q) ||
        r.service_categories?.name_ar?.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [rows, query, bucket]);

  return (
    <div className="relative -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Page-scoped styles for the dispatch aesthetic */}
      <style>{`
        .dispatch-grain {
          background-color: var(--background);
          background-image:
            radial-gradient(circle at 25% -10%, color-mix(in oklab, var(--primary) 35%, transparent), transparent 45%),
            radial-gradient(circle at 110% 0%, color-mix(in oklab, var(--foreground) 8%, transparent), transparent 60%),
            repeating-linear-gradient(0deg, color-mix(in oklab, var(--foreground) 4%, transparent) 0 1px, transparent 1px 4px);
        }
        .caution-stripe {
          background-image: repeating-linear-gradient(
            45deg,
            var(--primary) 0 14px,
            var(--foreground) 14px 28px
          );
        }
        .ticker-tape {
          background-image: repeating-linear-gradient(
            90deg,
            transparent 0 22px,
            color-mix(in oklab, var(--foreground) 12%, transparent) 22px 23px
          );
        }
        .ink-stamp {
          position: relative;
          display: inline-block;
          font-family: var(--font-mono);
          letter-spacing: 0.18em;
          font-weight: 800;
          border: 2px solid currentColor;
          box-shadow: inset 0 0 0 1.5px currentColor;
          background: color-mix(in oklab, currentColor 6%, transparent);
          padding: 6px 10px 5px;
          border-radius: 4px;
          transform: rotate(-2.5deg);
          opacity: 0.92;
          text-shadow: 0 0 1px currentColor;
        }
        .ink-stamp::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 6px;
          background: radial-gradient(circle at 30% 40%, transparent 40%, color-mix(in oklab, var(--background) 70%, transparent) 70%);
          mix-blend-mode: screen;
          pointer-events: none;
        }
        .serial-num {
          font-family: var(--font-mono);
          font-feature-settings: "tnum" 1, "zero" 1;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .row-reveal {
          opacity: 0;
          transform: translateY(6px);
          animation: row-in 480ms cubic-bezier(.2,.7,.2,1) forwards;
        }
        @keyframes row-in {
          to { opacity: 1; transform: none; }
        }
        .pulse-dot {
          box-shadow: 0 0 0 0 color-mix(in oklab, var(--primary) 80%, transparent);
          animation: pulse-dot 1.6s ease-out infinite;
        }
        @keyframes pulse-dot {
          70% { box-shadow: 0 0 0 10px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        .scan-bar {
          background: linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 60%, transparent), transparent);
          animation: scan 1.8s linear infinite;
        }
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .display-heading {
          font-weight: 900;
          letter-spacing: -0.045em;
          line-height: 0.88;
          font-feature-settings: "ss01" 1;
        }
        .eyebrow {
          font-family: var(--font-mono);
          letter-spacing: 0.34em;
          font-weight: 700;
          text-transform: uppercase;
        }
        .micro {
          font-family: var(--font-mono);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-size: 10px;
          font-weight: 600;
        }
      `}</style>

      <div className="dispatch-grain absolute inset-0 -z-10" />

      {/* MASTHEAD */}
      <header className="relative">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b-[3px] border-foreground pb-6">
          <h1 className="font-display text-5xl md:text-7xl leading-[0.92] tracking-tight">
            {t("manage_requests")}
          </h1>
        </div>
      </header>

      {/* FILTER DOCK */}
      <section className="mt-6 border-2 border-foreground bg-card">
        <div className="flex items-center justify-between px-4 md:px-5 py-2.5 border-b-2 border-foreground/90 bg-foreground text-background">
          <div className="flex items-center gap-2 eyebrow text-[10px]">
            <Filter className="h-3.5 w-3.5" />
            FILTER RIBBON
          </div>
        </div>

        <div className="p-4 md:p-5 flex flex-col lg:flex-row gap-3 lg:items-center">
          {/* status chips */}
          <div className="flex flex-wrap gap-0 border-2 border-foreground">
            {([
              ["all",    t("filter_all"),       CircleDot,    rows.length],
              ["open",   t("active"),           Radio,        stats.open],
              ["active", "ON FLOOR",            TimerReset,   stats.active],
              ["closed", t("filter_completed"), CheckCircle2, stats.closed],
            ] as const).map(([key, label, Icon, count]) => {
              const on = bucket === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBucket(key)}
                  className={`group flex items-center gap-2 px-3.5 py-2 border-e-2 border-foreground last:border-e-0 micro transition-colors ${
                    on ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                  <span
                    className={`serial-num text-[11px] px-1.5 py-0.5 rounded-sm ${
                      on ? "bg-foreground/15 text-primary-foreground" : "bg-foreground/8 text-foreground/70"
                    }`}
                  >
                    {String(count).padStart(2, "0")}
                  </span>
                </button>
              );
            })}
          </div>

          {/* search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/50" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SEARCH · TITLE · CITY · CATEGORY · ID"
              className="h-10 ps-9 pe-3 rounded-none border-2 border-foreground bg-background font-mono text-[12px] tracking-[0.12em] uppercase placeholder:text-foreground/35 focus-visible:ring-0 focus-visible:border-foreground focus-visible:bg-primary/10"
            />
          </div>
        </div>

        {/* loading scan-bar */}
        {loading && (
          <div className="relative h-1 bg-foreground/10 overflow-hidden">
            <div className="absolute inset-y-0 w-1/3 scan-bar" />
          </div>
        )}
      </section>

      {/* REGISTER */}
      <section className="mt-6 border-2 border-foreground bg-card">
        {/* header strip */}
        <div className="grid grid-cols-[110px_1fr_140px_80px] md:grid-cols-[140px_1fr_180px_100px] gap-0 bg-foreground text-background ticker-tape">
          <div className="px-4 py-2.5 micro">№ · SERIAL</div>
          <div className="px-4 py-2.5 micro">SUBJECT · CATEGORY · METADATA</div>
          <div className="px-4 py-2.5 micro hidden md:block">STATUS · STAMP</div>
          <div className="md:hidden px-4 py-2.5 micro">STAT</div>
          <div className="px-4 py-2.5 micro text-end">ACTION</div>
        </div>

        {/* body */}
        <div className="divide-y-2 divide-foreground/90">
          {loading ? (
            <SkeletonRows />
          ) : filtered.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            filtered.map((r, idx) => {
              const stamp = STAMP[r.status];
              const meta = fmtDate(r.created_at);
              const category = r.service_categories?.name_ar ?? "—";
              const serial = String(rows.length - rows.findIndex(x => x.id === r.id)).padStart(4, "0");
              return (
                <article
                  key={r.id}
                  className="row-reveal group relative grid grid-cols-[110px_1fr_140px_80px] md:grid-cols-[140px_1fr_180px_100px] items-center hover:bg-primary/8 transition-colors"
                  style={{ animationDelay: `${Math.min(idx, 18) * 28}ms` }}
                >
                  {/* serial */}
                  <div className="px-4 py-4 md:py-5 self-stretch border-e border-foreground/15 bg-secondary/50">
                    <div className="micro text-foreground/50">№</div>
                    <div className="serial-num text-lg md:text-2xl text-foreground">{serial}</div>
                    <div className="micro text-foreground/40 mt-1">{shortId(r.id)}</div>
                  </div>

                  {/* subject */}
                  <div className="px-4 py-4 md:py-5 min-w-0">
                    <div className="flex items-start gap-3">
                      <span className="micro text-foreground/40 mt-1 hidden md:inline">SUBJ.</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base md:text-lg leading-snug truncate">
                          {r.title}
                        </h3>
                        {r.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {r.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 micro text-foreground/55">
                          <span className="inline-flex items-center gap-1">
                            <span className="inline-block h-1.5 w-1.5 bg-primary rounded-full" />
                            {category}
                          </span>
                          <span className="opacity-30">·</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {r.city ?? "UNDISCLOSED"}
                          </span>
                          <span className="opacity-30">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />
                            <span className="tabular-nums">{meta.date}</span>
                            <span className="opacity-50">·</span>
                            <span className="tabular-nums">{meta.time}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* status stamp */}
                  <div className="px-4 py-4 md:py-5 flex md:justify-center">
                    <div className="relative inline-block">
                      <span className={`ink-stamp inline-block text-[11px] ${stamp.ink} ${stamp.ring}`}>
                        {stamp.label}
                      </span>
                      <div className={`mt-1 micro text-foreground/45 hidden md:block`}>
                        {t(`status_${r.status}` as never)}
                      </div>
                    </div>
                  </div>

                  {/* action */}
                  <div className="px-3 py-4 md:py-5 flex justify-end self-stretch border-s border-foreground/15">
                    <Button
                      asChild
                      size="sm"
                      className="rounded-none h-10 px-3 bg-foreground text-background hover:bg-primary hover:text-primary-foreground gap-2 group/btn"
                    >
                      <Link to="/customer/requests/$id" params={{ id: r.id }}>
                        <span className="micro">OPEN</span>
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                      </Link>
                    </Button>
                  </div>

                  {/* hover left rail */}
                  <span className="absolute inset-y-0 start-0 w-[3px] bg-primary scale-y-0 group-hover:scale-y-100 origin-top transition-transform" />
                </article>
              );
            })
          )}
        </div>

        {/* footer log strip */}
        <footer className="bg-foreground text-background px-4 md:px-5 py-2.5 flex items-center justify-between micro">
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary pulse-dot" />
            DISPATCH LOG · LIVE FEED · CH-04
          </span>
          <span className="opacity-70 tabular-nums">
            END OF REGISTER · {String(filtered.length).padStart(4, "0")} ENTRIES
          </span>
        </footer>
      </section>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="divide-y-2 divide-foreground/10">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[140px_1fr_180px_100px] items-center px-0"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="px-4 py-5 bg-secondary/40">
            <div className="h-3 w-8 bg-foreground/10" />
            <div className="h-6 w-20 mt-2 bg-foreground/10" />
          </div>
          <div className="px-4 py-5 space-y-2">
            <div className="h-4 w-2/3 bg-foreground/10" />
            <div className="h-3 w-1/2 bg-foreground/8" />
            <div className="h-2.5 w-1/3 bg-foreground/8" />
          </div>
          <div className="px-4 py-5">
            <div className="h-7 w-14 bg-foreground/10 -rotate-2" />
          </div>
          <div className="px-4 py-5">
            <div className="h-9 w-20 ms-auto bg-foreground/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="relative px-6 py-16 md:py-20 text-center">
      <div className="caution-stripe absolute inset-x-0 top-0 h-1.5 opacity-80" />
      <div className="inline-flex flex-col items-center gap-4">
        <span className="ink-stamp inline-block text-[12px] text-foreground ring-foreground">
          NO ENTRIES
        </span>
        <h3 className="display-heading text-2xl md:text-3xl">
          {query ? "NO MATCH ON RECORD" : "REGISTER STANDS CLEAR"}
        </h3>
        <p className="micro text-foreground/55 max-w-md">
          {query
            ? `“${query}” returned zero entries. Adjust filters or clear the ribbon to re-open the register.`
            : "AWAITING INCOMING DISPATCH · CHANNEL OPEN · STAND BY"}
        </p>
        <div className="mt-2 flex items-center gap-2 micro text-foreground/40">
          <XCircle className="h-3.5 w-3.5" />
          END OF DOSSIER
        </div>
      </div>
      <div className="caution-stripe absolute inset-x-0 bottom-0 h-1.5 opacity-80" />
    </div>
  );
}
