import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/* ---------- Schemas ---------- */

const PublicSettingsSchema = z.object({
  siteNames: z.object({
    ar: z.string(),
    en: z.string(),
    tr: z.string(),
  }),
  logoUrl: z.string().nullable(),
  faviconUrl: z.string().nullable(),
  colors: z.object({
    primary: z.string().nullable(),
    primaryForeground: z.string().nullable(),
  }),
  defaultLanguage: z.enum(["ar", "en", "tr"]),
  currency: z.enum(["SAR", "USD", "TRY", "EUR"]),
  timezone: z.string().min(1),
  maxDistance: z.number().int().min(1).max(500),
  commissionRate: z.number().min(0).max(100),
  minRequestAmount: z.number().min(0),
  autoAssign: z.boolean(),
});

const SmtpSchema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string(),
  password: z.string(),
  fromEmail: z.string(),
  fromName: z.string(),
});

const NotificationsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  smsNotifications: z.boolean(),
});

const SecuritySchema = z.object({
  require2fa: z.boolean(),
  sessionTimeout: z.number().int().min(5).max(1440),
});

export type PublicSiteSettings = z.infer<typeof PublicSettingsSchema>;
export type SiteSmtp = z.infer<typeof SmtpSchema>;
export type SiteNotifications = z.infer<typeof NotificationsSchema>;
export type SiteSecurity = z.infer<typeof SecuritySchema>;

export const DEFAULT_PUBLIC_SETTINGS: PublicSiteSettings = {
  siteNames: { ar: "", en: "", tr: "" },
  logoUrl: null,
  faviconUrl: null,
  colors: { primary: null, primaryForeground: null },
  defaultLanguage: "ar",
  currency: "SAR",
  timezone: "Asia/Riyadh",
  maxDistance: 25,
  commissionRate: 10,
  minRequestAmount: 50,
  autoAssign: false,
};

export const DEFAULT_SMTP: SiteSmtp = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  user: "",
  password: "",
  fromEmail: "",
  fromName: "Ymnak",
};

export const DEFAULT_NOTIFICATIONS: SiteNotifications = {
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
};

export const DEFAULT_SECURITY: SiteSecurity = {
  require2fa: false,
  sessionTimeout: 60,
};

/* ---------- Helpers ---------- */

async function assertAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

function rowToPublic(row: Record<string, unknown> | null): PublicSiteSettings {
  if (!row) return DEFAULT_PUBLIC_SETTINGS;
  const names = (row.site_names ?? {}) as Partial<PublicSiteSettings["siteNames"]>;
  const colors = (row.colors ?? {}) as Partial<PublicSiteSettings["colors"]>;
  return {
    siteNames: {
      ar: names.ar ?? "",
      en: names.en ?? "",
      tr: names.tr ?? "",
    },
    logoUrl: (row.logo_url as string | null) ?? null,
    faviconUrl: (row.favicon_url as string | null) ?? null,
    colors: {
      primary: colors.primary ?? null,
      primaryForeground: colors.primaryForeground ?? null,
    },
    defaultLanguage:
      ((row.default_language as PublicSiteSettings["defaultLanguage"]) ?? "ar"),
    currency: ((row.currency as PublicSiteSettings["currency"]) ?? "SAR"),
    timezone: (row.timezone as string) ?? "Asia/Riyadh",
    maxDistance: Number(row.max_distance ?? 25),
    commissionRate: Number(row.commission_rate ?? 10),
    minRequestAmount: Number(row.min_request_amount ?? 50),
    autoAssign: Boolean(row.auto_assign ?? false),
  };
}

/* ---------- Public read (no auth needed) ---------- */

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("*")
    .eq("id", "global")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return rowToPublic(data as Record<string, unknown> | null);
});

/* ---------- Admin write of public settings ---------- */

export const updateSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(PublicSettingsSchema)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("site_settings")
      .update({
        site_names: data.siteNames,
        logo_url: data.logoUrl,
        favicon_url: data.faviconUrl,
        colors: data.colors,
        default_language: data.defaultLanguage,
        currency: data.currency,
        timezone: data.timezone,
        max_distance: data.maxDistance,
        commission_rate: data.commissionRate,
        min_request_amount: data.minRequestAmount,
        auto_assign: data.autoAssign,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      })
      .eq("id", "global");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Admin read/write of private settings ---------- */

export const getPrivateSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin
      .from("site_settings_private")
      .select("*")
      .eq("id", "global")
      .maybeSingle();
    if (error) throw new Error(error.message);
    const smtp = (data?.smtp ?? {}) as Partial<SiteSmtp>;
    const notifications = (data?.notifications ?? {}) as Partial<SiteNotifications>;
    const security = (data?.security ?? {}) as Partial<SiteSecurity>;
    return {
      smtp: { ...DEFAULT_SMTP, ...smtp } as SiteSmtp,
      notifications: { ...DEFAULT_NOTIFICATIONS, ...notifications } as SiteNotifications,
      security: { ...DEFAULT_SECURITY, ...security } as SiteSecurity,
    };
  });

export const updatePrivateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      smtp: SmtpSchema,
      notifications: NotificationsSchema,
      security: SecuritySchema,
    }),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("site_settings_private")
      .update({
        smtp: data.smtp,
        notifications: data.notifications,
        security: data.security,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      })
      .eq("id", "global");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Asset upload ---------- */

export const uploadBrandingAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      kind: z.enum(["logo", "favicon"]),
      filename: z.string().min(1),
      contentType: z.string().min(1),
      /* base64-encoded bytes without data URL prefix */
      dataBase64: z.string().min(1),
    }),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const ext = data.filename.includes(".") ? data.filename.split(".").pop() : "bin";
    const objectKey = `${data.kind}-${Date.now()}.${ext}`;
    const bytes = Buffer.from(data.dataBase64, "base64");
    const { error } = await supabaseAdmin.storage
      .from("branding")
      .upload(objectKey, bytes, { contentType: data.contentType, upsert: true });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("branding").getPublicUrl(objectKey);
    return { url: pub.publicUrl };
  });
