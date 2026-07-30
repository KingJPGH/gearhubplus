import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  companyId: z.string().uuid(),
  email: z.string().trim().email().max(255),
  role: z.enum(["admin", "member"]),
});

export const addCompanyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("is_company_admin", {
      _company: data.companyId,
      _user: context.userId,
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Seul un administrateur peut ajouter des membres.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile) {
      throw new Error("Aucun compte avec ce courriel. La personne doit d'abord s'inscrire.");
    }

    const { error: insertError } = await supabaseAdmin
      .from("company_members")
      .upsert(
        { company_id: data.companyId, user_id: profile.id, role: data.role },
        { onConflict: "company_id,user_id" },
      );
    if (insertError) throw new Error(insertError.message);

    return { ok: true };
  });

const offlineSchema = z.object({
  companyId: z.string().uuid(),
  fullName: z.string().trim().min(1).max(120),
  roleTitle: z.string().trim().max(120).optional(),
  role: z.enum(["admin", "member"]).default("member"),
});

export const createOfflineMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => offlineSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("is_company_admin", {
      _company: data.companyId,
      _user: context.userId,
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Seul un administrateur peut créer un profil hors ligne.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = crypto.randomUUID();
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id,
      full_name: data.fullName,
      role_title: data.roleTitle || null,
      is_offline: true,
      managed_by: context.userId,
    });
    if (profileError) throw new Error(profileError.message);

    const { error: memberError } = await supabaseAdmin
      .from("company_members")
      .insert({ company_id: data.companyId, user_id: id, role: data.role });
    if (memberError) throw new Error(memberError.message);

    return { ok: true, id };
  });
