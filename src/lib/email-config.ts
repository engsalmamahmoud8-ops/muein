/* SMTP credentials live in the DB now (admin-only RLS).
   This file only keeps the welcome email template that the client renders
   before handing off to the server `sendEmail` / `registerWithGmail` fn. */

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
};

export const DEFAULT_SMTP: SmtpConfig = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  user: "",
  password: "",
  fromEmail: "",
  fromName: "Ymnak",
};

export function isSmtpConfigured(cfg: SmtpConfig): boolean {
  return Boolean(cfg.host && cfg.port && cfg.user && cfg.password && cfg.fromEmail);
}

export function welcomeEmailHtml(opts: { fullName: string; appName: string }) {
  const name = opts.fullName || "صديقنا";
  return `
<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /><title>${opts.appName}</title></head>
<body style="font-family:'Segoe UI',Tahoma,sans-serif;background:#f6f6f6;margin:0;padding:24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08)">
    <tr>
      <td style="background:linear-gradient(135deg,#fde047,#facc15);padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:28px;color:#111;">${opts.appName}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;color:#222;line-height:1.7">
        <h2 style="margin:0 0 12px;font-size:22px;">مرحباً ${name} 👋</h2>
        <p style="margin:0 0 16px;font-size:15px;">
          شكراً لانضمامك إلى <strong>${opts.appName}</strong>. حسابك جاهز للاستخدام الآن.
        </p>
        <p style="margin:0 0 24px;font-size:15px;">
          يمكنك الآن طلب الخدمات، استلام العروض، ومتابعة تنفيذ طلباتك خطوة بخطوة.
        </p>
        <p style="margin:24px 0 0;font-size:13px;color:#666;">
          إن لم تكن أنت من أنشأ هذا الحساب، تجاهل هذه الرسالة.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#fafafa;padding:16px;text-align:center;font-size:12px;color:#888;">
        © ${new Date().getFullYear()} ${opts.appName}
      </td>
    </tr>
  </table>
</body>
</html>`;
}
