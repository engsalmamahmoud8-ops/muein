import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Power, PowerOff, ArrowUpRight, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  adminSetUserActive,
} from "@/lib/api/admin-users.functions";

export const Route = createFileRoute("/_app/admin/users")({ component: AdminUsers });

type Role = "customer" | "employee" | "admin";
type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  role: Role;
  banned_until: string | null;
  created_at: string;
};

function initialsFrom(name: string | null, email: string | null) {
  const src = (name && name.trim()) || (email ?? "");
  if (!src) return "—";
  const parts = src.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || src[0]!.toUpperCase();
}

function isActive(u: UserRow) {
  if (!u.banned_until) return true;
  return new Date(u.banned_until).getTime() < Date.now();
}

const pad = (n: number, w = 3) => String(n).padStart(w, "0");

function AdminUsers() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await adminListUsers()) as UserRow[],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    city: "",
    role: "customer" as Role,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesRole = roleFilter === "all" ? true : r.role === roleFilter;
      if (!matchesRole) return false;
      if (!q) return true;
      return [r.full_name, r.email, r.phone].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [rows, query, roleFilter]);

  const counts = useMemo(() => {
    const c = { all: rows.length, customer: 0, employee: 0, admin: 0, active: 0, inactive: 0 };
    for (const r of rows) {
      c[r.role] += 1;
      if (isActive(r)) c.active += 1;
      else c.inactive += 1;
    }
    return c;
  }, [rows]);

  const openAdd = () => {
    setEditing(null);
    setForm({ email: "", password: "", full_name: "", phone: "", city: "", role: "customer" });
    setOpen(true);
  };
  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({
      email: u.email ?? "",
      password: "",
      full_name: u.full_name ?? "",
      phone: u.phone ?? "",
      city: u.city ?? "",
      role: u.role,
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
            id: editing.id,
            full_name: form.full_name.trim(),
            phone: form.phone.trim(),
            city: form.city.trim(),
            role: form.role,
          },
        });
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
            role: form.role,
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

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await adminDeleteUser({ data: { id: deleteId } });
      toast.success(t("user_deleted"));
      setDeleteId(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const toggleActive = async (u: UserRow) => {
    const next = !isActive(u);
    try {
      await adminSetUserActive({ data: { id: u.id, active: next } });
      toast.success(next ? t("user_activated") : t("user_deactivated"));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const roleChips: { key: "all" | Role; label: string; count: number }[] = [
    { key: "all", label: t("filter_all"), count: counts.all },
    { key: "customer", label: t("customer"), count: counts.customer },
    { key: "employee", label: t("employee"), count: counts.employee },
    { key: "admin", label: t("admin"), count: counts.admin },
  ];

  return (
    <div className="space-y-8 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-10 min-h-[calc(100vh-4rem)]">
      {/* ────────── MASTHEAD ────────── */}
      <header className="relative">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b-[3px] border-foreground pb-6">
          <div className="space-y-3 max-w-2xl">
            <h1 className="font-display text-5xl md:text-7xl leading-[0.92] tracking-tight">
              {t("manage_users")}
            </h1>
          </div>

          <div className="flex items-end gap-6">
            <Button
              onClick={openAdd}
              className="h-12 rounded-none bg-foreground text-background font-mono-ui tracking-[0.22em] text-[11px] uppercase px-5 shadow-[6px_6px_0_0_var(--color-primary)] hover:shadow-[8px_8px_0_0_var(--color-primary)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[2px_2px_0_0_var(--color-primary)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <Plus className="h-4 w-4 me-2" />
              {t("add_user")}
            </Button>
          </div>
        </div>

        {/* Stat strip */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-px bg-foreground/15 border border-foreground/15">
          {[
            { l: t("active"), v: counts.active, accent: true },
            { l: t("inactive"), v: counts.inactive },
            { l: t("customer"), v: counts.customer },
            { l: t("admin"), v: counts.admin },
          ].map((s, i) => (
            <div key={i} className="bg-background px-4 py-3 flex items-baseline justify-between">
              <span className="label-mono text-foreground/60">{s.l}</span>
              <span className={`font-mono-display text-2xl tabular-nums ${s.accent ? "text-foreground" : "text-foreground/80"}`}>
                {pad(s.v, 3)}
              </span>
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
          {roleChips.map((c) => {
            const on = roleFilter === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setRoleFilter(c.key)}
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
            <div className="label-mono text-foreground/40">REGISTRY · EMPTY</div>
          </div>
        ) : (
          filtered.map((r, idx) => {
            const active = isActive(r);
            const isSelf = r.id === user?.id;
            return (
              <article
                key={r.id}
                className="group relative border border-foreground/90 bg-background flex flex-col transition-all hover:shadow-[6px_6px_0_0_var(--color-primary)] hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                {/* Top bar: index + status + role */}
                <div className="flex items-stretch border-b border-foreground/20">
                  <div className="px-3 py-2 border-e border-foreground/20 font-mono-display text-xs tabular-nums text-foreground/50 flex items-center">
                    #{pad(idx + 1, 3)}
                  </div>
                  <div className="px-3 py-2 border-e border-foreground/20 label-mono text-foreground/60 flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-primary" : "bg-destructive"}`} />
                    {active ? t("active") : t("inactive")}
                  </div>
                  <div className="flex-1" />
                  <div
                    className={`px-3 py-2 label-mono inline-flex items-center gap-1.5 ${
                      r.role === "admin"
                        ? "bg-foreground text-primary"
                        : r.role === "employee"
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/60"
                    }`}
                  >
                    {t(r.role)}
                  </div>
                </div>

                {/* Identity block */}
                <div className="p-5 flex items-start gap-4">
                  <Avatar className="h-14 w-14 rounded-none ring-1 ring-foreground/15 shrink-0">
                    <AvatarImage src={r.avatar_url || undefined} alt="" className="object-cover" />
                    <AvatarFallback className="rounded-none bg-foreground text-primary text-xl font-display tracking-tight">
                      {initialsFrom(r.full_name, r.email)}
                    </AvatarFallback>
                  </Avatar>
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
                    <div className="label-mono text-[10px] text-foreground/40 mt-1">
                      ID · {r.id.slice(0, 8)}
                    </div>
                  </div>
                </div>

                {/* Meta strip */}
                <div className="px-5 pb-5 grid grid-cols-3 gap-3 text-sm">
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
                      {new Date(r.created_at).toLocaleDateString("en-GB").replace(/\//g, ".")}
                    </div>
                  </div>
                </div>

                {/* Actions footer */}
                <div className="mt-auto flex items-stretch border-t border-foreground/15 divide-x divide-foreground/15 rtl:divide-x-reverse">
                  <button
                    onClick={() => openEdit(r)}
                    title={t("edit")}
                    className="flex-1 px-3 py-2.5 label-mono inline-flex items-center justify-center gap-1.5 hover:bg-foreground/5 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("edit")}
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

      {/* ────────── DIALOG: CREATE / EDIT ────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-none border-2 border-foreground p-0 max-w-lg overflow-hidden">
          <div className="bg-foreground text-background px-6 py-4 border-b-2 border-foreground">
            <DialogHeader>
              <div className="label-mono text-primary mb-1">
                {editing ? "EDIT · ENTRY" : "NEW · ENTRY"}
              </div>
              <DialogTitle className="font-display text-3xl text-background leading-tight">
                {editing ? t("edit_user") : t("add_user")}
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
            <div>
              <Label className="label-mono text-foreground/70 mb-2 block">{t("role")}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger className="rounded-none border-foreground/80 h-11 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-foreground">
                  <SelectItem value="customer">{t("customer")}</SelectItem>
                  <SelectItem value="employee">{t("employee")}</SelectItem>
                  <SelectItem value="admin">{t("admin")}</SelectItem>
                </SelectContent>
              </Select>
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
