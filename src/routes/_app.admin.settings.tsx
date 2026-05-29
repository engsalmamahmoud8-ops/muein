import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  Settings as SettingsIcon, Globe, Bell, Shield, Save, Mail, Send,
  Languages, Clock, Coins, MapPinned, Percent, Wallet, KeyRound,
  Sparkles, Radio, Activity, Lock, ImageIcon, Upload, Trash2, Type,
  Palette, Star,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { sendEmail } from "@/lib/api/email.functions";
import {
  getSiteSettings,
  getPrivateSettings,
  updateSiteSettings,
  updatePrivateSettings,
  uploadBrandingAsset,
} from "@/lib/api/site-settings.functions";
import { cachePlatformSettings } from "@/lib/platform-settings";
import {
  type BrandingConfig,
  type BrandingColors,
  DEFAULT_BRANDING,
  DEFAULT_COLOR_PREVIEWS,
  cacheBranding,
} from "@/lib/branding";
import {
  type SmtpConfig,
  DEFAULT_SMTP,
  isSmtpConfigured,
  welcomeEmailHtml,
} from "@/lib/email-config";

export const Route = createFileRoute("/_app/admin/settings")({ component: AdminSettings });

type PlatformSettings = {
  defaultLanguage: "ar" | "en" | "tr";
  timezone: string;
  currency: "SAR" | "USD" | "TRY" | "EUR";
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  require2fa: boolean;
  sessionTimeout: number;
  maxDistance: number;
  commissionRate: number;
  minRequestAmount: number;
  autoAssign: boolean;
};

const DEFAULTS: PlatformSettings = {
  defaultLanguage: "ar",
  timezone: "Asia/Riyadh",
  currency: "SAR",
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  require2fa: false,
  sessionTimeout: 60,
  maxDistance: 25,
  commissionRate: 10,
  minRequestAmount: 50,
  autoAssign: false,
};

const TIMEZONES = [
  { v: "Asia/Riyadh",     label: "RIYADH",    offset: "+03" },
  { v: "Europe/Istanbul", label: "ISTANBUL",  offset: "+03" },
  { v: "Asia/Dubai",      label: "DUBAI",     offset: "+04" },
  { v: "UTC",             label: "UTC",       offset: "±00" },
];

const LANGUAGES: { v: PlatformSettings["defaultLanguage"]; label: string; code: string }[] = [
  { v: "ar", label: "العربية",  code: "AR" },
  { v: "en", label: "English",  code: "EN" },
  { v: "tr", label: "Türkçe",   code: "TR" },
];

const CURRENCIES: { v: PlatformSettings["currency"]; label: string; sym: string }[] = [
  { v: "SAR", label: "Saudi Riyal",  sym: "﷼" },
  { v: "USD", label: "US Dollar",    sym: "$" },
  { v: "TRY", label: "Türk Lirası",  sym: "₺" },
  { v: "EUR", label: "Euro",         sym: "€" },
];

/* tiny stable hash for footer config-stamp */
function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0").slice(0, 8).toUpperCase();
}

/* ------- atoms ------- */

function FlipToggle({
  checked, onChange, id,
}: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <label htmlFor={id} className="flip-shell cursor-pointer select-none">
      <input id={id} type="checkbox" className="flip-input peer" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="flip-track"><span className="flip-knob" /></span>
      <span className="flip-state">{checked ? "ON" : "OFF"}</span>
    </label>
  );
}

function NumReadout({
  id, value, onChange, unit, min, max, step = 1,
}: {
  id: string; value: number; onChange: (n: number) => void;
  unit: string; min?: number; max?: number; step?: number;
}) {
  const clamp = (n: number) => {
    if (typeof min === "number" && n < min) return min;
    if (typeof max === "number" && n > max) return max;
    return n;
  };
  return (
    <div className="num-readout">
      <input
        id={id}
        className="num-readout-value"
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(clamp(Number(e.target.value)))}
      />
      <span className="num-readout-unit">{unit}</span>
      <button type="button" aria-label="decrement" className="num-readout-step" onClick={() => onChange(clamp(value - step))}>−</button>
      <button type="button" aria-label="increment" className="num-readout-step" onClick={() => onChange(clamp(value + step))}>+</button>
    </div>
  );
}

