import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RoleSchema = z.enum(["customer", "employee", "admin"]);

async function assertAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

const BAN_FOREVER = "876000h";

type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  role: "customer" | "employee" | "admin";
  banned_until: string | null;
  created_at: string;
};

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const [profilesRes, rolesRes, usersRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, phone, city, avatar_url, created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (rolesRes.error) throw new Error(rolesRes.error.message);
    if (usersRes.error) throw new Error(usersRes.error.message);

    const roleById = new Map((rolesRes.data ?? []).map((r) => [r.user_id, r.role]));
    const authById = new Map(usersRes.data.users.map((u) => [u.id, u]));

    const rows: AdminUserRow[] = (profilesRes.data ?? []).map((p) => {
      const auth = authById.get(p.id);
      return {
        id: p.id,
        email: auth?.email ?? null,
        full_name: p.full_name,
        phone: p.phone,
        city: p.city,
        avatar_url: p.avatar_url ?? null,
        role: (roleById.get(p.id) as AdminUserRow["role"]) ?? "customer",
        banned_until: (auth as { banned_until?: string | null } | undefined)?.banned_until ?? null,
        created_at: p.created_at as unknown as string,
      };
    });
    rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return rows;
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
      full_name: z.string().min(1),
      phone: z.string().optional(),
      city: z.string().optional(),
      role: RoleSchema,
    }),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);

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
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");

    const id = created.user.id;

    // The signup trigger inserts profile + role + (employees row if role=employee).
    // Patch profile with city/phone we received (trigger only set full_name + phone).
    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        phone: data.phone ?? "",
        city: data.city ?? null,
      })
      .eq("id", id);

    return { id };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      full_name: z.string().min(1),
      phone: z.string().optional(),
      city: z.string().optional(),
      role: RoleSchema,
    }),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);

    const profileUpdate = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        phone: data.phone ?? "",
        city: data.city ?? null,
      })
      .eq("id", data.id);
    if (profileUpdate.error) throw new Error(profileUpdate.error.message);

    // Replace role: delete existing rows then insert new one.
    const delRoles = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    if (delRoles.error) throw new Error(delRoles.error.message);
    const insRole = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.id, role: data.role });
    if (insRole.error) throw new Error(insRole.error.message);

    if (data.role === "employee") {
      const { data: existing } = await supabaseAdmin
        .from("employees")
        .select("id")
        .eq("user_id", data.id)
        .maybeSingle();
      if (!existing) {
        const insEmp = await supabaseAdmin.from("employees").insert({ user_id: data.id });
        if (insEmp.error) throw new Error(insEmp.error.message);
      }
    }

    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("You cannot delete your own account");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), active: z.boolean() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId && !data.active) {
      throw new Error("You cannot deactivate your own account");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: data.active ? "none" : BAN_FOREVER,
    } as { ban_duration: string });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
