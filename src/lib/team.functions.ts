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
