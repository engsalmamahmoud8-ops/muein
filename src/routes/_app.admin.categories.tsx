import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import * as LucideIcons from "lucide-react";
import { Plus, Trash2, Tag, Pencil, ChevronDown, Search, ArrowUpRight, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/categories")({ component: AdminCategories });

type LucideIcon = LucideIcons.LucideIcon;
type CategoryRow = {
  id: string;
  name_ar: string;
  name_en: string;
  name_tr: string | null;
  description_ar: string | null;
  description_en: string | null;
  description_tr: string | null;
  icon: string | null;
};

const ICON_ENTRIES: [string, LucideIcon][] = Object.entries(LucideIcons)
  .filter(
    ([name, comp]) =>
      /^[A-Z]/.test(name) &&
      !name.endsWith("Icon") &&
      name !== "LucideIcon" &&
      name !== "Icon" &&
      name !== "createLucideIcon" &&
      typeof comp === "object",
  ) as [string, LucideIcon][];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(ICON_ENTRIES);

const pascalToKebab = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
const kebabToPascal = (s: string) =>
  s
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Tag;
  return ICON_MAP[name] ?? ICON_MAP[kebabToPascal(name)] ?? Tag;
}

const pad = (n: number, w = 3) => String(n).padStart(w, "0");

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const SelectedIcon = resolveIcon(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_ENTRIES.slice(0, 300);
    return ICON_ENTRIES.filter(
      ([name]) => name.toLowerCase().includes(q) || pascalToKebab(name).includes(q),
    ).slice(0, 300);
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full inline-flex items-center justify-between gap-3 rounded-none border border-foreground/80 bg-background px-3 h-11 hover:shadow-[3px_3px_0_0_var(--color-primary)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="h-7 w-7 shrink-0 bg-foreground text-primary flex items-center justify-center">
              <SelectedIcon className="h-4 w-4" />
            </span>
            <span className="font-mono-ui text-xs text-foreground/80 truncate">
              {value || t("select_icon")}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-none border-2 border-foreground" align="start">
        <div className="flex items-center gap-2 border-b-2 border-foreground bg-foreground text-background px-3 py-2">
          <Search className="h-4 w-4" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search_icon")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-background/40 font-mono-ui"
          />
          <span className="label-mono text-primary tabular-nums">[{pad(filtered.length, 3)}]</span>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-8 text-center label-mono text-foreground/40">{t("no_icon_found")}</p>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {filtered.map(([name, Icon]) => {
                const kebab = pascalToKebab(name);
                const isSelected = value === kebab || value === name;
                return (
                  <button
                    key={name}
                    type="button"
                    title={kebab}
                    onClick={() => {
                      onChange(kebab);
                      setOpen(false);
                    }}
                    className={`flex h-9 w-9 items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-foreground text-primary"
                        : "hover:bg-primary hover:text-primary-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AdminCategories() {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameTr, setNameTr] = useState("");
  const [descAr, setDescAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descTr, setDescTr] = useState("");
  const [icon, setIcon] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("service_categories").select("*").order("name_ar");
    setRows((data as CategoryRow[]) ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setNameAr("");
    setNameEn("");
    setNameTr("");
    setDescAr("");
    setDescEn("");
    setDescTr("");
    setIcon("");
  };

  const openAdd = () => {
    resetForm();
    setOpen(true);
  };
  const openEdit = (c: CategoryRow) => {
    setEditingId(c.id);
    setNameAr(c.name_ar ?? "");
    setNameEn(c.name_en ?? "");
    setNameTr(c.name_tr ?? "");
    setDescAr(c.description_ar ?? "");
    setDescEn(c.description_en ?? "");
    setDescTr(c.description_tr ?? "");
    setIcon(c.icon ?? "");
    setOpen(true);
  };

  const save = async () => {
    const ar = nameAr.trim(),
      en = nameEn.trim(),
      tr = nameTr.trim();
    const dAr = descAr.trim(),
      dEn = descEn.trim(),
      dTr = descTr.trim();
    if (!ar || !en) {
      toast.error(t("category_name"));
      return;
    }
    const payload = {
      name_ar: ar,
      name_en: en,
      name_tr: tr || null,
      description_ar: dAr || null,
      description_en: dEn || null,
      description_tr: dTr || null,
      icon: icon || null,
    };
    const { error } = editingId
      ? await supabase.from("service_categories").update(payload).eq("id", editingId)
      : await supabase.from("service_categories").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(t("save"));
    setOpen(false);
    resetForm();
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("service_categories").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    toast.success(t("delete"));
    setDeleteId(null);
    load();
  };

  const displayName = (c: CategoryRow) =>
    (lang === "en" ? c.name_en : lang === "tr" ? c.name_tr : c.name_ar) || c.name_ar || c.name_en;
  const displayDesc = (c: CategoryRow) =>
    (lang === "en" ? c.description_en : lang === "tr" ? c.description_tr : c.description_ar) ?? "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) =>
      [c.name_ar, c.name_en, c.name_tr, c.icon].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [rows, query]);

  return (
    <div className="space-y-8 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-10 min-h-[calc(100vh-4rem)]">
      {/* ────────── MASTHEAD ────────── */}
      <header className="relative">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b-[3px] border-foreground pb-6">
          <div className="space-y-3 max-w-2xl">
            <h1 className="font-display text-5xl md:text-7xl leading-[0.92] tracking-tight">
              {t("manage_categories")}
            </h1>
          </div>

          <div className="flex items-end gap-6">
            <Button
              onClick={openAdd}
              className="h-12 rounded-none bg-foreground text-background font-mono-ui tracking-[0.22em] text-[11px] uppercase px-5 shadow-[6px_6px_0_0_var(--color-primary)] hover:shadow-[8px_8px_0_0_var(--color-primary)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[2px_2px_0_0_var(--color-primary)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <Plus className="h-4 w-4 me-2" />
              {t("add_category")}
            </Button>
          </div>
        </div>

      </header>

      {/* ────────── SEARCH ────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="h-4 w-4 absolute top-1/2 -translate-y-1/2 start-3 opacity-60 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search_icon")}
            className="ps-9 h-11 rounded-none border-foreground/80 bg-background focus-visible:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[3px_3px_0_0_var(--color-primary)] transition-all"
          />
        </div>
      </div>

      {/* ────────── CATALOGUE GRID ────────── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-foreground/20 py-20 text-center space-y-2">
            <div className="font-display text-3xl text-foreground/40">{t("no_data")}</div>
            <div className="label-mono text-foreground/40">CATALOGUE · EMPTY</div>
          </div>
        )}
        {filtered.map((c, idx) => {
          const Icon = resolveIcon(c.icon);
          const langCount = [c.name_ar, c.name_en, c.name_tr].filter(Boolean).length;
          return (
            <article
              key={c.id}
              className="group relative border border-foreground/90 bg-background flex flex-col transition-all hover:shadow-[6px_6px_0_0_var(--color-primary)] hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              {/* Top index strip */}
              <div className="flex items-center justify-between border-b border-foreground/20 px-3 py-1.5 label-mono text-foreground/50">
                <span className="tabular-nums">№ {pad(idx + 1, 3)}</span>
                <span className="tabular-nums">{langCount}/3 LANG</span>
              </div>

              {/* Hero icon panel */}
              <div className="relative aspect-[5/3] overflow-hidden">
                <div className="absolute inset-0 panel-yellow" />
                <div className="absolute inset-0 panel-stripes" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <span className="absolute -inset-3 border border-foreground/30" />
                    <span className="absolute -inset-3 translate-x-1.5 translate-y-1.5 border border-foreground/15" />
                    <Icon className="relative h-14 w-14 text-foreground" strokeWidth={1.6} />
                  </div>
                </div>
                <div className="absolute bottom-1.5 start-2 label-mono text-foreground/60 max-w-[70%] truncate">
                  {c.icon ?? "untagged"}
                </div>
              </div>

              {/* Info block */}
              <div className="p-4 space-y-3 flex-1">
                <h2 className="font-display text-xl leading-tight line-clamp-2">
                  {displayName(c)}
                </h2>
                {displayDesc(c) ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">{displayDesc(c)}</p>
                ) : (
                  <p className="label-mono text-foreground/30">NO · DESCRIPTION</p>
                )}

                {/* Language micro pills */}
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  {[
                    { code: "AR", name: c.name_ar },
                    { code: "EN", name: c.name_en },
                    { code: "TR", name: c.name_tr },
                  ].map((p) => (
                    <span
                      key={p.code}
                      className={`label-mono px-1.5 py-0.5 border ${
                        p.name
                          ? "border-foreground/30 text-foreground/70"
                          : "border-foreground/10 text-foreground/30"
                      }`}
                    >
                      {p.code}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-stretch border-t border-foreground/15 divide-x divide-foreground/15 rtl:divide-x-reverse">
                <button
                  onClick={() => openEdit(c)}
                  className="flex-1 px-2 py-2.5 label-mono inline-flex items-center justify-center gap-1.5 hover:bg-foreground/5 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("edit")}
                </button>
                <button
                  onClick={() => setDeleteId(c.id)}
                  className="px-4 py-2.5 label-mono inline-flex items-center justify-center gap-1.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("delete")}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {/* ────────── DIALOG: CREATE / EDIT ────────── */}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="rounded-none border-2 border-foreground p-0 max-w-2xl overflow-hidden">
          <div className="bg-foreground text-background px-6 py-4 border-b-2 border-foreground flex items-start justify-between gap-4">
            <DialogHeader className="text-start">
              <div className="label-mono text-primary mb-1">
                {editingId ? "REVISE · ENTRY" : "NEW · CATALOGUE · ENTRY"}
              </div>
              <DialogTitle className="font-display text-3xl text-background leading-tight">
                {editingId ? t("edit_category") : t("add_category")}
              </DialogTitle>
            </DialogHeader>
            <button
              onClick={() => setOpen(false)}
              className="h-8 w-8 inline-flex items-center justify-center border border-background/40 hover:bg-background/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-[1fr_220px] gap-0 max-h-[78vh] overflow-y-auto">
            <div className="p-6 space-y-5 md:border-e border-foreground/15">
              <div>
                <Label className="label-mono text-foreground/70 mb-2 block">
                  {t("category_name")}
                </Label>
                <Tabs defaultValue={lang}>
                  <TabsList className="rounded-none bg-background p-0 h-auto border border-foreground/80 gap-px">
                    <TabsTrigger
                      value="ar"
                      className="rounded-none data-[state=active]:bg-foreground data-[state=active]:text-background label-mono py-2"
                    >
                      AR
                    </TabsTrigger>
                    <TabsTrigger
                      value="en"
                      className="rounded-none data-[state=active]:bg-foreground data-[state=active]:text-background label-mono py-2"
                    >
                      EN
                    </TabsTrigger>
                    <TabsTrigger
                      value="tr"
                      className="rounded-none data-[state=active]:bg-foreground data-[state=active]:text-background label-mono py-2"
                    >
                      TR
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="ar" className="mt-2">
                    <Input
                      dir="rtl"
                      value={nameAr}
                      onChange={(e) => setNameAr(e.target.value)}
                      placeholder={t("category_name_ar")}
                      className="rounded-none border-foreground/80 h-11 font-display text-base focus-visible:ring-0 focus-visible:shadow-[3px_3px_0_0_var(--color-primary)] focus-visible:border-foreground"
                    />
                  </TabsContent>
                  <TabsContent value="en" className="mt-2">
                    <Input
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      placeholder={t("category_name_en")}
                      className="rounded-none border-foreground/80 h-11 font-display text-base focus-visible:ring-0 focus-visible:shadow-[3px_3px_0_0_var(--color-primary)] focus-visible:border-foreground"
                    />
                  </TabsContent>
                  <TabsContent value="tr" className="mt-2">
                    <Input
                      value={nameTr}
                      onChange={(e) => setNameTr(e.target.value)}
                      placeholder={t("category_name_tr")}
                      className="rounded-none border-foreground/80 h-11 font-display text-base focus-visible:ring-0 focus-visible:shadow-[3px_3px_0_0_var(--color-primary)] focus-visible:border-foreground"
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <div>
                <Label className="label-mono text-foreground/70 mb-2 block">
                  {t("category_description")}
                </Label>
                <Tabs defaultValue={lang}>
                  <TabsList className="rounded-none bg-background p-0 h-auto border border-foreground/80 gap-px">
                    <TabsTrigger
                      value="ar"
                      className="rounded-none data-[state=active]:bg-foreground data-[state=active]:text-background label-mono py-2"
                    >
                      AR
                    </TabsTrigger>
                    <TabsTrigger
                      value="en"
                      className="rounded-none data-[state=active]:bg-foreground data-[state=active]:text-background label-mono py-2"
                    >
                      EN
                    </TabsTrigger>
                    <TabsTrigger
                      value="tr"
                      className="rounded-none data-[state=active]:bg-foreground data-[state=active]:text-background label-mono py-2"
                    >
                      TR
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="ar" className="mt-2">
                    <Textarea
                      dir="rtl"
                      value={descAr}
                      onChange={(e) => setDescAr(e.target.value)}
                      placeholder={t("category_description_ar")}
                      rows={3}
                      className="rounded-none border-foreground/80 focus-visible:ring-0 focus-visible:shadow-[3px_3px_0_0_var(--color-primary)] focus-visible:border-foreground"
                    />
                  </TabsContent>
                  <TabsContent value="en" className="mt-2">
                    <Textarea
                      value={descEn}
                      onChange={(e) => setDescEn(e.target.value)}
                      placeholder={t("category_description_en")}
                      rows={3}
                      className="rounded-none border-foreground/80 focus-visible:ring-0 focus-visible:shadow-[3px_3px_0_0_var(--color-primary)] focus-visible:border-foreground"
                    />
                  </TabsContent>
                  <TabsContent value="tr" className="mt-2">
                    <Textarea
                      value={descTr}
                      onChange={(e) => setDescTr(e.target.value)}
                      placeholder={t("category_description_tr")}
                      rows={3}
                      className="rounded-none border-foreground/80 focus-visible:ring-0 focus-visible:shadow-[3px_3px_0_0_var(--color-primary)] focus-visible:border-foreground"
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <div>
                <Label className="label-mono text-foreground/70 mb-2 block">
                  {t("category_icon")}
                </Label>
                <IconPicker value={icon} onChange={setIcon} />
              </div>

              <button onClick={save} className="btn-stamp">
                {t("save")}
                <ArrowUpRight className="h-4 w-4 ms-2" />
              </button>
            </div>

            {/* Preview rail */}
            <div className="hidden md:flex flex-col bg-foreground/[0.03]">
              <div className="px-4 py-3 border-b border-foreground/15 label-mono text-foreground/60">
                PREVIEW
              </div>
              <div className="p-4">
                <div className="border border-foreground/90 bg-background">
                  <div className="relative aspect-[5/3] overflow-hidden">
                    <div className="absolute inset-0 panel-yellow" />
                    <div className="absolute inset-0 panel-stripes" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      {(() => {
                        const Preview = resolveIcon(icon);
                        return <Preview className="h-12 w-12" strokeWidth={1.6} />;
                      })()}
                    </div>
                    <div className="absolute bottom-1.5 start-2 label-mono text-foreground/60 max-w-[70%] truncate">
                      {icon || "untagged"}
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="font-display text-base leading-tight line-clamp-2">
                      {(lang === "en" ? nameEn : lang === "tr" ? nameTr : nameAr) ||
                        nameAr ||
                        nameEn ||
                        t("category_name")}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {(lang === "en" ? descEn : lang === "tr" ? descTr : descAr) || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <AlertDialogContent className="rounded-none border-2 border-foreground">
          <AlertDialogHeader>
            <div className="label-mono text-destructive mb-1">DANGER · IRREVERSIBLE</div>
            <AlertDialogTitle className="font-display text-2xl">
              {t("confirm_delete")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("confirm_delete_category_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-foreground/40">
              {t("cancel")}
            </AlertDialogCancel>
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
