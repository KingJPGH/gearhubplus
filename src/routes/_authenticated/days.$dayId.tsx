import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ClipboardList, Plus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/lib/roles";
import { categoryChipClass, groupByCategory } from "@/lib/equipment-categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/days/$dayId")({
  head: () => ({
    meta: [
      { title: "Journée de tournage — GearUp" },
      {
        name: "description",
        content: "Équipe présente, équipement à apporter et demandes spéciales de la journée.",
      },
      { property: "og:title", content: "Journée de tournage — GearUp" },
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

  const memberBlocked = useQuery({
    queryKey: ["day-member-blocked", dayId, day.data?.shoot_date],
    enabled: !!day.data?.shoot_date,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_unavailability")
        .select("profile_id")
        .eq("unavailable_on", day.data!.shoot_date);
      if (error) throw error;
      return data.map((r) => r.profile_id);
    },
  });

  const conflicts = useQuery({
    queryKey: ["day-gear-conflicts", dayId, day.data?.shoot_date, crewIds.join(",")],
    enabled: !!day.data?.shoot_date && crewIds.length > 0 && (gear.data?.length ?? 0) > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("equipment_conflicts_on", {
        _date: day.data!.shoot_date,
        _ids: (gear.data ?? []).map((g) => g.id),
      });
      if (error) throw error;
      return data;
    },
  });

  const kits = useQuery({
    queryKey: ["day-kits", crewIds.join(",")],
    enabled: crewIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kits")
        .select("id, name, owner_id, kit_items(equipment_id)")
        .in("owner_id", crewIds)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const selected = useQuery({
    queryKey: ["day-gear", dayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoot_day_equipment")
        .select(
          "id, equipment_id, owner_id, equipment(name, category, serial_number, quantity, notes)",
        )
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
  const blockedOwners = new Set(memberBlocked.data ?? []);
  const conflictById = new Map(
    (conflicts.data ?? [])
      .filter((c) => c.shoot_day_id !== dayId)
      .map((c) => [c.equipment_id, c] as const),
  );

  type PoolItem = NonNullable<typeof gear.data>[number];
  type SelectedRow = NonNullable<typeof selected.data>[number];

  const blockReason = (item: PoolItem): string | null => {
    const conflict = conflictById.get(item.id);
    if (conflict)
      return `Utilisé par « ${conflict.project_name} »${conflict.day_title ? ` — ${conflict.day_title}` : ""}`;
    if (blockedOwners.has(item.owner_id)) return "Membre indisponible cette journée";
    if (blockedIds.has(item.id)) return "Bloqué par le propriétaire cette journée";
    return null;
  };

  const poolByOwner = Object.entries(
    (gear.data ?? [])
      .filter((item) => !selectedIds.has(item.id))
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

  const equipmentOf = (row: SelectedRow) =>
    row.equipment as {
      name: string;
      category: string | null;
      serial_number: string | null;
      quantity: number;
    } | null;


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
      actions={
        <Dialog>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-sm transition-transform hover:-translate-y-px">
              <ClipboardList className="size-4" /> Récapitulatif
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Récapitulatif — {dateLabel}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {[day.data?.title, day.data?.location, day.data?.call_time]
                .filter(Boolean)
                .join(" · ") || "Journée de tournage"}
            </p>
            <div className="space-y-4">
              {selectedByOwner.length ? (
                selectedByOwner.map(([ownerId, rows]) => (
                  <div key={ownerId} className="rounded-xl border border-border p-3">
                    <p className="mb-2 text-sm font-semibold">
                      {nameFor(ownerId)}{" "}
                      <span className="text-muted-foreground">— {rows.length} item(s)</span>
                    </p>
                    {groupByCategory(rows, (r) => equipmentOf(r)?.category).map(
                      ([category, catRows]) => (
                        <div key={category} className="mt-2">
                          <p className="label-tech">{category}</p>
                          <ul className="mt-1 space-y-0.5 text-sm">
                            {catRows.map((r) => {
                              const eq = equipmentOf(r);
                              return (
                                <li key={r.id}>
                                  • {eq?.name} ×{eq?.quantity ?? 1}
                                  {eq?.serial_number ? ` (${eq.serial_number})` : ""}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ),
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Aucun équipement retenu.</p>
              )}

              {requests.data?.length ? (
                <div className="rounded-xl border border-border p-3">
                  <p className="mb-2 text-sm font-semibold">Notes et demandes spéciales</p>
                  <ul className="space-y-1 text-sm">
                    {requests.data.map((r) => (
                      <li key={r.id} className={r.is_resolved ? "text-muted-foreground" : ""}>
                        • {r.label}
                        {r.details ? ` — ${r.details}` : ""}
                        {r.is_resolved ? " (réglé)" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
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
                    <div className="border-b border-border bg-accent/60 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{nameFor(ownerId)}</p>
                        <span className="label-tech">{items.length} dispo.</span>
                      </div>
                      {isAdmin && kitsByOwner(ownerId).length ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="label-tech">Kits :</span>
                          {kitsByOwner(ownerId).map((kit) => (
                            <button
                              key={kit.id}
                              onClick={() => addKit.mutate({ kitId: kit.id, ownerId })}
                              disabled={addKit.isPending}
                              className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand transition-transform hover:-translate-y-px disabled:opacity-60"
                            >
                              <PackagePlus className="size-3.5" /> {kit.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="divide-y divide-border">
                      {groupByCategory(items, (i) => i.category).map(([category, catItems]) => (
                        <div key={category}>
                          <div className="flex items-center gap-2 px-3 py-1.5">
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                categoryChipClass(category),
                              )}
                            >
                              {category}
                            </span>
                            <span className="label-tech">{catItems.length}</span>
                          </div>
                          <div className="divide-y divide-border">
                            {catItems.map((item) => {
                              const reason = blockReason(item);
                              return (
                                <div
                                  key={item.id}
                                  className={cn(
                                    "flex items-center gap-2 p-3",
                                    reason && "bg-destructive/10",
                                  )}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p
                                        className={cn(
                                          "truncate text-sm font-medium",
                                          reason && "text-destructive",
                                        )}
                                      >
                                        {item.name}
                                      </p>
                                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                        ×{item.quantity}
                                      </span>
                                      {reason ? (
                                        <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground">
                                          Indisponible
                                        </span>
                                      ) : null}
                                    </div>
                                    {reason ? (
                                      <p className="mt-1 text-xs font-medium text-destructive">
                                        {reason}
                                      </p>
                                    ) : null}
                                  </div>
                                  {isAdmin ? (
                                    <button
                                      disabled={!!reason}
                                      onClick={() =>
                                        toggleGear.mutate({
                                          equipmentId: item.id,
                                          ownerId: item.owner_id,
                                          add: true,
                                        })
                                      }
                                      className={cn(
                                        "rounded-md px-2.5 py-1 text-xs font-medium",
                                        reason
                                          ? "cursor-not-allowed border border-destructive/40 text-destructive/70"
                                          : "bg-tint-5-soft text-tint-5",
                                      )}
                                    >
                                      {reason ? "Pris" : "Choisir"}
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
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
                      {groupByCategory(rows, (r) => equipmentOf(r)?.category).map(
                        ([category, catRows]) => (
                          <div key={category}>
                            <div className="flex items-center gap-2 px-3 py-1.5">
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                  categoryChipClass(category),
                                )}
                              >
                                {category}
                              </span>
                              <span className="label-tech">{catRows.length}</span>
                            </div>
                            <div className="divide-y divide-border">
                              {catRows.map((row) => {
                                const eq = equipmentOf(row);
                                return (
                                  <div key={row.id} className="flex items-center gap-2 p-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-medium">{eq?.name}</p>
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
                        ),
                      )}
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
