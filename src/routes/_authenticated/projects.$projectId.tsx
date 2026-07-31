import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronRight, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Projet — Plateau" },
      { name: "description", content: "Équipe et journées de tournage du projet." },
      { property: "og:title", content: "Projet — Plateau" },
      { property: "og:description", content: "Équipe et journées de tournage du projet." },
    ],
  }),
  component: ProjectPage,
});

function ProjectPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [day, setDay] = useState({ date: "", title: "", location: "", callTime: "" });

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, companies(id, name)")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const companyId = (project.data?.companies as { id: string; name: string } | null)?.id;

  const role = useQuery({
    queryKey: ["company-role", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("company_members")
        .select("role")
        .eq("company_id", companyId!)
        .eq("user_id", auth.user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role ?? null;
    },
  });
  const isSuper = useIsSuperAdmin();
  const isAdmin = role.data === "admin" || isSuper;

  const days = useQuery({
    queryKey: ["shoot-days", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoot_days")
        .select("*")
        .eq("project_id", projectId)
        .order("shoot_date");
      if (error) throw error;
      return data;
    },
  });

  const crew = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("id, user_id, profiles:user_id(full_name, email, role_title)")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const companyPeople = useQuery({
    queryKey: ["company-members", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("user_id, profiles:user_id(full_name, email)")
        .eq("company_id", companyId!);
      if (error) throw error;
      return data;
    },
  });

  const createDay = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("shoot_days").insert({
        project_id: projectId,
        shoot_date: day.date,
        title: day.title.trim() || null,
        location: day.location.trim() || null,
        call_time: day.callTime.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDay({ date: "", title: "", location: "", callTime: "" });
      queryClient.invalidateQueries({ queryKey: ["shoot-days", projectId] });
      toast.success("Journée de tournage créée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleCrew = useMutation({
    mutationFn: async ({ userId, add }: { userId: string; add: boolean }) => {
      if (add) {
        const { error } = await supabase
          .from("project_members")
          .insert({ project_id: projectId, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_members")
          .delete()
          .eq("project_id", projectId)
          .eq("user_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-members", projectId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const assigned = new Set((crew.data ?? []).map((c) => c.user_id));

  return (
    <AppShell
      title={project.data?.name ?? "Projet"}
      subtitle={isAdmin ? "Administrateur du projet." : "Membre du projet."}
      breadcrumb={
        <span className="flex flex-wrap items-center gap-1">
          <Link to="/dashboard" className="hover:underline">
            Entreprises
          </Link>
          <span>/</span>
          {companyId ? (
            <Link
              to="/companies/$companyId"
              params={{ companyId }}
              className="hover:underline"
            >
              {(project.data?.companies as { name: string } | null)?.name}
            </Link>
          ) : null}
        </span>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section>
          <p className="label-tech mb-2">Journées de tournage</p>
          {isAdmin ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (day.date) createDay.mutate();
              }}
              className="panel mb-3 grid gap-2 p-3 sm:grid-cols-2"
            >
              <input
                type="date"
                value={day.date}
                onChange={(e) => setDay({ ...day, date: e.target.value })}
                required
                className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={day.title}
                onChange={(e) => setDay({ ...day, title: e.target.value })}
                placeholder="Titre (ex. Bloc 3, scènes 12-18)"
                maxLength={120}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={day.location}
                onChange={(e) => setDay({ ...day, location: e.target.value })}
                placeholder="Lieu"
                maxLength={120}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <input
                  value={day.callTime}
                  onChange={(e) => setDay({ ...day, callTime: e.target.value })}
                  placeholder="Heure d'appel"
                  maxLength={30}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground"
                >
                  <Plus className="size-4" /> Journée
                </button>
              </div>
            </form>
          ) : null}

          <div className="space-y-2">
            {days.data?.length ? (
              days.data.map((d) => (
                <button
                  key={d.id}
                  onClick={() => navigate({ to: "/days/$dayId", params: { dayId: d.id } })}
                  className="panel flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent"
                >
                  <span className="flex size-9 items-center justify-center rounded-md bg-brand-soft text-primary">
                    <CalendarDays className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {new Date(`${d.shoot_date}T12:00:00`).toLocaleDateString("fr-CA", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="label-tech">
                      {[d.title, d.location, d.call_time].filter(Boolean).join(" · ") || "À planifier"}
                    </p>
                  </div>
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                </button>
              ))
            ) : (
              <div className="panel p-6 text-sm text-muted-foreground">
                Aucune journée de tournage.
              </div>
            )}
          </div>
        </section>

        <section>
          <p className="label-tech mb-2">Équipe du projet</p>
          <div className="panel divide-y divide-border">
            {(isAdmin ? companyPeople.data : crew.data)?.map((row) => {
              const userId = row.user_id;
              const profile = row.profiles as { full_name: string | null; email: string | null } | null;
              const isOn = assigned.has(userId);
              return (
                <div key={userId} className="flex items-center gap-2 p-3">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {profile?.full_name || profile?.email || "Membre"}
                  </span>
                  {isAdmin ? (
                    <button
                      onClick={() => toggleCrew.mutate({ userId, add: !isOn })}
                      className={
                        isOn
                          ? "rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-brand-foreground"
                          : "rounded-md border border-input px-2.5 py-1 text-xs text-muted-foreground"
                      }
                    >
                      {isOn ? "Dans le projet" : "Ajouter"}
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
