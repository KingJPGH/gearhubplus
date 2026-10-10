import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_super_admin", { _user: userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Réservé au super administrateur.");
}

export const listSuperAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, created_at")
      .eq("role", "super_admin")
      .order("created_at");
    if (error) throw new Error(error.message);
    const ids = data.map((r) => r.user_id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    return data.map((r) => ({
      ...r,
      profiles: profiles?.find((p) => p.id === r.user_id) ?? null,
    }));
  });

const addSchema = z.object({ email: z.string().trim().email().max(255) });

export const addSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => addSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, is_offline")
      .ilike("email", data.email)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile || profile.is_offline) {
      throw new Error("Aucun compte avec ce courriel. La personne doit d'abord s'inscrire.");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: profile.id, role: "super_admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const removeSchema = z.object({ userId: z.string().uuid() });

export const removeSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => removeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) {
      throw new Error("Vous ne pouvez pas retirer vos propres droits super administrateur.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "super_admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
