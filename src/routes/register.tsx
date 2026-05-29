import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { AuthLayout } from "@/components/AuthLayout";
import { toast } from "sonner";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { registerWithGmail } from "@/lib/api/email.functions";
import { welcomeEmailHtml } from "@/lib/email-config";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "customer",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = t("meta_register_title");
  }, [t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await registerWithGmail({
        data: {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone,
          role: form.role as "customer" | "employee",
          welcome: {
            subject: t("welcome_email_subject"),
            html: welcomeEmailHtml({ fullName: form.full_name, appName: t("app_name") }),
          },
        },
      });

      if (!res.ok) {
        setLoading(false);
        toast.error(res.error);
        return;
      }

      if (res.emailWarning) {
        console.warn("welcome email failed:", res.emailWarning);
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (signInError) {
        setLoading(false);
        toast.error(signInError.message);
        return;
      }

      toast.success(t("toast_account_created"));
      setLoading(false);
      nav({
        to: form.role === "employee" ? "/employee/dashboard" : "/customer/dashboard",
      });
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : "Registration failed";
      toast.error(message);
    }
  };

  return (
    <AuthLayout
      title={t("create_account")}
      subtitle={t("start_journey")}
      step="02"
      display={t("create_account")}
      accent="today."
    >
      <form onSubmit={submit} className="space-y-7">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-7">
          <div className="space-y-1.5">
            <label htmlFor="full_name" className="label-mono block text-muted-foreground">
              {t("full_name")}
            </label>
            <input
              id="full_name"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="input-edit"
              placeholder="—"
              autoComplete="name"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="phone" className="label-mono block text-muted-foreground">
              {t("phone")}
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-edit"
              placeholder="+90 ___ ___ __ __"
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="label-mono block text-muted-foreground">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input-edit"
            placeholder="name@example.com"
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="label-mono block text-muted-foreground">
            {t("password")}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-edit pe-10"
              placeholder={t("six_digits")}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute end-0 bottom-2.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="label-mono text-muted-foreground">{t("i_am_a")}</p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { v: "customer", label: t("customer") },
                { v: "employee", label: t("employee") },
              ] as const
            ).map((opt) => (
              <button
                type="button"
                key={opt.v}
                onClick={() => setForm({ ...form, role: opt.v })}
                className="role-chip"
                data-active={form.role === opt.v}
              >
                <span className="font-display text-lg leading-none">{opt.label}</span>
                {form.role === opt.v && (
                  <span className="ms-auto h-2 w-2 bg-[var(--color-primary)]" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-stamp mt-2" disabled={loading}>
          <span className="inline-flex items-center gap-3">
            {loading ? "…" : t("create_account")}
            {!loading && <ArrowUpRight className="h-4 w-4" />}
          </span>
        </button>
      </form>

      <div className="mt-10 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="label-mono text-muted-foreground">{t("have_account")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Link
        to="/login"
        className="mt-4 inline-flex items-center justify-between w-full border border-foreground/80 px-4 py-3 group hover:bg-foreground hover:text-background transition-colors"
      >
        <span className="font-display text-lg">{t("sign_in")}</span>
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 rtl:group-hover:-translate-x-1" />
      </Link>
    </AuthLayout>
  );
}
