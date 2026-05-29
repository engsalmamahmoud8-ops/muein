import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { AuthLayout } from "@/components/AuthLayout";
import { toast } from "sonner";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: Reset,
});

function Reset() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = t("new_password");
  }, [t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("password_updated"));
    nav({ to: "/login" });
  };

  return (
    <AuthLayout
      title={t("new_password")}
      subtitle={t("reset_password")}
      kicker="renew"
    >
      <form onSubmit={submit} className="space-y-7">
        <div className="space-y-1.5">
          <label htmlFor="password" className="label-mono block text-muted-foreground">
            {t("new_password")}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-edit pe-10"
              placeholder="••••••••"
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

        <button type="submit" className="btn-stamp mt-2" disabled={loading}>
          <span className="inline-flex items-center gap-3">
            {loading ? "…" : t("save")}
            {!loading && <ArrowUpRight className="h-4 w-4" />}
          </span>
        </button>
      </form>
    </AuthLayout>
  );
}
