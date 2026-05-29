import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
};

async function loadSmtpFromDb(): Promise<SmtpConfig | null> {
  const { data, error } = await supabaseAdmin
    .from("site_settings_private")
    .select("smtp")
    .eq("id", "global")
    .maybeSingle();
  if (error || !data) return null;
  const smtp = data.smtp as Partial<SmtpConfig> | null;
  if (!smtp || !smtp.host || !smtp.user || !smtp.password || !smtp.fromEmail) return null;
  return {
    host: smtp.host,
    port: smtp.port ?? 465,
    secure: smtp.secure ?? true,
    user: smtp.user,
    password: smtp.password,
    fromEmail: smtp.fromEmail,
    fromName: smtp.fromName ?? "Ymnak",
  };
}

async function sendViaSmtp(opts: {
  smtp: SmtpConfig;
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: opts.smtp.host,
    port: opts.smtp.port,
    secure: opts.smtp.secure,
    auth: { user: opts.smtp.user, pass: opts.smtp.password },
  });
  const info = await transporter.sendMail({
    from: `"${opts.smtp.fromName}" <${opts.smtp.fromEmail}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  return info.messageId;
}

const EmailPayloadSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
});

export const sendEmail = createServerFn({ method: "POST" })
  .inputValidator(EmailPayloadSchema)
  .handler(async ({ data }) => {
    try {
      const smtp = await loadSmtpFromDb();
      if (!smtp) return { ok: false as const, error: "SMTP not configured" };
      const messageId = await sendViaSmtp({ smtp, ...data });
      return { ok: true as const, messageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email send failed";
      return { ok: false as const, error: message };
    }
  });

const RegisterPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  phone: z.string().optional().default(""),
  role: z.enum(["customer", "employee"]),
  welcome: z
    .object({
      subject: z.string().min(1),
      html: z.string().min(1),
    })
    .optional(),
});

export const registerWithGmail = createServerFn({ method: "POST" })
  .inputValidator(RegisterPayloadSchema)
  .handler(async ({ data }) => {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        phone: data.phone ?? "",
        role: data.role,
      },
    });

    if (error || !created.user) {
      return {
        ok: false as const,
        error: error?.message ?? "Failed to create user",
      };
    }

    let emailWarning: string | null = null;
    if (data.welcome) {
      try {
        const smtp = await loadSmtpFromDb();
        if (smtp) {
          await sendViaSmtp({
            smtp,
            to: data.email,
            subject: data.welcome.subject,
            html: data.welcome.html,
          });
        } else {
          emailWarning = "SMTP not configured";
        }
      } catch (err) {
        emailWarning = err instanceof Error ? err.message : "Welcome email failed";
      }
    }

    return { ok: true as const, userId: created.user.id, emailWarning };
  });
