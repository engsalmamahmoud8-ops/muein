import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { AuthLayout } from "@/components/AuthLayout";
import { toast } from "sonner";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  component: Forgot,
});

function Forgot() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = t("reset_password");
  }, [t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success(t("send_reset_link"));
  };

  return (
    <AuthLayout
      title={t("reset_password")}
      subtitle={t("forgot_password")}
      kicker="recover"
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

        <button type="submit" className="btn-stamp mt-2" disabled={loading}>
          <span className="inline-flex items-center gap-3">
            {loading ? "…" : t("send_reset_link")}
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
