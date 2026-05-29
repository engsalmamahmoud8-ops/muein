import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type Lang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  Camera, Lock, Radio, Phone, MapPin, Building2,
  KeyRound, Eye, EyeOff,
  UserSquare2, Briefcase, Wrench, Calendar, Award,
} from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "ملفي — يمناك" }] }),
  component: ProfilePage,
});

/* ------------------------------------------------------------------ */
/*  PERSONAL FILE — universal profile page                            */
/*  Editorial / brutalist · adapts to role (customer / employee / admin) */
/* ------------------------------------------------------------------ */

function ProfilePage() {
  const { t, lang, setLang } = useI18n();
  const { user, role } = useAuth();
  const isRtl = lang === "ar";

  const [profile, setProfile] = useState<any>({
    full_name: "", phone: "", city: "", address: "",
    avatar_url: "", preferred_language: "ar",
  });
  const [emp, setEmp] = useState<any>({ bio: "", years_experience: 0, city: "", is_available: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwShow, setPwShow] = useState({ current: false, next: false, confirm: false });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (p) setProfile((prev: any) => ({ ...prev, ...p }));
      if (role === "employee") {
        const { data: e } = await supabase.from("employees").select("*").eq("user_id", user.id).maybeSingle();
        if (e) setEmp(e);
      }
      setLoading(false);
    })();
  }, [user, role]);

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) { toast.error(error.message); return; }
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: e2 } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (e2) { toast.error(e2.message); return; }
      setProfile((prev: any) => ({ ...prev, avatar_url: url }));
      toast.success(t("avatar_updated"));
    } finally { setUploading(false); }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const updates: any = {
      full_name: profile.full_name,
      phone: profile.phone,
      city: profile.city,
      address: profile.address,
      preferred_language: profile.preferred_language,
    };
    const { error: e1 } = await supabase.from("profiles").update(updates).eq("id", user.id);
    let e2: any = null;
    if (role === "employee") {
      ({ error: e2 } = await supabase.from("employees").upsert({
        user_id: user.id,
        bio: emp.bio,
        years_experience: Number(emp.years_experience) || 0,
        city: emp.city,
        is_available: emp.is_available,
      }, { onConflict: "user_id" }));
    }
    setSaving(false);
    if (e1 || e2) return toast.error((e1 || e2)?.message);
    if (profile.preferred_language) setLang(profile.preferred_language as Lang);
    toast.success(t("save"));
  };

  const changePassword = async () => {
    if (!user?.email) return;
    if (!pw.next || pw.next.length < 6) return toast.error(t("six_digits"));
    if (pw.next !== pw.confirm) return toast.error(t("password_mismatch"));
    setPwSaving(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email, password: pw.current,
      });
      if (signInErr) { toast.error(t("current_password_wrong")); return; }
      const { error } = await supabase.auth.updateUser({ password: pw.next });
      if (error) { toast.error(error.message); return; }
      setPw({ current: "", next: "", confirm: "" });
      toast.success(t("password_updated"));
    } finally { setPwSaving(false); }
  };

  /* ---------- derived display ---------- */
  const initials = (profile.full_name || user?.email || "??")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim().split(/\s+/).slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase()).join("") || "ME";

  const joinDate = new Date((user?.created_at as string | undefined) ?? Date.now());
  const roleLabel = role ? roleStrings(role, isRtl) : { en: "MEMBER", ar: "عضو", section: "01" };
  const pwScore = passwordStrength(pw.next);

  if (loading) return <ProfileSkeleton />;

  return (
    <div className="space-y-6 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 bg-background min-h-[calc(100vh-4rem)]">
      {/* ============ MASTHEAD ============ */}
      <header className="relative">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b-[3px] border-foreground pb-6">
          <h1 className="font-display text-5xl md:text-7xl leading-[0.92] tracking-tight">
            {t("my_profile")}
          </h1>
        </div>
      </header>

      {/* ============ HERO: PORTRAIT + IDENTITY ============ */}
      <section className="border border-foreground/90 bg-card">
        <div className="p-6 md:p-8 grid grid-cols-12 gap-6 items-center">
          {/* Portrait */}
          <div className="col-span-12 sm:col-span-4">
            <div className="relative inline-block">
              <div className="relative h-44 w-44 sm:h-52 sm:w-52 border-2 border-foreground bg-muted overflow-hidden">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-foreground text-background">
                    <span className="font-display text-7xl font-light">{initials}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-foreground text-background font-mono-ui text-[10px] tracking-[0.22em] uppercase border border-foreground hover:bg-primary hover:text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-50"
                aria-label={t("change_photo")}
              >
                <Camera className="h-3 w-3" />
                {uploading ? (isRtl ? "تحميل" : "UPLOADING") : (isRtl ? "تبديل الصورة" : "CHANGE")}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }}
              />
            </div>
          </div>

          <div className="col-span-12 sm:col-span-8 space-y-4">
            <div>
              <div className="font-display text-3xl md:text-4xl font-light leading-tight tracking-tight">
                {profile.full_name || (isRtl ? "بدون اسم" : "Unnamed")}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-mono-ui truncate">
                {user?.email ?? "—"}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
              <DetailRow icon={UserSquare2} label={isRtl ? "الدور" : "ROLE"} value={isRtl ? roleLabel.ar : roleLabel.en} mono />
              <DetailRow icon={Phone} label={isRtl ? "هاتف" : "PHONE"} value={profile.phone || "—"} />
              <DetailRow icon={Building2} label={isRtl ? "المدينة" : "CITY"} value={profile.city || "—"} />
              <DetailRow icon={Calendar} label={isRtl ? "انضمّ" : "JOINED"} value={joinDate.toISOString().slice(0, 10)} mono />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Chip primary label={isRtl ? "نشِط" : "ACTIVE"} icon={Radio} />
              {role === "employee" && (
                <Chip
                  label={emp.is_available ? (isRtl ? "متاح" : "ON DUTY") : (isRtl ? "غير متاح" : "OFF DUTY")}
                  icon={Briefcase}
                  primary={!!emp.is_available}
                  muted={!emp.is_available}
                />
              )}
              {role === "employee" && emp.years_experience > 0 && (
                <Chip label={`${emp.years_experience}+ ${isRtl ? "سنة" : "yrs"}`} icon={Award} muted />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ PERSONAL — editable ============ */}
      <section className="border border-foreground/90 bg-card">
        <SectionHeader
          title={isRtl ? "بياناتك" : t("personal_info").toUpperCase()}
        />
        <div className="p-6 md:p-8 grid grid-cols-12 gap-x-6 gap-y-7">
          <EditField
            className="col-span-12 md:col-span-6"
            label={t("full_name")}
            value={profile.full_name ?? ""}
            onChange={v => setProfile({ ...profile, full_name: v })}
            placeholder={isRtl ? "اسمك الكامل" : "Your full name"}
          />
          <EditField
            className="col-span-12 md:col-span-6"
            label={t("phone")}
            value={profile.phone ?? ""}
            onChange={v => setProfile({ ...profile, phone: v })}
            placeholder="+966 ..."
            icon={Phone}
          />
          <EditField
            className="col-span-12 md:col-span-6"
            label={t("city")}
            value={profile.city ?? ""}
            onChange={v => setProfile({ ...profile, city: v })}
            placeholder={isRtl ? "الرياض" : "Riyadh"}
            icon={MapPin}
          />
          <EditField
            className="col-span-12 md:col-span-6"
            label={t("address")}
            value={profile.address ?? ""}
            onChange={v => setProfile({ ...profile, address: v })}
            placeholder={isRtl ? "الحي، الشارع" : "District, street"}
          />

          {/* Language selector */}
          <div className="col-span-12">
            <div className="label-mono text-muted-foreground mb-3">{t("preferred_language")}</div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { v: "ar", l: "العربية", code: "AR" },
                  { v: "en", l: "English", code: "EN" },
                  { v: "tr", l: "Türkçe", code: "TR" },
                ] as const
              ).map(o => {
                const active = (profile.preferred_language ?? "ar") === o.v;
                return (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setProfile({ ...profile, preferred_language: o.v })}
                    className={`relative border border-foreground py-3 px-3 text-start transition-all ${
                      active ? "bg-foreground text-background" : "hover:-translate-y-0.5 hover:bg-muted"
                    }`}
                  >
                    <div className={`font-mono-ui text-[10px] tracking-[0.22em] ${active ? "text-primary" : "text-muted-foreground"}`}>
                      {o.code}
                    </div>
                    <div className="font-display text-base leading-none mt-1">{o.l}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="col-span-12 flex justify-end pt-2 border-t border-foreground/15">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="btn-stamp inline-flex"
              style={{ width: "auto", padding: "1.05rem 2.5rem" }}
            >
              {saving
                ? (isRtl ? "حفظ…" : "SAVING…")
                : isRtl ? "حفظ" : t("save").toUpperCase()}
            </button>
          </div>
        </div>
      </section>

      {/* ============ EMPLOYEE — CRAFT (only if employee) ============ */}
      {role === "employee" && (
        <section className="border border-foreground/90 bg-card">
          <SectionHeader title={isRtl ? "حِرفتُك" : "YOUR CRAFT"} />

          {/* Availability row */}
          <div className="px-6 md:px-8 py-4 flex items-center justify-between gap-4 border-b border-foreground/15">
            <div>
              <div className="label-mono text-muted-foreground">{t("availability").toUpperCase()}</div>
              <div className="font-display text-xl leading-tight mt-0.5">
                {emp.is_available
                  ? (isRtl ? "متاح" : "On duty")
                  : (isRtl ? "غير متاح" : "Off duty")}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEmp({ ...emp, is_available: !emp.is_available })}
              className={`px-4 py-2.5 border-2 font-mono-ui text-[11px] tracking-[0.24em] uppercase transition-all hover:-translate-y-0.5 ${
                emp.is_available
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground bg-primary text-foreground"
              }`}
            >
              {emp.is_available
                ? (isRtl ? "أوقف الاتاحة" : "GO OFF DUTY")
                : (isRtl ? "ابدأ العمل" : "GO ON DUTY")}
            </button>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-12 gap-x-6 gap-y-7">
            <div className="col-span-12 md:col-span-4 space-y-2">
              <div className="label-mono text-muted-foreground">{t("years_experience")}</div>
              <div className="flex items-end gap-3">
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={emp.years_experience ?? 0}
                  onChange={e => setEmp({ ...emp, years_experience: e.target.value })}
                  className="w-24 bg-transparent border-0 border-b-2 border-foreground focus:border-primary outline-none font-display text-5xl font-light tabular-nums tracking-tight"
                />
                <span className="label-mono text-muted-foreground pb-3">
                  {isRtl ? "سنة" : "yrs"}
                </span>
              </div>
            </div>

            <EditField
              className="col-span-12 md:col-span-8"
              label={t("city")}
              value={emp.city ?? ""}
              onChange={v => setEmp({ ...emp, city: v })}
              placeholder={isRtl ? "أين تعمل" : "Where you operate"}
              icon={MapPin}
            />

            <div className="col-span-12">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="label-mono text-muted-foreground">{t("bio")}</span>
                <span className="ms-auto font-mono-ui text-[10px] text-muted-foreground tabular-nums">
                  {(emp.bio ?? "").length}/500
                </span>
              </div>
              <textarea
                rows={5}
                maxLength={500}
                value={emp.bio ?? ""}
                onChange={e => setEmp({ ...emp, bio: e.target.value })}
                placeholder={isRtl
                  ? "اروِ قصّتك في فقرة قصيرة — خبراتك، ما تتقنه، أسلوبك."
                  : "Tell your story in a short paragraph — what you do, what you've mastered, how you work."}
                className="w-full bg-transparent border-2 border-foreground p-4 font-display text-lg leading-relaxed outline-none focus:border-primary placeholder:text-muted-foreground placeholder:font-sans placeholder:text-base resize-none"
              />
            </div>

            <div className="col-span-12 flex justify-end pt-2 border-t border-foreground/15">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="btn-stamp inline-flex"
                style={{ width: "auto", padding: "1.05rem 2.5rem" }}
              >
                <Wrench className="h-3.5 w-3.5 me-2" />
                {saving
                  ? (isRtl ? "حفظ…" : "SAVING…")
                  : (isRtl ? "احفظ" : t("save").toUpperCase())}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============ PASSWORD ============ */}
      <section className="border border-foreground/90 bg-card">
        <SectionHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Lock className="h-3 w-3" />
              {isRtl ? "تبديل كلمة المرور" : t("update_password").toUpperCase()}
            </span>
          }
        />
        <div className="p-6 md:p-8 grid grid-cols-12 gap-x-6 gap-y-7">
          <PasswordField
            className="col-span-12 md:col-span-4"
            label={t("current_password")}
            value={pw.current}
            show={pwShow.current}
            onToggle={() => setPwShow(s => ({ ...s, current: !s.current }))}
            onChange={v => setPw({ ...pw, current: v })}
            autoComplete="current-password"
          />
          <PasswordField
            className="col-span-12 md:col-span-4"
            label={t("new_password")}
            value={pw.next}
            show={pwShow.next}
            onToggle={() => setPwShow(s => ({ ...s, next: !s.next }))}
            onChange={v => setPw({ ...pw, next: v })}
            autoComplete="new-password"
          />
          <PasswordField
            className="col-span-12 md:col-span-4"
            label={t("confirm_password")}
            value={pw.confirm}
            show={pwShow.confirm}
            onToggle={() => setPwShow(s => ({ ...s, confirm: !s.confirm }))}
            onChange={v => setPw({ ...pw, confirm: v })}
            autoComplete="new-password"
          />

          <div className="col-span-12 md:col-span-8 space-y-2">
            <div className="flex items-center justify-between font-mono-ui text-[10px] uppercase tracking-[0.22em]">
              <span className="text-muted-foreground">{isRtl ? "قوة الكلمة" : "STRENGTH"}</span>
              <span className="text-foreground">{strengthLabel(pwScore, isRtl)}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`h-2 border border-foreground/30 ${i < pwScore ? "bg-primary" : "bg-transparent"}`}
                />
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-2">
              <Check ok={pw.next.length >= 8} text={isRtl ? "٨ خانات+" : "8+ chars"} />
              <Check ok={/[A-Z]/.test(pw.next)} text="UPPERCASE" />
              <Check ok={/[0-9]/.test(pw.next)} text="NUMBER" />
              <Check ok={/[^A-Za-z0-9]/.test(pw.next)} text="SYMBOL" />
            </ul>
          </div>

          <div className="col-span-12 md:col-span-4 flex items-end">
            <button
              onClick={changePassword}
              disabled={pwSaving}
              className="w-full px-5 py-4 border-2 border-foreground bg-foreground text-background font-mono-ui text-[11px] tracking-[0.28em] uppercase font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {pwSaving
                ? (isRtl ? "حفظ…" : "SAVING…")
                : (isRtl ? "حفظ" : t("change_password").toUpperCase())}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SUBCOMPONENTS                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({ title }: { title: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between px-5 pt-4 pb-3 border-b border-foreground/15">
      <h2 className="label-mono text-foreground tracking-[0.24em]">{title}</h2>
    </div>
  );
}

