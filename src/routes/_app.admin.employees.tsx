import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Star,
  ShieldCheck,
  MailCheck,
  MailWarning,
  Send,
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Search,
  ArrowUpRight,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  adminSetUserActive,
} from "@/lib/api/admin-users.functions";

export const Route = createFileRoute("/_app/admin/employees")({ component: AdminEmployees });

type ProviderRow = {
  id: string;
  user_id: string;
  city: string | null;
  is_verified: boolean;
  is_available: boolean;
  avg_rating: number;
  total_reviews: number;
  years_experience: number | null;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
};

function isActive(banned_until: string | null) {
  if (!banned_until) return true;
  return new Date(banned_until).getTime() < Date.now();
}

const pad = (n: number, w = 3) => String(n).padStart(w, "0");

function StarMeter({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, value));
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => {
        const fillPct = Math.max(0, Math.min(1, v - i)) * 100;
        return (
          <span key={i} className="relative h-3 w-3">
            <Star className="absolute inset-0 h-3 w-3 text-foreground/15" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPct}%` }}>
              <Star className="h-3 w-3 fill-primary text-primary" />
            </span>
          </span>
        );
      })}
    </div>
  );
}

function AdminEmployees() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-providers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_providers");
      if (error) throw new Error(error.message);
      return (data ?? []) as ProviderRow[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-providers"] });

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "unverified" | "active" | "inactive">(
    "all",
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProviderRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    city: "",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const active = isActive(r.banned_until);
      const passFilter =
        filter === "all"
          ? true
          : filter === "verified"
          ? r.is_verified
          : filter === "unverified"
          ? !r.is_verified
          : filter === "active"
          ? active
          : !active;
      if (!passFilter) return false;
      if (!q) return true;
      return [r.full_name, r.email, r.phone, r.city].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      );
    });
  }, [rows, query, filter]);

  const counts = useMemo(() => {
    const c = { all: rows.length, verified: 0, unverified: 0, active: 0, inactive: 0, avg: 0 };
    let sum = 0;
    let n = 0;
    for (const r of rows) {
      if (r.is_verified) c.verified += 1;
      else c.unverified += 1;
      if (isActive(r.banned_until)) c.active += 1;
      else c.inactive += 1;
      if (r.avg_rating) {
        sum += Number(r.avg_rating);
        n += 1;
      }
    }
    c.avg = n ? sum / n : 0;
    return c;
  }, [rows]);

  const openAdd = () => {
    setEditing(null);
    setForm({ email: "", password: "", full_name: "", phone: "", city: "" });
    setOpen(true);
  };
  const openEdit = (r: ProviderRow) => {
    setEditing(r);
    setForm({
      email: r.email ?? "",
      password: "",
      full_name: r.full_name ?? "",
      phone: r.phone ?? "",
      city: r.city ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim()) return toast.error(t("full_name"));
    setSaving(true);
    try {
      if (editing) {
        await adminUpdateUser({
          data: {
            id: editing.user_id,
            full_name: form.full_name.trim(),
            phone: form.phone.trim(),
            city: form.city.trim(),
            role: "employee",
          },
        });
        if (form.city.trim() !== (editing.city ?? "")) {
          await supabase
            .from("employees")
            .update({ city: form.city.trim() || null })
            .eq("id", editing.id);
        }
        toast.success(t("user_updated"));
      } else {
        if (!form.email.trim()) return toast.error(t("email"));
        if (form.password.length < 6) return toast.error(t("six_digits"));
        await adminCreateUser({
          data: {
            email: form.email.trim(),
            password: form.password,
            full_name: form.full_name.trim(),
            phone: form.phone.trim(),
            city: form.city.trim(),
            role: "employee",
          },
        });
        toast.success(t("user_created"));
      }
      setOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const toggleVerify = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("employees")
      .update({ is_verified: !current })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(!current ? t("verified") : t("not_verified"));
    refresh();
  };

  const toggleActive = async (r: ProviderRow) => {
    const next = !isActive(r.banned_until);
    try {
      await adminSetUserActive({ data: { id: r.user_id, active: next } });
      toast.success(next ? t("user_activated") : t("user_deactivated"));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const row = rows.find((r) => r.id === deleteId);
    if (!row) return;
    try {
      await adminDeleteUser({ data: { id: row.user_id } });
      toast.success(t("user_deleted"));
      setDeleteId(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const resendConfirmation = async (row: ProviderRow) => {
    if (!row.email) return toast.error(t("no_email_on_file"));
    setResendingId(row.id);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: row.email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setResendingId(null);
    if (error) return toast.error(`${t("confirmation_resend_failed")}: ${error.message}`);
    toast.success(t("confirmation_resent"));
  };

  const filterChips: { key: typeof filter; label: string; count: number }[] = [
    { key: "all", label: t("filter_all"), count: counts.all },
    { key: "verified", label: t("verified"), count: counts.verified },
    { key: "unverified", label: t("not_verified"), count: counts.unverified },
    { key: "active", label: t("active"), count: counts.active },
    { key: "inactive", label: t("inactive"), count: counts.inactive },
  ];

  return (
    <div className="space-y-8 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-10 min-h-[calc(100vh-4rem)]">
      {/* ────────── MASTHEAD ────────── */}
      <header className="relative">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b-[3px] border-foreground pb-6">
          <div className="space-y-3 max-w-2xl">
            <h1 className="font-display text-5xl md:text-7xl leading-[0.92] tracking-tight">
              {t("manage_employees")}
            </h1>
          </div>

          <div className="flex items-end gap-6">
            <Button
              onClick={openAdd}
              className="h-12 rounded-none bg-foreground text-background font-mono-ui tracking-[0.22em] text-[11px] uppercase px-5 shadow-[6px_6px_0_0_var(--color-primary)] hover:shadow-[8px_8px_0_0_var(--color-primary)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[2px_2px_0_0_var(--color-primary)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <Plus className="h-4 w-4 me-2" />
              {t("add_provider")}
            </Button>
          </div>
        </div>

        {/* Stats with rating dial */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-px bg-foreground/15 border border-foreground/15">
          {[
            { l: t("verified"), v: pad(counts.verified, 3) },
            { l: t("not_verified"), v: pad(counts.unverified, 3) },
            { l: t("active"), v: pad(counts.active, 3) },
            { l: t("inactive"), v: pad(counts.inactive, 3) },
            { l: t("avg_rating"), v: counts.avg.toFixed(2) },
          ].map((s, i) => (
            <div key={i} className="bg-background px-4 py-3 flex items-baseline justify-between">
              <span className="label-mono text-foreground/60">{s.l}</span>
              <span className="font-mono-display text-2xl tabular-nums text-foreground">{s.v}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ────────── CONTROLS ────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="h-4 w-4 absolute top-1/2 -translate-y-1/2 start-3 opacity-60 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search_users_placeholder")}
            className="ps-9 h-11 rounded-none border-foreground/80 bg-background focus-visible:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[3px_3px_0_0_var(--color-primary)] transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 ms-auto">
          {filterChips.map((c) => {
            const on = filter === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`h-9 inline-flex items-center gap-2 border px-3 transition-all font-mono-ui tracking-wider text-[10px] uppercase ${
                  on
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground/70 border-foreground/20 hover:border-foreground"
                }`}
              >
                <span>{c.label}</span>
                <span className={`tabular-nums ${on ? "text-primary" : "text-foreground/40"}`}>
                  [{pad(c.count, 2)}]
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ────────── ROSTER CARDS ────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full border border-foreground/20 py-20 text-center label-mono text-foreground/60">
            <span className="inline-block animate-pulse">— {t("loading")} —</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full border-2 border-dashed border-foreground/20 py-20 text-center space-y-2">
            <div className="font-display text-3xl text-foreground/40">{t("no_data")}</div>
            <div className="label-mono text-foreground/40">ROSTER · EMPTY</div>
          </div>
        ) : (
          filtered.map((r, idx) => {
            const active = isActive(r.banned_until);
            const isSelf = r.user_id === user?.id;
            const confirmed = Boolean(r.email_confirmed_at);
            const initials = (r.full_name ?? "?")
              .trim()
              .split(/\s+/)
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <article
                key={r.id}
                className="group relative border border-foreground/90 bg-background flex flex-col transition-all hover:shadow-[6px_6px_0_0_var(--color-primary)] hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                {/* Top bar: index + verified */}
                <div className="flex items-stretch border-b border-foreground/20">
                  <div className="px-3 py-2 border-e border-foreground/20 font-mono-display text-xs tabular-nums text-foreground/50 flex items-center">
                    #{pad(idx + 1, 3)}
                  </div>
                  <div className="px-3 py-2 border-e border-foreground/20 label-mono text-foreground/60 flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${active ? "bg-primary" : "bg-destructive"}`}
                    />
                    {active ? t("active") : t("inactive")}
                  </div>
                  <div className="flex-1" />
                  {r.is_verified ? (
                    <div className="px-3 py-2 bg-primary text-primary-foreground label-mono inline-flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3" />
                      {t("verified")}
                    </div>
                  ) : (
                    <div className="px-3 py-2 label-mono text-foreground/50 inline-flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3 opacity-40" />
                      {t("not_verified")}
                    </div>
                  )}
                </div>

                {/* Identity block */}
                <div className="p-5 flex items-start gap-4">
                  <div className="h-14 w-14 shrink-0 bg-foreground text-primary flex items-center justify-center font-display text-xl">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-xl leading-tight truncate flex items-center gap-1.5">
                      {r.full_name ?? "—"}
                      {isSelf && (
                        <span className="label-mono text-[9px] text-primary bg-foreground px-1.5 py-0.5">
                          YOU
                        </span>
                      )}
                    </div>
                    <div dir="ltr" className="font-mono-ui text-xs text-foreground/70 truncate mt-0.5">
                      {r.email ?? "—"}
                    </div>
                    {!confirmed && (
                      <div className="mt-1 inline-flex items-center gap-1 label-mono text-amber-700 dark:text-amber-300">
                        <MailWarning className="h-3 w-3" />
                        {t("email_unconfirmed")}
                      </div>
                    )}
                    {confirmed && (
                      <div className="mt-1 inline-flex items-center gap-1 label-mono text-foreground/50">
                        <MailCheck className="h-3 w-3" />
                        {t("email_confirmed")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Meta strip */}
                <div className="px-5 pb-3 grid grid-cols-3 gap-3 text-sm">
                  <div className="space-y-0.5">
                    <div className="label-mono text-foreground/50">{t("city")}</div>
                    <div className="inline-flex items-center gap-1 truncate">
                      <MapPin className="h-3.5 w-3.5 text-foreground/40" />
                      <span className="truncate">{r.city ?? "—"}</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="label-mono text-foreground/50">{t("phone")}</div>
                    <div dir="ltr" className="font-mono-ui text-xs text-foreground/80 truncate">
                      {r.phone || "—"}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="label-mono text-foreground/50">{t("joined")}</div>
                    <div className="font-mono-ui text-xs text-foreground/80 truncate">
                      {new Date(r.created_at)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, ".")}
                    </div>
                  </div>
                </div>

                {/* Rating block */}
                <div className="mx-5 mb-4 mt-1 border-t border-foreground/15 pt-3 flex items-end justify-between">
                  <div className="space-y-1">
                    <div className="label-mono text-foreground/50">{t("avg_rating")}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono-display text-3xl tabular-nums leading-none">
                        {Number(r.avg_rating).toFixed(1)}
                      </span>
                      <span className="label-mono text-foreground/40 tabular-nums">
                        / 5.0 · ({r.total_reviews})
                      </span>
                    </div>
                  </div>
                  <StarMeter value={Number(r.avg_rating)} />
                </div>

                {/* Actions footer */}
                <div className="mt-auto flex items-stretch border-t border-foreground/15 divide-x divide-foreground/15 rtl:divide-x-reverse">
                  <button
                    onClick={() => toggleVerify(r.id, r.is_verified)}
                    className={`flex-1 px-2 py-2.5 label-mono inline-flex items-center justify-center gap-1.5 transition-colors ${
                      r.is_verified
                        ? "hover:bg-foreground/5 text-foreground/70"
                        : "bg-primary/20 hover:bg-primary/30 text-foreground"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {r.is_verified ? t("not_verified") : t("verify")}
                  </button>
                  {!confirmed && (
                    <button
                      onClick={() => resendConfirmation(r)}
                      disabled={!r.email || resendingId === r.id}
                      className="flex-1 px-2 py-2.5 label-mono inline-flex items-center justify-center gap-1.5 hover:bg-foreground/5 transition-colors disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {t("resend_confirmation")}
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(r)}
                    title={t("edit")}
                    className="px-3 py-2.5 hover:bg-foreground/5 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleActive(r)}
                    disabled={isSelf}
                    title={active ? t("deactivate") : t("activate")}
                    className="px-3 py-2.5 hover:bg-foreground/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {active ? (
                      <PowerOff className="h-3.5 w-3.5 text-destructive" />
                    ) : (
                      <Power className="h-3.5 w-3.5 text-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteId(r.id)}
                    disabled={isSelf}
                    title={t("delete")}
                    className="px-3 py-2.5 hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* ────────── DIALOG ────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-none border-2 border-foreground p-0 max-w-lg overflow-hidden">
          <div className="bg-foreground text-background px-6 py-4 border-b-2 border-foreground">
            <DialogHeader>
              <div className="label-mono text-primary mb-1">
                {editing ? "EDIT · PROVIDER" : "ENLIST · PROVIDER"}
              </div>
              <DialogTitle className="font-display text-3xl text-background leading-tight">
                {editing ? t("edit_user") : t("add_provider")}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-5">
            {!editing && (
              <div className="grid gap-4">
                <div>
                  <Label className="label-mono text-foreground/70 mb-2 block">{t("email")}</Label>
                  <Input
                    dir="ltr"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="rounded-none border-foreground/80 h-11 font-mono-ui focus-visible:ring-0 focus-visible:shadow-[3px_3px_0_0_var(--color-primary)] focus-visible:border-foreground"
                  />
                </div>
                <div>
                  <Label className="label-mono text-foreground/70 mb-2 block">{t("password")}</Label>
                  <Input
                    dir="ltr"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={t("six_digits")}
                    className="rounded-none border-foreground/80 h-11 font-mono-ui focus-visible:ring-0 focus-visible:shadow-[3px_3px_0_0_var(--color-primary)] focus-visible:border-foreground"
                  />
                </div>
              </div>
            )}
            <div>
              <Label className="label-mono text-foreground/70 mb-2 block">{t("full_name")}</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="rounded-none border-foreground/80 h-11 font-display text-base focus-visible:ring-0 focus-visible:shadow-[3px_3px_0_0_var(--color-primary)] focus-visible:border-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="label-mono text-foreground/70 mb-2 block">{t("phone")}</Label>
                <Input
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="rounded-none border-foreground/80 h-11 font-mono-ui focus-visible:ring-0 focus-visible:shadow-[3px_3px_0_0_var(--color-primary)] focus-visible:border-foreground"
                />
              </div>
              <div>
                <Label className="label-mono text-foreground/70 mb-2 block">{t("city")}</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="rounded-none border-foreground/80 h-11 focus-visible:ring-0 focus-visible:shadow-[3px_3px_0_0_var(--color-primary)] focus-visible:border-foreground"
                />
              </div>
            </div>
            <button onClick={save} disabled={saving} className="btn-stamp">
              {saving ? t("loading") : t("save")}
              <ArrowUpRight className="h-4 w-4 ms-2" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-none border-2 border-foreground">
          <AlertDialogHeader>
            <div className="label-mono text-destructive mb-1">DANGER · IRREVERSIBLE</div>
            <AlertDialogTitle className="font-display text-2xl">
              {t("confirm_delete")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("confirm_delete_user_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-foreground/40">{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono-ui tracking-widest text-xs uppercase"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
