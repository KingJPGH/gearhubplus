import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Plus, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/settings";
import { useIsSuperAdmin } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Entreprises — GearUp" },
      { name: "description", content: "Vos entreprises de production et vos projets actifs." },
      { property: "og:title", content: "Entreprises — GearUp" },
      { property: "og:description", content: "Vos entreprises de production et vos projets." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();
  const t = useT();
  const isSuper = useIsSuperAdmin();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user!.id;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile.data) {
      setProfileName(profile.data.full_name ?? "");
      setRoleTitle(profile.data.role_title ?? "");
    }
  }, [profile.data]);

  const companies = useQuery({
    queryKey: ["companies", isSuper],
    queryFn: async () => {
      if (isSuper) {
        const { data, error } = await supabase
          .from("companies")
          .select("id, name")
          .order("created_at");
        if (error) throw error;
        return data.map((c) => ({ role: "admin", companies: c }));
      }
      const { data, error } = await supabase
        .from("company_members")
        .select("role, companies(id, name)")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const createCompany = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("companies")
        .insert({ name: name.trim(), created_by: auth.user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setOpen(false);
      toast.success("Entreprise créée");
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: profileName.trim(), role_title: roleTitle.trim() || null })
        .eq("id", auth.user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil mis à jour");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title={t("dash.title")}
      subtitle={t("dash.subtitle")}
      actions={
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 btn-brand px-4 py-2 text-sm"
        >
          <Plus className="size-4" /> {t("dash.new")}
        </button>
      }
    >
      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) createCompany.mutate();
          }}
          className="panel mb-6 flex flex-wrap gap-2 p-4"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Idvision Production"
            maxLength={100}
            required
            className="min-w-56 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={createCompany.isPending}
            className="btn-brand px-5 py-2 text-sm disabled:opacity-60"
          >
            {t("dash.create")}
          </button>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          {companies.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : companies.data?.length ? (
            companies.data.map((row) => {
              const company = row.companies as { id: string; name: string } | null;
              if (!company) return null;
              return (
                <Link
                  key={company.id}
                  to="/companies/$companyId"
                  params={{ companyId: company.id }}
                  className="panel flex items-center gap-3 p-4 transition-colors hover:bg-accent"
                >
                  <span className="flex size-9 items-center justify-center rounded-md bg-brand-soft text-primary">
                    <Building2 className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{company.name}</p>
                    <p className="label-tech">{row.role === "admin" ? t("dash.admin") : t("dash.member")}</p>
                  </div>
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                </Link>
              );
            })
          ) : (
            <div className="panel p-6 text-sm text-muted-foreground">
              {t("dash.empty")}
            </div>
          )}
        </div>

        <div className="panel h-fit p-5">
          <p className="label-tech">{t("dash.profile")}</p>
          <div className="mt-3 space-y-2">
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder={t("dash.fullname")}
              maxLength={80}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder={t("dash.roletitle")}
              maxLength={80}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">{profile.data?.email}</p>
            <button
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending}
              className="w-full rounded-md border border-input px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
            >
              {t("dash.save")}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
