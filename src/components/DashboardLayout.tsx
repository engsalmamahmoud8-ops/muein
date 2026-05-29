import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useI18n, type Lang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Home, ListChecks, PlusCircle, User, LogOut, Globe, Bell, Menu, PanelLeft, Sun, Moon,
  Briefcase, MapPin, Star, Users as UsersIcon, Tag, Settings as SettingsIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCookie, setCookie } from "@/lib/cookies";
import { refreshEmployeeLocation } from "@/lib/geo";
import { Badge } from "@/components/ui/badge";
import logoSrc from "@/assets/ymnak-logo.jpg";
import { useBranding } from "@/lib/branding";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { siteName, logoUrl } = useBranding();
  const { user, role, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const nav = useNavigate();
  const path = useRouterState({ select: s => s.location.pathname });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unread, setUnread] = useState(0);
  type NotifRow = { id: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string };
  const [recents, setRecents] = useState<NotifRow[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null }>({ full_name: null, avatar_url: null });

  useEffect(() => {
    const stored = typeof window !== "undefined" && getCookie("sidebar_collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") setCookie("sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (!user) { setUnread(0); setRecents([]); return; }
    const load = async () => {
      const [{ count }, { data }] = await Promise.all([
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("is_read", false),
        supabase.from("notifications").select("id, title, body, link, is_read, created_at").order("created_at", { ascending: false }).limit(10),
      ]);
      setUnread(count ?? 0);
      setRecents((data ?? []) as NotifRow[]);
    };
    load();
    const ch = supabase.channel("notif").on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setUnread(0);
    setRecents(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const openNotification = async (n: NotifRow) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setUnread(u => Math.max(0, u - 1));
      setRecents(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (n.link) nav({ to: n.link as never });
  };

  useEffect(() => {
    if (!user) { setProfile({ full_name: null, avatar_url: null }); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle();
      if (cancelled) return;
      setProfile({
        full_name: data?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? null,
        avatar_url: data?.avatar_url ?? null,
      });
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user || role !== "employee") return;
    let cancelled = false;
    (async () => {
      const { data: emp } = await supabase.from("employees").select("id").eq("user_id", user.id).maybeSingle();
      if (cancelled || !emp) return;
      await refreshEmployeeLocation(emp.id);
    })();
    return () => { cancelled = true; };
  }, [user, role]);

  const customerItems: Item[] = [
    { to: "/customer/dashboard", label: t("dashboard"), icon: Home },
    { to: "/customer/requests", label: t("my_requests"), icon: ListChecks },
    { to: "/customer/requests/new", label: t("new_request"), icon: PlusCircle },
    { to: "/profile", label: t("profile"), icon: User },
  ];
  const employeeItems: Item[] = [
    { to: "/employee/dashboard", label: t("dashboard"), icon: Home },
    { to: "/employee/requests/nearby", label: t("nearby_requests"), icon: MapPin },
    { to: "/profile", label: t("profile"), icon: User },
    { to: "/employee/reviews", label: t("reviews"), icon: Star },
  ];
  const adminItems: Item[] = [
    { to: "/admin/dashboard", label: t("dashboard"), icon: Home },
    { to: "/admin/users", label: t("users"), icon: UsersIcon },
    { to: "/admin/employees", label: t("employees"), icon: Briefcase },
    { to: "/admin/categories", label: t("categories"), icon: Tag },
    { to: "/admin/requests", label: t("requests"), icon: ListChecks },
    { to: "/admin/reviews", label: t("reviews"), icon: Star },
    { to: "/profile", label: t("profile"), icon: User },
    { to: "/admin/settings", label: t("settings"), icon: SettingsIcon },
  ];
  const items = role === "admin" ? adminItems : role === "employee" ? employeeItems : customerItems;

  const langs: { v: Lang; label: string; code: string }[] = [
    { v: "ar", label: "العربية", code: "AR" },
    { v: "en", label: "English", code: "EN" },
    { v: "tr", label: "Türkçe", code: "TR" },
  ];
  const activeLangCode = langs.find(l => l.v === lang)?.code ?? "EN";

  const activeIndex = Math.max(0, items.findIndex(it => path === it.to || path.startsWith(it.to + "/")));
  const activeItem = items[activeIndex] ?? items[0];
  const sectionNum = String(activeIndex + 1).padStart(2, "0");

  const formatAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diffMs / 60000);
    if (m < 1) return t("posted_ago_just_now");
    if (m < 60) return t("posted_ago_minutes").replace("{n}", String(m));
    const h = Math.floor(m / 60);
    if (h < 24) return t("posted_ago_hours").replace("{n}", String(h));
    return t("posted_ago_days").replace("{n}", String(Math.floor(h / 24)));
  };

  const homePathByRole = role === "admin"
    ? "/admin/dashboard"
    : role === "employee"
      ? "/employee/dashboard"
      : role === "customer"
        ? "/customer/dashboard"
        : "/";

  const renderRailSidebar = (mobile = false) => {
    const expanded = mobile || !collapsed;
    const fullName = profile.full_name ?? (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? "";
    const firstName = fullName.trim().split(/\s+/)[0] ?? "";
    const initials = (fullName.trim().split(/\s+/).map(p => p[0]).join("").slice(0, 2) || "?").toUpperCase();
    const doSignOut = async () => { await signOut(); nav({ to: "/" }); };

    return (
      <aside
        className={`shrink-0 bg-background text-foreground border-e border-sidebar-border flex flex-col h-screen sticky top-0 relative transition-[width] duration-300 ${
          expanded ? "w-60" : "w-[76px]"
        }`}
      >
        {/* Inset hairline trace on the trailing edge */}
        <span aria-hidden className="pointer-events-none absolute inset-y-0 end-0 w-px bg-foreground/10" />

        {/* Logo cell — registration-marked logo with optional wordmark + collapse toggle */}
        <div
          className={`relative h-16 border-b border-sidebar-border flex items-center ${
            expanded ? "ps-4 pe-2 justify-between gap-3" : "justify-center px-2"
          }`}
        >
          <Link
            to={homePathByRole as never}
            onClick={() => setSidebarOpen(false)}
            aria-label={siteName}
            title={!expanded ? siteName : undefined}
            className="group flex items-center gap-3 min-w-0"
          >
            <span className="relative inline-flex shrink-0 transition-transform duration-300 group-hover:rotate-[-2deg]">
              <img src={logoUrl ?? logoSrc} alt="" className="h-9 w-9 object-cover" />
              <span aria-hidden className="absolute -inset-1 border border-foreground pointer-events-none" />
              <span aria-hidden className="absolute -top-1 -start-1 h-1.5 w-1.5 bg-primary" />
              <span aria-hidden className="absolute -bottom-1 -end-1 h-1.5 w-1.5 bg-primary" />
            </span>
            {expanded && (
              <span className="font-display text-lg leading-none truncate">{siteName}</span>
            )}
          </Link>
          {expanded && !mobile && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label={t("collapse_sidebar")}
              title={t("collapse_sidebar")}
              className="shrink-0 grid place-items-center h-8 w-8 text-sidebar-foreground/70 hover:bg-foreground hover:text-primary transition-colors"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapsed-state expand toggle, below the logo */}
        {!expanded && !mobile && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label={t("expand_sidebar")}
            title={t("expand_sidebar")}
            className="mx-auto mt-3 grid place-items-center h-7 w-7 text-sidebar-foreground/60 hover:bg-foreground hover:text-primary transition-colors"
          >
            <PanelLeft className="h-3.5 w-3.5 rotate-180" />
          </button>
        )}

        {/* Top tick — sets a typographic baseline */}
        <div aria-hidden className={`flex justify-center ${expanded ? "pt-5 pb-3" : "pt-3 pb-3"}`}>
          <span className="h-[2px] w-6 bg-foreground" />
        </div>

        {/* Nav rail */}
        <nav
          className={`flex-1 flex flex-col overflow-y-auto ${
            expanded ? "gap-1 px-3" : "items-center gap-1.5 px-2"
          }`}
        >
          {items.map(it => {
            const active = path === it.to || path.startsWith(it.to + "/");
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setSidebarOpen(false)}
                aria-label={it.label}
                title={!expanded ? it.label : undefined}
                className={`group relative transition-colors duration-200 ${
                  expanded
                    ? "flex items-center gap-3 h-11 px-3"
                    : "grid place-items-center h-12 w-12"
                } ${active ? "bg-foreground text-primary" : "text-sidebar-foreground hover:text-foreground"}`}
              >
                {/* Hover hairline frame (inactive only) */}
                {!active && (
                  <span aria-hidden className="absolute inset-0 border border-transparent group-hover:border-foreground/25 transition-colors" />
                )}
                {/* Active leading-edge tab — the only secondary signal */}
                {active && (
                  <span aria-hidden className="absolute -start-2 inset-y-2 w-[3px] bg-primary" />
                )}
                <it.icon
                  className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 ${
                    active ? "scale-110" : "group-hover:-translate-y-px"
                  }`}
                />
                {expanded && (
                  <span className={`font-display text-base truncate ${active ? "text-primary" : ""}`}>{it.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer: avatar with presence dot + (expanded) name/role, then logout */}
        <div
          className={`border-t border-sidebar-border min-h-[72px] ${
            expanded ? "px-3 py-3 flex items-center gap-2" : "px-2 py-3 flex flex-col items-center gap-2.5"
          }`}
        >
          <Link
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            aria-label={firstName || t("profile")}
            title={!expanded ? (firstName || t("profile")) : undefined}
            className={`group ${expanded ? "flex items-center gap-3 min-w-0 flex-1" : ""}`}
          >
            <span className="relative inline-flex shrink-0">
              <Avatar className="h-11 w-11 ring-1 ring-foreground/15 group-hover:ring-foreground transition-all">
                <AvatarImage src={profile.avatar_url || undefined} alt="" className="object-cover" />
                <AvatarFallback className="bg-foreground text-primary text-[11px] font-semibold tracking-tight">{initials}</AvatarFallback>
              </Avatar>
              <span aria-hidden className="absolute -bottom-0.5 -end-0.5 h-3 w-3 bg-primary border-2 border-sidebar" />
            </span>
            {expanded && (
              <div className="min-w-0">
                <div className="font-display text-sm leading-tight truncate">{firstName || t("profile")}</div>
                {role && (
                  <div className="label-mono text-sidebar-foreground/60 truncate leading-tight mt-0.5">{t(role as never)}</div>
                )}
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={doSignOut}
            aria-label={t("logout")}
            title={t("logout")}
            className="shrink-0 grid place-items-center h-9 w-9 text-sidebar-foreground/70 hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    );
  };

  return (
    <div className="min-h-screen flex w-full bg-muted/30">
      <div className="hidden lg:block">{renderRailSidebar(false)}</div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 start-0 animate-fade-in">{renderRailSidebar(true)}</div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-background border-b border-foreground">
          {/* Primary header row */}
          <div className="flex items-stretch h-16">
            {/* Mobile menu — sharp square edge */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="lg:hidden flex items-center justify-center w-14 border-e border-foreground hover:bg-primary transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Section number + page title */}
            <div className="flex items-center gap-4 px-4 md:px-6 min-w-0 flex-1">
              <div className="min-w-0 leading-tight">
                <div className="label-mono text-muted-foreground truncate">
                  {role ? t(role as never).toUpperCase() : ""} <span className="opacity-40">·</span> {t("dashboard").toUpperCase()}
                </div>
                <div className="font-display text-xl md:text-2xl truncate">{activeItem?.label ?? t("dashboard")}</div>
              </div>
            </div>

            {/* Brutalist segmented control cluster */}
            <div className="flex items-stretch border-s border-foreground">
              <button
                type="button"
                onClick={toggleTheme}
                title="Theme"
                aria-label="Toggle theme"
                className="group relative flex items-center justify-center w-12 md:w-14 border-e border-foreground/15 hover:bg-foreground hover:text-primary transition-colors"
              >
                {theme === "dark"
                  ? <Sun className="h-4 w-4 transition-transform group-hover:rotate-45" />
                  : <Moon className="h-4 w-4 transition-transform group-hover:-rotate-12" />}
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Language"
                    className="group flex items-center gap-1.5 px-3 md:px-3.5 border-e border-foreground/15 hover:bg-foreground hover:text-primary transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="hidden md:inline label-mono">{activeLangCode}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-none border-foreground p-0 min-w-[10rem]">
                  {langs.map(l => (
                    <DropdownMenuItem
                      key={l.v}
                      onClick={() => setLang(l.v)}
                      className={`rounded-none border-b border-foreground/10 last:border-b-0 font-mono-ui text-[12px] tracking-[0.14em] uppercase px-3 py-2.5 ${
                        lang === l.v ? "bg-foreground text-primary" : ""
                      }`}
                    >
                      <span className="opacity-60 me-2">{l.code}</span>{l.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("notifications")}
                    title={t("notifications")}
                    className="group relative flex items-center justify-center w-12 md:w-14 border-e border-foreground/15 hover:bg-foreground hover:text-primary transition-colors"
                  >
                    <Bell className="h-4 w-4 transition-transform group-hover:rotate-12" />
                    {unread > 0 && (
                      <span className="absolute top-2.5 end-2.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[10px] font-mono-ui font-bold leading-none bg-primary text-foreground border border-foreground">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                    {unread > 0 && (
                      <span className="absolute top-2.5 end-2.5 w-[18px] h-[18px] pointer-events-none animate-pulse-ring bg-primary/40" aria-hidden />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="rounded-none border-foreground p-0 w-[22rem] max-w-[calc(100vw-1rem)]"
                >
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-foreground bg-foreground text-background">
                    <div className="flex items-center gap-2">
                      <span className="label-mono text-primary">{t("notifications")}</span>
                      {unread > 0 && (
                        <span className="label-mono px-1.5 py-0.5 bg-primary text-foreground">{unread}</span>
                      )}
                    </div>
                    {unread > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="label-mono text-background/80 hover:text-primary transition-colors"
                      >
                        {t("mark_all_read")}
                      </button>
                    )}
                  </div>
                  <div className="max-h-[26rem] overflow-y-auto">
                    {recents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center px-4 py-10 gap-2">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{t("no_notifications")}</p>
                      </div>
                    ) : (
                      recents.map(n => (
                        <button
                          type="button"
                          key={n.id}
                          onClick={() => openNotification(n)}
                          className={`group/item w-full text-start flex gap-3 px-3 py-3 border-b border-foreground/10 last:border-b-0 hover:bg-muted transition-colors ${
                            n.is_read ? "" : "bg-primary/5"
                          }`}
                        >
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 ${n.is_read ? "bg-transparent border border-foreground/30" : "bg-primary"}`}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <div className={`text-sm truncate ${n.is_read ? "font-medium text-foreground/80" : "font-semibold text-foreground"}`}>
                                {n.title}
                              </div>
                              <span className="label-mono text-muted-foreground shrink-0">{formatAgo(n.created_at)}</span>
                            </div>
                            {n.body && (
                              <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</div>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={async () => { await signOut(); nav({ to: "/" }); }}
                title={t("logout")}
                aria-label={t("logout")}
                className="hidden sm:flex items-center gap-2 px-3 md:px-4 hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline label-mono">{t("logout")}</span>
              </button>
            </div>
          </div>

          {/* Yellow under-rail accent */}
          <div className="h-[3px] bg-primary" />
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
