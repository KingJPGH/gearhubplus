import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Plus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/lib/roles";
import { categoryChipClass } from "@/lib/equipment-categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/days/$dayId")({
  head: () => ({
    meta: [
      { title: "Journée de tournage — Plateau" },
      {
        name: "description",
        content: "Équipe présente, équipement à apporter et demandes spéciales de la journée.",
      },
      { property: "og:title", content: "Journée de tournage — Plateau" },
      { property: "og:description", content: "Équipement et notes de la journée de tournage." },
    ],
  }),
  component: DayPage,
});

type ProfileLite = { full_name: string | null; email: string | null; role_title: string | null };

function DayPage() {
  const { dayId } = Route.useParams();
  const queryClient = useQueryClient();
  const [request, setRequest] = useState({ label: "", details: "" });

  const day = useQuery({
    queryKey: ["shoot-day", dayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoot_days")
        .select("*, projects(id, name, company_id)")
        .eq("id", dayId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const project = day.data?.projects as { id: string; name: string; company_id: string } | null;

  const role = useQuery({
    queryKey: ["company-role", project?.company_id],
    enabled: !!project?.company_id,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("company_members")
        .select("role")
        .eq("company_id", project!.company_id)
        .eq("user_id", auth.user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role ?? null;
    },
  });
  const isSuper = useIsSuperAdmin();
  const isAdmin = role.data === "admin" || isSuper;

  const dayCrew = useQuery({
    queryKey: ["day-members", dayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoot_day_members")
        .select("id, user_id, profiles:user_id(full_name, email, role_title)")
        .eq("shoot_day_id", dayId);
      if (error) throw error;
      return data;
    },
  });

  const projectCrew = useQuery({
    queryKey: ["project-members", project?.id],
    enabled: !!project?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("user_id, profiles:user_id(full_name, email, role_title)")
        .eq("project_id", project!.id);
      if (error) throw error;
      return data;
    },
  });

  const crewIds = (dayCrew.data ?? []).map((m) => m.user_id);

  const gear = useQuery({
    queryKey: ["day-gear-pool", dayId, crewIds.join(",")],
    enabled: crewIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .in("owner_id", crewIds)
        .eq("is_available", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const blocked = useQuery({
    queryKey: ["day-gear-blocked", dayId, day.data?.shoot_date],
    enabled: !!day.data?.shoot_date,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_unavailability")
        .select("equipment_id")
        .eq("unavailable_on", day.data!.shoot_date);
      if (error) throw error;
      return data.map((r) => r.equipment_id);
    },
  });

  const selected = useQuery({
    queryKey: ["day-gear", dayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoot_day_equipment")
        .select("id, equipment_id, owner_id, equipment(name, category, serial_number, quantity)")
        .eq("shoot_day_id", dayId);
      if (error) throw error;
      return data;
    },
  });

  const requests = useQuery({
    queryKey: ["day-requests", dayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoot_day_requests")
        .select("*")
        .eq("shoot_day_id", dayId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const toggleCrew = useMutation({
    mutationFn: async ({ userId, add }: { userId: string; add: boolean }) => {
      if (add) {
        const { error } = await supabase
          .from("shoot_day_members")
          .insert({ shoot_day_id: dayId, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("shoot_day_members")
          .delete()
          .eq("shoot_day_id", dayId)
          .eq("user_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["day-members", dayId] });
      queryClient.invalidateQueries({ queryKey: ["day-gear", dayId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleGear = useMutation({
    mutationFn: async ({
      equipmentId,
      ownerId,
      add,
    }: {
      equipmentId: string;
      ownerId: string;
      add: boolean;
    }) => {
      if (add) {
        const { error } = await supabase
          .from("shoot_day_equipment")
          .insert({ shoot_day_id: dayId, equipment_id: equipmentId, owner_id: ownerId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("shoot_day_equipment")
          .delete()
          .eq("shoot_day_id", dayId)
          .eq("equipment_id", equipmentId);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["day-gear", dayId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addRequest = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("shoot_day_requests").insert({
        shoot_day_id: dayId,
        created_by: auth.user!.id,
        label: request.label.trim(),
        details: request.details.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setRequest({ label: "", details: "" });
      queryClient.invalidateQueries({ queryKey: ["day-requests", dayId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolveRequest = useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { error } = await supabase
        .from("shoot_day_requests")
        .update({ is_resolved: resolved })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["day-requests", dayId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedIds = new Set((selected.data ?? []).map((s) => s.equipment_id));
  const blockedIds = new Set(blocked.data ?? []);

  type PoolItem = NonNullable<typeof gear.data>[number];
  type SelectedRow = NonNullable<typeof selected.data>[number];

  const poolByOwner = Object.entries(
    (gear.data ?? [])
      .filter((item) => !blockedIds.has(item.id) && !selectedIds.has(item.id))
      .reduce<Record<string, PoolItem[]>>((acc, item) => {
        (acc[item.owner_id] ??= []).push(item);
        return acc;
      }, {}),
  );

  const selectedByOwner = Object.entries(
    (selected.data ?? []).reduce<Record<string, SelectedRow[]>>((acc, row) => {
      (acc[row.owner_id] ??= []).push(row);
      return acc;
    }, {}),
  );

  const nameFor = (userId: string) => {
    const row =
      dayCrew.data?.find((m) => m.user_id === userId) ??
      projectCrew.data?.find((m) => m.user_id === userId);
    const p = row?.profiles as ProfileLite | null;
    return p?.full_name || p?.email || "Membre";
  };

  const dateLabel = day.data
    ? new Date(`${day.data.shoot_date}T12:00:00`).toLocaleDateString("fr-CA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Journée";

  return (
    <AppShell
      title={dateLabel}
      subtitle={
        [day.data?.title, day.data?.location, day.data?.call_time].filter(Boolean).join(" · ") ||
        undefined
      }
      breadcrumb={
        project ? (
          <span className="flex flex-wrap items-center gap-1">
            <Link to="/companies/$companyId" params={{ companyId: project.company_id }} className="hover:underline">
              Entreprise
            </Link>
            <span>/</span>
            <Link to="/projects/$projectId" params={{ projectId: project.id }} className="hover:underline">
              {project.name}
            </Link>
          </span>
        ) : null
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="space-y-6">
          <div>
            <p className="label-tech mb-2">Équipe présente</p>
            <div className="panel divide-y divide-border">
              {(isAdmin ? projectCrew.data : dayCrew.data)?.length ? (
                (isAdmin ? projectCrew.data : dayCrew.data)!.map((row) => {
                  const p = row.profiles as ProfileLite | null;
                  const on = crewIds.includes(row.user_id);
                  return (
                    <div key={row.user_id} className="flex items-center gap-2 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {p?.full_name || p?.email || "Membre"}
                        </p>
                        {p?.role_title ? <p className="label-tech">{p.role_title}</p> : null}
                      </div>
                      {isAdmin ? (
                        <button
                          onClick={() => toggleCrew.mutate({ userId: row.user_id, add: !on })}
                          className={
                            on
                              ? "rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-brand-foreground"
                              : "rounded-md border border-input px-2.5 py-1 text-xs text-muted-foreground"
                          }
                        >
                          {on ? "Présent" : "Ajouter"}
                        </button>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="p-6 text-sm text-muted-foreground">Aucun membre assigné.</p>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 rounded-lg head-strip-2 px-3 py-2">
              <span className="size-2 rounded-full bg-tint-5" />
              <p className="label-tech">Disponible — à choisir</p>
              <span className="label-tech ml-auto">
                {poolByOwner.reduce((n, [, items]) => n + items.length, 0)} item(s)
              </span>
            </div>
            <div className="space-y-3">
              {poolByOwner.length ? (
                poolByOwner.map(([ownerId, items]) => (
                  <div key={ownerId} className="panel overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border bg-accent/60 px-3 py-2">
                      <p className="text-sm font-medium">{nameFor(ownerId)}</p>
                      <span className="label-tech">{items.length} dispo.</span>
                    </div>
                    <div className="divide-y divide-border">
                      {items.map((item) => {
                        const on = selectedIds.has(item.id);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-medium">{item.name}</p>
                                <span
                                  className={cn(
                                    "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                    categoryChipClass(item.category),
                                  )}
                                >
                                  {item.category ?? "Sans catégorie"}
                                </span>
                                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                  ×{item.quantity}
                                </span>
                              </div>
                            </div>
                            {isAdmin ? (
                              <button
                                onClick={() =>
                                  toggleGear.mutate({
                                    equipmentId: item.id,
                                    ownerId: item.owner_id,
                                    add: !on,
                                  })
                                }
                                className={
                                  on
                                    ? "rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-brand-foreground"
                                    : "rounded-md bg-tint-5-soft px-2.5 py-1 text-xs font-medium text-tint-5"
                                }
                              >
                                {on ? "Retenu" : "Choisir"}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="panel p-6 text-sm text-muted-foreground">
                  Tout l'équipement disponible a été choisi (ou aucun membre présent).
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <div className="mb-2 flex items-center gap-2 rounded-lg head-strip px-3 py-2">
              <span className="size-2 rounded-full bg-brand" />
              <p className="label-tech">Choisi — à apporter</p>
              <span className="label-tech ml-auto">{selected.data?.length ?? 0} item(s)</span>
            </div>
            <div className="space-y-3">
              {selectedByOwner.length ? (
                selectedByOwner.map(([ownerId, rows]) => (
                  <div key={ownerId} className="panel-accent overflow-hidden border-l-4 border-l-brand">
                    <div className="flex items-center justify-between border-b border-border bg-brand-soft px-3 py-2">
                      <p className="text-sm font-medium">{nameFor(ownerId)}</p>
                      <span className="label-tech">{rows.length} item(s)</span>
                    </div>
                    <div className="divide-y divide-border">
                      {rows.map((row) => {
                        const eq = row.equipment as {
                          name: string;
                          category: string | null;
                          serial_number: string | null;
                          quantity: number;
                        } | null;
                        return (
                          <div key={row.id} className="flex items-center gap-2 p-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-medium">{eq?.name}</p>
                                <span
                                  className={cn(
                                    "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                    categoryChipClass(eq?.category),
                                  )}
                                >
                                  {eq?.category ?? "Sans catégorie"}
                                </span>
                                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                  ×{eq?.quantity ?? 1}
                                </span>
                              </div>
                              {eq?.serial_number ? (
                                <p className="label-tech mt-1">{eq.serial_number}</p>
                              ) : null}
                            </div>
                            {isAdmin ? (
                              <button
                                onClick={() =>
                                  toggleGear.mutate({
                                    equipmentId: row.equipment_id,
                                    ownerId: row.owner_id,
                                    add: false,
                                  })
                                }
                                className="rounded-md border border-input px-2.5 py-1 text-xs text-muted-foreground hover:text-destructive"
                              >
                                Retirer
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="panel p-6 text-sm text-muted-foreground">
                  Rien de retenu pour l'instant.
                </p>
              )}
            </div>
          </div>


          <div>
            <p className="label-tech mb-2">Équipement manquant / demandes spéciales</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (request.label.trim()) addRequest.mutate();
              }}
              className="panel mb-3 space-y-2 p-3"
            >
              <input
                value={request.label}
                onChange={(e) => setRequest({ ...request, label: e.target.value })}
                placeholder="Ex. Trépied lourd manquant"
                maxLength={120}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                value={request.details}
                onChange={(e) => setRequest({ ...request, details: e.target.value })}
                placeholder="Détails, note pour l'équipe (optionnel)"
                maxLength={1000}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground"
              >
                <Plus className="size-4" /> Ajouter la demande
              </button>
            </form>

            <div className="space-y-2">
              {requests.data?.map((r) => (
                <div key={r.id} className="panel flex items-start gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        r.is_resolved
                          ? "text-sm font-medium text-muted-foreground line-through"
                          : "text-sm font-medium"
                      }
                    >
                      {r.label}
                    </p>
                    {r.details ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">{r.details}</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => resolveRequest.mutate({ id: r.id, resolved: !r.is_resolved })}
                    title={r.is_resolved ? "Rouvrir" : "Marquer réglé"}
                    className="rounded-md border border-input p-1.5 text-muted-foreground hover:bg-accent"
                  >
                    {r.is_resolved ? <X className="size-4" /> : <Check className="size-4" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
