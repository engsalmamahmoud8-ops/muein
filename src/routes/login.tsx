import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { AuthLayout } from "@/components/AuthLayout";
import { toast } from "sonner";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = t("meta_login_title");
  }, [t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: r } = await supabase.rpc("get_user_role", { _user_id: data.user.id });
    const role = (r as string | null) ?? "customer";
    toast.success(t("toast_welcome_back"));
    nav({
      to:
        role === "admin"
          ? "/admin/dashboard"
          : role === "employee"
            ? "/employee/dashboard"
            : "/customer/dashboard",
    });
  };

  return (
    <AuthLayout
      title={t("sign_in")}
      subtitle={t("login_subtitle")}
      step="01"
      display={t("sign_in")}
      accent="again."
    >
      <form onSubmit={submit} className="space-y-7">
        <div className="space-y-1.5">
          <label htmlFor="email" className="label-mono block text-muted-foreground">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-edit"
            placeholder="name@example.com"
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="label-mono flex items-center justify-between text-muted-foreground">
            <span>{t("password")}</span>
            <Link
              to="/forgot-password"
              className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-foreground hover:text-primary transition-colors"
            >
              {t("forgot_password")}
            </Link>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-edit pe-10"
              placeholder="••••••••"
              autoComplete="current-password"
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

        <button type="submit" className="btn-stamp mt-2" disabled={loading}>
          <span className="inline-flex items-center gap-3">
            {loading ? "…" : t("sign_in")}
            {!loading && <ArrowUpRight className="h-4 w-4" />}
          </span>
        </button>
      </form>

      <div className="mt-10 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="label-mono text-muted-foreground">{t("no_account")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Link
        to="/register"
        className="mt-4 inline-flex items-center justify-between w-full border border-foreground/80 px-4 py-3 group hover:bg-foreground hover:text-background transition-colors"
      >
        <span className="font-display text-lg">{t("create_account")}</span>
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 rtl:group-hover:-translate-x-1" />
      </Link>
    </AuthLayout>
  );
}
