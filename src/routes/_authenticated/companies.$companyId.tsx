import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, FolderOpen, Plus, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { addCompanyMember } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/companies/$companyId")({
  head: () => ({
    meta: [
      { title: "Entreprise — Plateau" },
      { name: "description", content: "Projets et membres de cette entreprise de production." },
      { property: "og:title", content: "Entreprise — Plateau" },
      { property: "og:description", content: "Projets et membres de l'entreprise." },
    ],
  }),
  component: CompanyPage,
});

function CompanyPage() {
  const { companyId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const addMemberFn = useServerFn(addCompanyMember);
  const [projectName, setProjectName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "member">("member");

  const company = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const me = useQuery({
    queryKey: ["company-role", companyId],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("company_members")
        .select("role")
        .eq("company_id", companyId)
        .eq("user_id", auth.user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role ?? null;
    },
  });
  const isAdmin = me.data === "admin";

  const projects = useQuery({
    queryKey: ["projects", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const members = useQuery({
    queryKey: ["company-members", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("id, role, user_id, profiles:user_id(full_name, email, role_title)")
        .eq("company_id", companyId);
      if (error) throw error;
      return data;
    },
  });

  const createProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("projects")
        .insert({ company_id: companyId, name: projectName.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setProjectName("");
      queryClient.invalidateQueries({ queryKey: ["projects", companyId] });
      toast.success("Projet créé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMember = useMutation({
    mutationFn: async () =>
      addMemberFn({ data: { companyId, email: memberEmail.trim(), role: memberRole } }),
    onSuccess: () => {
      setMemberEmail("");
      queryClient.invalidateQueries({ queryKey: ["company-members", companyId] });
      toast.success("Membre ajouté");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-members", companyId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title={company.data?.name ?? "Entreprise"}
      subtitle={isAdmin ? "Vous êtes administrateur de cette entreprise." : "Vous êtes membre."}
      breadcrumb={
        <Link to="/dashboard" className="hover:underline">
          Entreprises
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section>
          <p className="label-tech mb-2">Projets</p>
          {isAdmin ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (projectName.trim()) createProject.mutate();
              }}
              className="panel mb-3 flex gap-2 p-3"
            >
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex. Pour la vie saison 2"
                maxLength={120}
                required
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground"
              >
                <Plus className="size-4" /> Projet
              </button>
            </form>
          ) : null}

          <div className="space-y-2">
            {projects.data?.length ? (
              projects.data.map((project) => (
                <button
                  key={project.id}
                  onClick={() =>
                    navigate({ to: "/projects/$projectId", params: { projectId: project.id } })
                  }
                  className="panel flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent"
                >
                  <span className="flex size-9 items-center justify-center rounded-md bg-brand-soft text-primary">
                    <FolderOpen className="size-4" />
                  </span>
                  <span className="font-medium">{project.name}</span>
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                </button>
              ))
            ) : (
              <div className="panel p-6 text-sm text-muted-foreground">Aucun projet.</div>
            )}
          </div>
        </section>

        <section>
          <p className="label-tech mb-2">Membres de l'entreprise</p>
          {isAdmin ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (memberEmail.trim()) addMember.mutate();
              }}
              className="panel mb-3 space-y-2 p-3"
            >
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="courriel@equipe.com"
                maxLength={255}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as "admin" | "member")}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="member">Membre</option>
                  <option value="admin">Administrateur</option>
                </select>
                <button
                  type="submit"
                  disabled={addMember.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-brand-foreground disabled:opacity-60"
                >
                  <UserPlus className="size-4" /> Ajouter
                </button>
              </div>
            </form>
          ) : null}

          <div className="space-y-2">
            {members.data?.map((m) => {
              const profile = m.profiles as {
                full_name: string | null;
                email: string | null;
                role_title: string | null;
              } | null;
              return (
                <div key={m.id} className="panel flex items-center gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {profile?.full_name || profile?.email || "Membre"}
                    </p>
                    <p className="label-tech">
                      {[m.role === "admin" ? "Admin" : "Membre", profile?.role_title]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {isAdmin ? (
                    <button
                      onClick={() => removeMember.mutate(m.id)}
                      className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                    >
                      Retirer
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