function DetailRow({
  icon: Icon, label, value, mono,
}: { icon: typeof Phone; label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="label-mono text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`mt-1 truncate ${mono ? "font-mono-ui tracking-wider" : "font-display text-lg leading-tight"}`}>
        {value}
      </div>
    </div>
  );
}

function Chip({
  label, icon: Icon, primary, muted,
}: { label: string; icon: typeof Radio; primary?: boolean; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 border font-mono-ui text-[10px] tracking-[0.22em] uppercase ${
        primary
          ? "border-foreground bg-primary text-foreground"
          : muted
          ? "border-foreground/30 text-muted-foreground"
          : "border-foreground bg-foreground text-background"
      }`}
    >
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function EditField({
  className, label, value, onChange, placeholder, icon: Icon,
}: {
  className?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: typeof Phone;
}) {
  return (
    <label className={className}>
      <div className="flex items-baseline gap-2">
        <span className="label-mono text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-3 w-3 text-muted-foreground ms-auto" />}
      </div>
      <input
        className="input-edit"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  );
}

function PasswordField({
  className, label, value, show, onToggle, onChange, autoComplete,
}: {
  className?: string;
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className={className}>
      <span className="label-mono text-muted-foreground">{label}</span>
      <div className="relative mt-1">
        <input
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-transparent border-0 border-b-2 border-foreground/60 focus:border-foreground outline-none py-2 pe-8 font-mono-ui tracking-[0.18em] placeholder:text-muted-foreground/50"
          placeholder={show ? "plain·text" : "•••••••"}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute end-0 inset-y-0 px-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? "hide" : "show"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "text-primary" : ""}`}>
      <span className={`inline-block h-2 w-2 ${ok ? "bg-primary" : "border border-foreground/40"}`} />
      {text}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                           */
/* ------------------------------------------------------------------ */

function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(5, s);
}