function SectionHead({
  title,
}: { index?: string; eyebrow?: string; title: string; kicker?: string }) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-3xl md:text-4xl leading-[1.05]">{title}</h2>
      <div className="rule-thin" />
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="label-mono text-foreground">{children}</div>;
}

function UnderlineInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input-edit ${props.className ?? ""}`} />;
}

function ColorField({
  label, cssVar, value, fallback, onChange, resetLabel, hint, previewLabel, icon,
}: {
  label: string;
  cssVar: string;
  value: string | null;
  fallback: string;
  onChange: (v: string | null) => void;
  resetLabel: string;
  hint: string;
  previewLabel: string;
  icon?: React.ReactNode;
}) {
  const effective = value ?? fallback;
  const isDefault = value == null;
  return (
    <div className="brutal-panel p-5 md:p-6 brutal-shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="label-mono">
          {icon}{label}
        </div>
        <span className="mono-ticker text-muted-foreground font-mono-display">{cssVar}</span>
      </div>
      <div className="flex items-stretch gap-3">
        <label
          className="relative w-16 h-16 border border-foreground cursor-pointer overflow-hidden shrink-0"
          style={{ background: effective }}
        >
          <input
            type="color"
            className="absolute inset-0 opacity-0 cursor-pointer"
            value={effective}
            onChange={e => onChange(e.target.value)}
            aria-label={label}
          />
        </label>
        <input
          type="text"
          value={value ?? ""}
          placeholder={fallback}
          onChange={e => {
            const v = e.target.value.trim();
            onChange(v.length === 0 ? null : v);
          }}
          className="input-edit flex-1 font-mono-display"
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={isDefault}
          className="brutal-panel px-3 mono-ticker hover:bg-foreground hover:text-background transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground"
        >
          {resetLabel}
        </button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="mono-ticker text-muted-foreground">{previewLabel}</span>
        <span
          className="inline-flex items-center gap-2 px-3 py-1 border border-foreground font-display text-sm"
          style={{ background: effective }}
        >
          <span className="font-mono-display mix-blend-difference text-white">Aa · ABC</span>
        </span>
        <span className="mono-ticker text-muted-foreground ms-auto">
          {isDefault ? "DEFAULT" : "CUSTOM"}
        </span>
      </div>
      <p className="mono-ticker text-muted-foreground mt-3">{hint}</p>
    </div>
  );
}

/* ------- page ------- */

function AdminSettings() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS);
  const [smtp, setSmtp] = useState<SmtpConfig>(DEFAULT_SMTP);
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const baselineRef = useRef<string>("");
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pub, priv] = await Promise.all([getSiteSettings(), getPrivateSettings()]);
        if (cancelled) return;
        const s: PlatformSettings = {
          defaultLanguage: pub.defaultLanguage,
          timezone: pub.timezone,
          currency: pub.currency,
          emailNotifications: priv.notifications.emailNotifications,
          pushNotifications: priv.notifications.pushNotifications,
          smsNotifications: priv.notifications.smsNotifications,
          require2fa: priv.security.require2fa,
          sessionTimeout: priv.security.sessionTimeout,
          maxDistance: pub.maxDistance,
          commissionRate: pub.commissionRate,
          minRequestAmount: pub.minRequestAmount,
          autoAssign: pub.autoAssign,
        };
        const b: BrandingConfig = {
          siteNames: pub.siteNames,
          logoUrl: pub.logoUrl,
          faviconUrl: pub.faviconUrl,
          colors: pub.colors,
        };
        setSettings(s);
        setSmtp(priv.smtp);
        setBranding(b);
        baselineRef.current = JSON.stringify([s, priv.smtp, b]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load settings";
        toast.error(msg);
      } finally {
        if (!cancelled) setLoadingSettings(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(
    () => baselineRef.current !== "" && JSON.stringify([settings, smtp, branding]) !== baselineRef.current,
    [settings, smtp, branding],
  );

  const update = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) =>
    setSettings(s => ({ ...s, [key]: value }));

  const updateSmtp = <K extends keyof SmtpConfig>(key: K, value: SmtpConfig[K]) =>
    setSmtp(s => ({ ...s, [key]: value }));

  const updateSiteName = (l: "ar" | "en" | "tr", value: string) =>
    setBranding(b => ({ ...b, siteNames: { ...b.siteNames, [l]: value } }));

  const uploadImageToBucket = async (
    file: File,
    kind: "logo" | "favicon",
    maxBytes: number,
  ): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("logo_invalid_type"));
      return null;
    }
    if (file.size > maxBytes) {
      toast.error(t("logo_too_large"));
      return null;
    }
    const buf = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const dataBase64 = window.btoa(binary);
    try {
      const res = await uploadBrandingAsset({
        data: {
          kind,
          filename: file.name,
          contentType: file.type,
          dataBase64,
        },
      });
      return res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      return null;
    }
  };

  const handleLogoFile = async (file: File) => {
    setUploadingLogo(true);
    try {
      const url = await uploadImageToBucket(file, "logo", 2 * 1024 * 1024);
      if (url) setBranding(b => ({ ...b, logoUrl: url }));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFaviconFile = async (file: File) => {
    setUploadingFavicon(true);
    try {
      const url = await uploadImageToBucket(file, "favicon", 512 * 1024);
      if (url) setBranding(b => ({ ...b, faviconUrl: url }));
    } finally {
      setUploadingFavicon(false);
    }
  };

  const clearLogo = () => {
    setBranding(b => ({ ...b, logoUrl: null }));
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const clearFavicon = () => {
    setBranding(b => ({ ...b, faviconUrl: null }));
    if (faviconInputRef.current) faviconInputRef.current.value = "";
  };

  const updateColor = (key: keyof BrandingColors, value: string | null) =>
    setBranding(b => ({ ...b, colors: { ...b.colors, [key]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSiteSettings({
          data: {
            siteNames: branding.siteNames,
            logoUrl: branding.logoUrl,
            faviconUrl: branding.faviconUrl,
            colors: branding.colors,
            defaultLanguage: settings.defaultLanguage,
            currency: settings.currency,
            timezone: settings.timezone,
            maxDistance: settings.maxDistance,
            commissionRate: settings.commissionRate,
            minRequestAmount: settings.minRequestAmount,
            autoAssign: settings.autoAssign,
          },
        }),
        updatePrivateSettings({
          data: {
            smtp,
            notifications: {
              emailNotifications: settings.emailNotifications,
              pushNotifications: settings.pushNotifications,
              smsNotifications: settings.smsNotifications,
            },
            security: {
              require2fa: settings.require2fa,
              sessionTimeout: settings.sessionTimeout,
            },
          },
        }),
      ]);
      cacheBranding(branding);
      cachePlatformSettings({
        defaultLanguage: settings.defaultLanguage,
        timezone: settings.timezone,
        currency: settings.currency,
        maxDistance: settings.maxDistance,
        commissionRate: settings.commissionRate,
        minRequestAmount: settings.minRequestAmount,
        autoAssign: settings.autoAssign,
      });
      baselineRef.current = JSON.stringify([settings, smtp, branding]);
      toast.success(t("settings_saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!isSmtpConfigured(smtp)) {
      toast.error(t("smtp_incomplete"));
      return;
    }
    const recipient = user?.email;
    if (!recipient) {
      toast.error(t("smtp_no_recipient"));
      return;
    }
    if (dirty) {
      toast.error("Save settings before sending a test email");
      return;
    }
    setTesting(true);
    try {
      const result = await sendEmail({
        data: {
          to: recipient,
          subject: `${t("app_name")} — ${t("test_email_subject")}`,
          html: welcomeEmailHtml({ fullName: t("test_user"), appName: t("app_name") }),
        },
      });
      if (result.ok) toast.success(t("test_email_sent"));
      else toast.error(result.error || t("test_email_failed"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("test_email_failed"));
    } finally {
      setTesting(false);
    }
  };

  const cfgHash = useMemo(() => hash(JSON.stringify([settings, smtp, branding])), [settings, smtp, branding]);
  const smtpReady = isSmtpConfigured(smtp);

  return (
    <div className="-m-4 md:-m-6 lg:-m-8 bg-background text-foreground min-h-[calc(100vh-4rem)]">
      {/* ───────── Masthead ───────── */}
      <header className="px-4 md:px-8 lg:px-12 pt-10 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b-[3px] border-foreground pb-6">
          <h1 className="font-display text-5xl md:text-7xl leading-[0.92] tracking-tight">
            {t("platform_settings")}
          </h1>
        </div>
      </header>

      {/* ───────── Body ───────── */}
      <div className="px-4 md:px-8 lg:px-12 py-10 pb-32 space-y-16">

        {/* S/01 — Localization */}
        <section className="grid lg:grid-cols-[280px_1fr] gap-8 lg:gap-12">
          <SectionHead
            index="01"
            eyebrow="LOCALIZATION"
            title={t("general_settings")}
            kicker={`${t("default_language")} · ${t("timezone")} · ${t("currency")}`}
          />
          <div className="space-y-8">
            {/* Language segmented */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>
                  <Languages className="inline h-3 w-3 me-2" />
                  {t("default_language")}
                </FieldLabel>
                <span className="mono-ticker text-muted-foreground">3 / OPTIONS</span>
              </div>
              <div className="seg-group">
                {LANGUAGES.map(l => (
                  <button
                    key={l.v}
                    type="button"
                    data-active={settings.defaultLanguage === l.v}
                    className="seg-chip"
                    onClick={() => update("defaultLanguage", l.v)}
                  >
                    <span className="opacity-60 me-2">{l.code}</span>{l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timezone segmented */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>
                  <Clock className="inline h-3 w-3 me-2" />
                  {t("timezone")}
                </FieldLabel>
                <span className="mono-ticker text-muted-foreground">UTC OFFSET</span>
              </div>
              <div className="seg-group flex-wrap">
                {TIMEZONES.map(tz => (
                  <button
                    key={tz.v}
                    type="button"
                    data-active={settings.timezone === tz.v}
                    className="seg-chip"
                    onClick={() => update("timezone", tz.v)}
                  >
                    {tz.label}
                    <span className="opacity-60 ms-2 font-mono-display">{tz.offset}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Currency tiles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>
                  <Coins className="inline h-3 w-3 me-2" />
                  {t("currency")}
                </FieldLabel>
                <span className="mono-ticker text-muted-foreground">DENOMINATION</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CURRENCIES.map(c => {
                  const active = settings.currency === c.v;
                  return (
                    <button
                      key={c.v}
                      type="button"
                      onClick={() => update("currency", c.v)}
                      className={`brutal-panel p-4 text-start transition-transform hover:-translate-y-[2px] ${active ? "bg-foreground text-background" : ""}`}
                      style={active ? undefined : { boxShadow: "3px 3px 0 0 var(--color-foreground)" }}
                    >
                      <div className={`font-display text-3xl ${active ? "text-primary" : ""}`}>{c.sym}</div>
                      <div className="mt-2 label-mono">{c.v}</div>
                      <div className={`text-[11px] mt-0.5 ${active ? "text-background/70" : "text-muted-foreground"}`}>{c.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* S/02 — Notifications */}
        <section className="grid lg:grid-cols-[280px_1fr] gap-8 lg:gap-12">
          <SectionHead
            index="02"
            eyebrow="DELIVERY CHANNELS"
            title={t("notifications_settings")}
            kicker="Push the bits through the right wires."
          />
          <div className="brutal-panel brutal-shadow">
            {[
              { id: "email-notif", icon: Mail, key: "emailNotifications" as const, label: t("email_notifications"), hint: "SMTP transport" },
              { id: "push-notif",  icon: Bell, key: "pushNotifications"  as const, label: t("push_notifications"),  hint: "Browser / mobile push" },
              { id: "sms-notif",   icon: Radio, key: "smsNotifications" as const, label: t("sms_notifications"),   hint: "Carrier short-code" },
            ].map((row, i) => (
              <label
                key={row.id}
                htmlFor={row.id}
                className={`flex items-center justify-between gap-6 p-5 cursor-pointer ${i > 0 ? "border-t border-foreground" : ""}`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="h-11 w-11 grid place-items-center border border-foreground bg-background shrink-0">
                    <row.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-xl leading-tight">{row.label}</div>
                    <div className="mono-ticker text-muted-foreground mt-1">CH/{String(i + 1).padStart(2, "0")} · {row.hint}</div>
                  </div>
                </div>
                <FlipToggle
                  id={row.id}
                  checked={settings[row.key]}
                  onChange={v => update(row.key, v)}
                />
              </label>
            ))}
          </div>
        </section>

        {/* S/03 — Security */}
        <section className="grid lg:grid-cols-[280px_1fr] gap-8 lg:gap-12">
          <SectionHead
            index="03"
            eyebrow="ACCESS / SECURITY"
            title={t("security_settings")}
            kicker="Locks, keys, and the duration of trust."
          />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="brutal-panel p-6 brutal-shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <FieldLabel>
                  <Shield className="inline h-3 w-3 me-2" />
                  {t("require_2fa")}
                </FieldLabel>
                <FlipToggle
                  id="require-2fa"
                  checked={settings.require2fa}
                  onChange={v => update("require2fa", v)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 opacity-60" />
                <p className="text-sm text-muted-foreground">
                  {settings.require2fa
                    ? "Enforced for all admin sign-ins."
                    : "Optional — admins may sign in with password alone."}
                </p>
              </div>
            </div>

            <div className="brutal-panel p-6 brutal-shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <FieldLabel>
                  <KeyRound className="inline h-3 w-3 me-2" />
                  {t("session_timeout")}
                </FieldLabel>
                <span className="mono-ticker text-muted-foreground">5 ↔ 1440</span>
              </div>
              <NumReadout
                id="session-timeout"
                value={settings.sessionTimeout}
                onChange={n => update("sessionTimeout", n)}
                min={5}
                max={1440}
                unit="MIN"
              />
            </div>
          </div>
        </section>

        {/* S/04 — Dispatch economics */}
        <section className="grid lg:grid-cols-[280px_1fr] gap-8 lg:gap-12">
          <SectionHead
            index="04"
            eyebrow="DISPATCH ECONOMICS"
            title={t("platform_config")}
            kicker="The math under every job."
          />
          <div className="grid md:grid-cols-3 gap-5">
            <div className="brutal-panel p-5 brutal-shadow-sm">
              <FieldLabel>
                <MapPinned className="inline h-3 w-3 me-2" />
                {t("max_distance")}
              </FieldLabel>
              <div className="mt-4">
                <NumReadout
                  id="max-distance"
                  value={settings.maxDistance}
                  onChange={n => update("maxDistance", n)}
                  min={1}
                  max={500}
                  unit="KM"
                />
              </div>
              <div className="mono-ticker text-muted-foreground mt-3">RADIUS · MATCHING</div>
            </div>

            <div className="brutal-panel p-5 brutal-shadow-sm">
              <FieldLabel>
                <Percent className="inline h-3 w-3 me-2" />
                {t("commission_rate")}
              </FieldLabel>
              <div className="mt-4">
                <NumReadout
                  id="commission-rate"
                  value={settings.commissionRate}
                  onChange={n => update("commissionRate", n)}
                  min={0}
                  max={100}
                  step={0.5}
                  unit="%"
                />
              </div>
              <div className="mono-ticker text-muted-foreground mt-3">CUT · PER&nbsp;JOB</div>
            </div>

            <div className="brutal-panel p-5 brutal-shadow-sm">
              <FieldLabel>
                <Wallet className="inline h-3 w-3 me-2" />
                {t("min_request_amount")}
              </FieldLabel>
              <div className="mt-4">
                <NumReadout
                  id="min-amount"
                  value={settings.minRequestAmount}
                  onChange={n => update("minRequestAmount", n)}
                  min={0}
                  unit={settings.currency}
                />
              </div>
              <div className="mono-ticker text-muted-foreground mt-3">FLOOR · TICKET</div>
            </div>

            <label
              htmlFor="auto-assign"
              className="md:col-span-3 brutal-panel p-5 flex items-center justify-between gap-6 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 grid place-items-center bg-primary text-primary-foreground border border-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-xl leading-tight">{t("auto_assign")}</div>
                  <div className="mono-ticker text-muted-foreground mt-1">
                    AI&nbsp;ROUTING · BIND&nbsp;NEAREST&nbsp;PROVIDER&nbsp;AUTOMATICALLY
                  </div>
                </div>
              </div>
              <FlipToggle
                id="auto-assign"
                checked={settings.autoAssign}
                onChange={v => update("autoAssign", v)}
              />
            </label>
          </div>
        </section>

        {/* S/05 — Brand Identity */}
        <section className="grid lg:grid-cols-[280px_1fr] gap-8 lg:gap-12">
          <SectionHead
            index="05"
            eyebrow="BRAND IDENTITY"
            title={t("brand_identity")}
            kicker={t("brand_identity_kicker")}
          />
          <div className="grid md:grid-cols-[1fr_auto] gap-6">
            <div className="brutal-panel p-6 md:p-8 space-y-6">
              <div>
                <div className="label-mono mb-1">
                  <Type className="inline h-3 w-3 me-2" />
                  {t("site_name_ar")}
                </div>
                <UnderlineInput
                  value={branding.siteNames.ar}
                  onChange={e => updateSiteName("ar", e.target.value)}
                  placeholder="يمناك"
                  dir="rtl"
                />
              </div>
              <div>
                <div className="label-mono mb-1">
                  <Type className="inline h-3 w-3 me-2" />
                  {t("site_name_en")}
                </div>
                <UnderlineInput
                  value={branding.siteNames.en}
                  onChange={e => updateSiteName("en", e.target.value)}
                  placeholder="Ymnak"
                  dir="ltr"
                />
              </div>
              <div>
                <div className="label-mono mb-1">
                  <Type className="inline h-3 w-3 me-2" />
                  {t("site_name_tr")}
                </div>
                <UnderlineInput
                  value={branding.siteNames.tr}
                  onChange={e => updateSiteName("tr", e.target.value)}
                  placeholder="Ymnak"
                  dir="ltr"
                />
              </div>
              <p className="mono-ticker text-muted-foreground pt-2 border-t border-foreground">
                {t("using_default_name")}
              </p>
            </div>

            <div className="flex flex-col gap-6 w-full md:w-[280px]">
              {/* Logo upload */}
              <div className="brutal-panel p-6 md:p-7 flex flex-col">
                <div className="label-mono mb-3">
                  <ImageIcon className="inline h-3 w-3 me-2" />
                  {t("site_logo")}
                </div>
                <div className="aspect-square w-full border border-foreground bg-background grid place-items-center overflow-hidden">
                  {branding.logoUrl ? (
                    <img
                      src={branding.logoUrl}
                      alt={t("site_logo")}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center px-3">
                      <ImageIcon className="h-8 w-8 mx-auto opacity-40" />
                      <div className="mono-ticker text-muted-foreground mt-2">{t("logo_hint")}</div>
                    </div>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoFile(f);
                    if (logoInputRef.current) logoInputRef.current.value = "";
                  }}
                />
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="btn-stamp"
                    style={{ width: "100%" }}
                  >
                    {uploadingLogo ? (
                      <>
                        <Activity className="h-4 w-4 me-2 animate-spin-slow" />
                        UPLOADING…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 me-2" />
                        {branding.logoUrl ? t("replace_logo") : t("upload_logo")}
                      </>
                    )}
                  </button>
                  {branding.logoUrl && (
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="brutal-panel p-3 mono-ticker hover:bg-foreground hover:text-background transition-colors"
                    >
                      <Trash2 className="inline h-3 w-3 me-2" />
                      {t("remove_logo")}
                    </button>
                  )}
                </div>
              </div>

              {/* Favicon upload */}
              <div className="brutal-panel p-6 md:p-7 flex flex-col">
                <div className="label-mono mb-3">
                  <Star className="inline h-3 w-3 me-2" />
                  {t("site_favicon")}
                </div>
                <div className="aspect-square w-full border border-foreground bg-background grid place-items-center overflow-hidden">
                  {branding.faviconUrl ? (
                    <img
                      src={branding.faviconUrl}
                      alt={t("site_favicon")}
                      className="h-full w-full object-contain"
                    />
                  ) : branding.logoUrl ? (
                    <img
                      src={branding.logoUrl}
                      alt={t("site_favicon")}
                      className="h-full w-full object-contain opacity-60"
                    />
                  ) : (
                    <div className="text-center px-3">
                      <Star className="h-8 w-8 mx-auto opacity-40" />
                      <div className="mono-ticker text-muted-foreground mt-2">{t("favicon_hint")}</div>
                    </div>
                  )}
                </div>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/*,.ico"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFaviconFile(f);
                    if (faviconInputRef.current) faviconInputRef.current.value = "";
                  }}
                />
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={uploadingFavicon}
                    className="btn-stamp"
                    style={{ width: "100%" }}
                  >
                    {uploadingFavicon ? (
                      <>
                        <Activity className="h-4 w-4 me-2 animate-spin-slow" />
                        UPLOADING…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 me-2" />
                        {branding.faviconUrl ? t("replace_favicon") : t("upload_favicon")}
                      </>
                    )}
                  </button>
                  {branding.faviconUrl && (
                    <button
                      type="button"
                      onClick={clearFavicon}
                      className="brutal-panel p-3 mono-ticker hover:bg-foreground hover:text-background transition-colors"
                    >
                      <Trash2 className="inline h-3 w-3 me-2" />
                      {t("remove_favicon")}
                    </button>
                  )}
                </div>
                {!branding.faviconUrl && (
                  <p className="mono-ticker text-muted-foreground mt-3">
                    {t("favicon_fallback_logo")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Brand colors */}
          <div className="mt-6 grid md:grid-cols-2 gap-6 lg:col-start-2">
            <ColorField
              label={t("primary_color")}
              cssVar="--color-primary"
              value={branding.colors.primary}
              fallback={DEFAULT_COLOR_PREVIEWS.primary}
              onChange={v => updateColor("primary", v)}
              resetLabel={t("reset_color")}
              hint={t("using_default_color")}
              previewLabel={t("color_preview")}
              icon={<Palette className="inline h-3 w-3 me-2" />}
            />
            <ColorField
              label={t("primary_foreground_color")}
              cssVar="--color-primary-foreground"
              value={branding.colors.primaryForeground}
              fallback={DEFAULT_COLOR_PREVIEWS.primaryForeground}
              onChange={v => updateColor("primaryForeground", v)}
              resetLabel={t("reset_color")}
              hint={t("using_default_color")}
              previewLabel={t("color_preview")}
              icon={<Type className="inline h-3 w-3 me-2" />}
            />
          </div>
        </section>

        {/* S/06 — SMTP */}
        <section className="grid lg:grid-cols-[280px_1fr] gap-8 lg:gap-12">
          <SectionHead
            index="06"
            eyebrow="MAIL TRANSPORT"
            title={t("smtp_settings")}
            kicker={t("smtp_hint")}
          />
          <div className="space-y-6">
            {/* Broadcast test console */}
            <div className="brutal-panel brutal-shadow panel-yellow text-[oklch(0.12_0.01_60)] relative overflow-hidden">
              <div className="panel-stripes absolute inset-0" />
              <div className="relative p-6 grid md:grid-cols-[1fr_auto] gap-4 items-center">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 grid place-items-center bg-foreground text-primary border border-foreground shrink-0">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="label-mono mb-1">BROADCAST&nbsp;TEST</div>
                    <div className="font-display text-2xl leading-tight">
                      {smtpReady ? "TRANSPORT READY" : "TRANSPORT INCOMPLETE"}
                    </div>
                    <div className="mono-ticker mt-2 break-all">
                      {smtpReady ? `${smtp.host}:${smtp.port} · ${smtp.user}` : "FILL ALL SMTP FIELDS"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={sendTestEmail}
                  disabled={testing || !smtpReady}
                  className="btn-stamp"
                  style={{ width: "auto", minWidth: 240 }}
                >
                  <Send className="h-4 w-4 me-2" />
                  {testing ? "TRANSMITTING…" : t("send_test_email")}
                </button>
              </div>
            </div>

            {/* SMTP fields — editorial underline grid */}
            <div className="brutal-panel p-6 md:p-8 grid md:grid-cols-2 gap-x-10 gap-y-6">
              <div>
                <div className="label-mono mb-1">{t("smtp_host")}</div>
                <UnderlineInput
                  value={smtp.host}
                  onChange={e => updateSmtp("host", e.target.value)}
                  placeholder="smtp.gmail.com"
                  dir="ltr"
                />
              </div>
              <div>
                <div className="label-mono mb-1">{t("smtp_port")}</div>
                <UnderlineInput
                  type="number"
                  value={smtp.port}
                  onChange={e => updateSmtp("port", Number(e.target.value))}
                  placeholder="465"
                  dir="ltr"
                />
              </div>
              <div>
                <div className="label-mono mb-1">{t("smtp_user")}</div>
                <UnderlineInput
                  type="email"
                  value={smtp.user}
                  onChange={e => updateSmtp("user", e.target.value)}
                  placeholder="you@gmail.com"
                  autoComplete="off"
                  dir="ltr"
                />
              </div>
              <div>
                <div className="label-mono mb-1">{t("smtp_password")}</div>
                <UnderlineInput
                  type="password"
                  value={smtp.password}
                  onChange={e => updateSmtp("password", e.target.value)}
                  placeholder={t("smtp_app_password_hint")}
                  autoComplete="new-password"
                  dir="ltr"
                />
              </div>
              <div>
                <div className="label-mono mb-1">{t("smtp_from_email")}</div>
                <UnderlineInput
                  type="email"
                  value={smtp.fromEmail}
                  onChange={e => updateSmtp("fromEmail", e.target.value)}
                  placeholder="you@gmail.com"
                  dir="ltr"
                />
              </div>
              <div>
                <div className="label-mono mb-1">{t("smtp_from_name")}</div>
                <UnderlineInput
                  value={smtp.fromName}
                  onChange={e => updateSmtp("fromName", e.target.value)}
                  placeholder="Ymnak"
                />
              </div>
              <label
                htmlFor="smtp-secure"
                className="md:col-span-2 flex items-center justify-between pt-4 border-t border-foreground cursor-pointer"
              >
                <div>
                  <div className="label-mono">{t("smtp_secure")}</div>
                  <div className="text-xs text-muted-foreground mt-1">SSL / TLS — recommended on port 465.</div>
                </div>
                <FlipToggle
                  id="smtp-secure"
                  checked={smtp.secure}
                  onChange={v => updateSmtp("secure", v)}
                />
              </label>
            </div>
          </div>
        </section>

      </div>

      {/* ───────── Sticky save dock ───────── */}
      <div className="sticky bottom-0 z-30 border-t border-foreground bg-background/95 backdrop-blur">
        <div className="px-4 md:px-8 lg:px-12 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <span className={`status-dot ${dirty ? "status-dot-warn" : "status-dot-live"}`} />
            <span className="mono-ticker">
              {dirty ? "UNSAVED CHANGES" : "ALL CHANGES PERSISTED"}
            </span>
            <span className="mono-ticker text-muted-foreground hidden sm:inline">
              · CFG.{cfgHash}
            </span>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className={`btn-stamp ${dirty && !saving ? "nudge-on-mod" : ""}`}
            style={{ width: "auto", minWidth: 220 }}
          >
            {saving ? (
              <>
                <Activity className="h-4 w-4 me-2 animate-spin-slow" />
                TRANSMITTING…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 me-2" />
                {t("save")} · {t("settings").toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
