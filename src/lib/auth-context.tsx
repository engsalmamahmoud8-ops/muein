import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/types";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        // fetch role async, don't block
        setTimeout(async () => {
          const { data } = await supabase.rpc("get_user_role", { _user_id: s.user.id });
          setRole(((data as UserRole | null) ?? "customer"));
        }, 0);
      } else {
        setRole(null);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        const { data: r } = await supabase.rpc("get_user_role", { _user_id: data.session.user.id });
        setRole(((r as UserRole | null) ?? "customer"));
      }
      setLoading(false);
    });

    const refreshIfStale = async () => {
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      if (!s?.expires_at) return;
      const secondsLeft = s.expires_at - Math.floor(Date.now() / 1000);
      if (secondsLeft <= 60) await supabase.auth.refreshSession();
    };
    const onVisible = () => { if (document.visibilityState === "visible") void refreshIfStale(); };
    const onOnline = () => { void refreshIfStale(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };

  return <Ctx.Provider value={{ session, user: session?.user ?? null, role, loading, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