function strengthLabel(score: number, isRtl: boolean): string {
  const en = ["IDLE", "WEAK", "FAIR", "GOOD", "STRONG", "VAULT-GRADE"];
  const ar = ["خامل", "ضعيف", "مقبول", "جيد", "قوي", "بمستوى الخزنة"];
  return (isRtl ? ar : en)[score] ?? "—";
}

function roleStrings(role: string, _isRtl: boolean): { en: string; ar: string; section: string } {
  switch (role) {
    case "admin":    return { en: "ADMIN",    ar: "مسؤول",  section: "00" };
    case "employee": return { en: "OPERATOR", ar: "حِرفيّ",  section: "02" };
    case "customer": return { en: "CLIENT",   ar: "عميل",   section: "03" };
    default:         return { en: "MEMBER",   ar: "عضو",    section: "01" };
  }
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4 animate-pulse -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
      <div className="h-9 bg-muted" />
      <div className="h-24 bg-muted" />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 h-80 bg-muted" />
        <div className="col-span-12 lg:col-span-4 h-80 bg-primary/40" />
      </div>
      <div className="h-10 bg-muted" />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 h-72 bg-muted" />
        <div className="col-span-12 lg:col-span-4 h-72 bg-muted" />
      </div>
      <div className="h-64 bg-foreground/80" />
    </div>
  );
}
