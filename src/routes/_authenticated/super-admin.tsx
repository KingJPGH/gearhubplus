import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, CalendarDays, FolderKanban, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/super-admin")({
  head: () => ({
    meta: [
      { title: "Super administration — Plateau" },
      {
        name: "description",
        content:
          "Vue globale des entreprises, membres, projets et journées de tournage de l'application.",
      },
      { property: "og:title", content: "Super administration — Plateau" },
      {
        property: "og:description",
        content: "Contrôle total sur toutes les données de Plateau.",
      },
    ],
  }),
  component: SuperAdminPage,
});

const inputClass =
  "rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring";

function SuperAdminPage() {
  const isSuper = useIsSuperAdmin();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"companies" | "projects" | "days" | "members">("companies");

  const companies = useQuery({
    queryKey: ["sa-companies"],
    enabled: isSuper,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const projects = useQuery({
    queryKey: ["sa-projects"],
    enabled: isSuper,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, company_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const days = useQuery({
    queryKey: ["sa-days"],
    enabled: isSuper,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoot_days")
        .select("id, shoot_date, title, location, project_id")
        .order("shoot_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const members = useQuery({
    queryKey: ["sa-members"],
    enabled: isSuper,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role_title, is_offline")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const rename = useMutation({
    mutationFn: async ({
      table,
      id,
      value,
      key,
    }: {
      table: "companies" | "projects" | "shoot_days" | "profiles";
      id: string;
      value: string;
      key: string;
    }) => {
      const { error } =
        table === "companies"
          ? await supabase.from("companies").update({ name: value }).eq("id", id)
          : table === "projects"
            ? await supabase.from("projects").update({ name: value }).eq("id", id)
            : table === "shoot_days"
              ? await supabase.from("shoot_days").update({ title: value }).eq("id", id)
              : await supabase.from("profiles").update({ full_name: value }).eq("id", id);
      if (error) throw error;
      return key;
    },
    onSuccess: (key) => {
      queryClient.invalidateQueries({ queryKey: [key] });
      toast.success("Modifié");
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const remove = useMutation({
    mutationFn: async ({
      table,
      id,
      key,
    }: {
      table: "companies" | "projects" | "shoot_days" | "profiles";
      id: string;
      key: string;
    }) => {
      const { error } =
        table === "companies"
          ? await supabase.from("companies").delete().eq("id", id)
          : table === "projects"
            ? await supabase.from("projects").delete().eq("id", id)
            : table === "shoot_days"
              ? await supabase.from("shoot_days").delete().eq("id", id)
              : await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
      return key;
    },
    onSuccess: (key) => {
      queryClient.invalidateQueries({ queryKey: [key] });
      toast.success("Supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isSuper) {
    return (
      <AppShell title="Super administration">
        <div className="panel p-6 text-sm text-muted-foreground">
          Cette section est réservée au super administrateur.
        </div>
      </AppShell>
    );
  }

  const TABS = [
    { key: "companies", label: "Entreprises", icon: Building2, count: companies.data?.length },
    { key: "projects", label: "Projets", icon: FolderKanban, count: projects.data?.length },
    { key: "days", label: "Journées", icon: CalendarDays, count: days.data?.length },
    { key: "members", label: "Membres", icon: Users, count: members.data?.length },
  ] as const;

  const companyName = (id: string) => companies.data?.find((c) => c.id === id)?.name ?? "—";
  const projectName = (id: string) => projects.data?.find((p) => p.id === id)?.name ?? "—";

  return (
    <AppShell
      title="Super administration"
      subtitle="Toutes les entreprises, membres, projets et journées créés dans l'application."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground"
                : "inline-flex items-center gap-1.5 rounded-full border border-input px-4 py-1.5 text-sm text-muted-foreground hover:bg-accent"
            }
          >
            <t.icon className="size-4" /> {t.label}
            <span className="text-xs opacity-70">{t.count ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {tab === "companies" &&
          companies.data?.map((c) => (
            <Row
              key={c.id}
              value={c.name}
              meta={`Créée le ${new Date(c.created_at).toLocaleDateString("fr-CA")}`}
              link={
                <Link
                  to="/companies/$companyId"
                  params={{ companyId: c.id }}
                  className="text-xs text-brand hover:underline"
                >
                  Ouvrir
                </Link>
              }
              onSave={(name) =>
                rename.mutate({ table: "companies", id: c.id, values: { name }, key: "sa-companies" })
              }
              onDelete={() => remove.mutate({ table: "companies", id: c.id, key: "sa-companies" })}
            />
          ))}

        {tab === "projects" &&
          projects.data?.map((p) => (
            <Row
              key={p.id}
              value={p.name}
              meta={companyName(p.company_id)}
              link={
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: p.id }}
                  className="text-xs text-brand hover:underline"
                >
                  Ouvrir
                </Link>
              }
              onSave={(name) =>
                rename.mutate({ table: "projects", id: p.id, values: { name }, key: "sa-projects" })
              }
              onDelete={() => remove.mutate({ table: "projects", id: p.id, key: "sa-projects" })}
            />
          ))}

        {tab === "days" &&
          days.data?.map((d) => (
            <Row
              key={d.id}
              value={d.title ?? ""}
              placeholder="Sans titre"
              meta={`${d.shoot_date} · ${projectName(d.project_id)}${d.location ? ` · ${d.location}` : ""}`}
              link={
                <Link
                  to="/days/$dayId"
                  params={{ dayId: d.id }}
                  className="text-xs text-brand hover:underline"
                >
                  Ouvrir
                </Link>
              }
              onSave={(title) =>
                rename.mutate({ table: "shoot_days", id: d.id, values: { title }, key: "sa-days" })
              }
              onDelete={() => remove.mutate({ table: "shoot_days", id: d.id, key: "sa-days" })}
            />
          ))}

        {tab === "members" &&
          members.data?.map((m) => (
            <Row
              key={m.id}
              value={m.full_name}
              meta={[m.email, m.role_title, m.is_offline ? "hors ligne" : null]
                .filter(Boolean)
                .join(" · ")}
              onSave={(full_name) =>
                rename.mutate({
                  table: "profiles",
                  id: m.id,
                  values: { full_name },
                  key: "sa-members",
                })
              }
              onDelete={() => remove.mutate({ table: "profiles", id: m.id, key: "sa-members" })}
            />
          ))}
      </div>
    </AppShell>
  );
}

function Row({
  value,
  meta,
  link,
  placeholder,
  onSave,
  onDelete,
}: {
  value: string;
  meta?: string;
  link?: React.ReactNode;
  placeholder?: string;
  onSave: (value: string) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const dirty = draft !== value;

  return (
    <div className="panel flex flex-wrap items-center gap-3 p-3">
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        className={`${inputClass} min-w-48 flex-1`}
      />
      {meta ? <span className="label-tech min-w-0 flex-1 truncate">{meta}</span> : null}
      {link}
      {dirty ? (
        <button
          onClick={() => onSave(draft.trim())}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground"
        >
          Enregistrer
        </button>
      ) : null}
      <button
        onClick={onDelete}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
        aria-label="Supprimer"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
