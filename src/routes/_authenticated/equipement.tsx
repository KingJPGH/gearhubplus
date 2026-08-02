import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Check, Pencil, Plus, Trash2, UserCircle2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/lib/roles";
import {
  EQUIPMENT_CATEGORIES,
  QUANTITY_OPTIONS,
  categoryChipClass,
  fromDateKey,
  groupByCategory,
  toDateKey,
} from "@/lib/equipment-categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/equipement")({
  head: () => ({
    meta: [
      { title: "Mon équipement — GearUp" },
      {
        name: "description",
        content: "Déclarez votre matériel, sa quantité et ses dates d'indisponibilité.",
      },
      { property: "og:title", content: "Mon équipement — GearUp" },
      {
        property: "og:description",
        content: "Votre inventaire personnel de matériel de production.",
      },
    ],
  }),
  component: EquipmentPage,
});

const inputClass =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring";

function EquipmentPage() {
  const queryClient = useQueryClient();
  const isSuper = useIsSuperAdmin();

  const [ownerId, setOwnerId] = useState<string>("self");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: EQUIPMENT_CATEGORIES[0].value,
    quantity: 1,
    serial: "",
  });

  const me = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user!.id;
    },
  });

  const managed = useQuery({
    queryKey: ["managed-profiles", isSuper],
    enabled: !!me.data,
    queryFn: async () => {
      let q = supabase.from("profiles").select("id, full_name, role_title");
      if (isSuper) {
        q = q.neq("id", me.data!);
      } else {
        q = q.eq("is_offline", true).eq("managed_by", me.data!);
      }
      const { data, error } = await q.order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const targetId = ownerId === "self" ? me.data : ownerId;
  const targetName =
    ownerId === "self"
      ? "Vous"
      : (managed.data?.find((p) => p.id === ownerId)?.full_name ?? "Membre hors ligne");

  const equipment = useQuery({
    queryKey: ["my-equipment", targetId],
    enabled: !!targetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("owner_id", targetId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const unavailability = useQuery({
    queryKey: ["my-equipment-unavailability", targetId],
    enabled: !!targetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_unavailability")
        .select("id, equipment_id, unavailable_on")
        .eq("owner_id", targetId!);
      if (error) throw error;
      return data;
    },
  });

  const memberUnav = useQuery({
    queryKey: ["member-unavailability", targetId],
    enabled: !!targetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_unavailability")
        .select("unavailable_on")
        .eq("profile_id", targetId!);
      if (error) throw error;
      return data.map((r) => r.unavailable_on);
    },
  });

  const memberDates = [...(memberUnav.data ?? [])].sort();


  const datesFor = (equipmentId: string) =>
    (unavailability.data ?? [])
      .filter((u) => u.equipment_id === equipmentId)
      .map((u) => u.unavailable_on)
      .sort();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["my-equipment", targetId] });
  };

  const addItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("equipment").insert({
        owner_id: targetId!,
        name: form.name.trim(),
        category: form.category,
        quantity: form.quantity,
        serial_number: form.serial.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ name: "", category: EQUIPMENT_CATEGORIES[0].value, quantity: 1, serial: "" });
      invalidate();
      toast.success("Équipement ajouté");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patch = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: {
        is_available?: boolean;
        quantity?: number;
        category?: string;
        name?: string;
        serial_number?: string | null;
      };
    }) => {
      const { error } = await supabase.from("equipment").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Équipement supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDates = useMutation({
    mutationFn: async ({ equipmentId, dates }: { equipmentId: string; dates: string[] }) => {
      const current = datesFor(equipmentId);
      const toAdd = dates.filter((d) => !current.includes(d));
      const toRemove = current.filter((d) => !dates.includes(d));
      if (toAdd.length) {
        const { error } = await supabase.from("equipment_unavailability").insert(
          toAdd.map((d) => ({
            equipment_id: equipmentId,
            owner_id: targetId!,
            unavailable_on: d,
          })),
        );
        if (error) throw error;
      }
      if (toRemove.length) {
        const { error } = await supabase
          .from("equipment_unavailability")
          .delete()
          .eq("equipment_id", equipmentId)
          .in("unavailable_on", toRemove);
        if (error) throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-equipment-unavailability", targetId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const setMemberDates = useMutation({
    mutationFn: async (dates: string[]) => {
      const current = memberDates;
      const toAdd = dates.filter((d) => !current.includes(d));
      const toRemove = current.filter((d) => !dates.includes(d));
      if (toAdd.length) {
        const { error } = await supabase
          .from("member_unavailability")
          .insert(toAdd.map((d) => ({ profile_id: targetId!, unavailable_on: d })));
        if (error) throw error;
      }
      if (toRemove.length) {
        const { error } = await supabase
          .from("member_unavailability")
          .delete()
          .eq("profile_id", targetId!)
          .in("unavailable_on", toRemove);
        if (error) throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["member-unavailability", targetId] }),
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <AppShell
      title="Inventaire"
      subtitle="Ajoutez, modifiez et bloquez au calendrier les journées où un objet n'est pas disponible."
    >
      {managed.data?.length ? (
        <div className="panel mb-5 flex flex-wrap items-center gap-3 p-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <UserCircle2 className="size-4 text-brand" /> Inventaire de
          </span>
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger className="w-64 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="pointer-events-auto">
              <SelectItem value="self">Mon profil</SelectItem>
              {managed.data.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name} (hors ligne)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {ownerId !== "self" ? (
            <span className="rounded-full bg-tint-3-soft px-2.5 py-1 text-[11px] font-medium text-tint-3">
              Profil géré par vous
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="panel mb-5 flex flex-wrap items-center gap-3 p-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="size-4 text-tint-6" /> Indisponibilité complète du membre
        </span>
        <p className="text-xs text-muted-foreground">
          Les dates choisies rendent <strong>tout</strong> l'inventaire de {targetName} indisponible.
        </p>
        <Popover>
          <PopoverTrigger asChild>
            <button className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent">
              <CalendarDays className="size-4" />
              {memberDates.length ? `${memberDates.length} journée(s) bloquée(s)` : "Choisir des dates"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="multiple"
              selected={memberDates.map(fromDateKey)}
              onSelect={(value) => setMemberDates.mutate((value ?? []).map(toDateKey))}
              className={cn("p-3 pointer-events-auto")}
            />
            <p className="border-t border-border p-3 text-xs text-muted-foreground">
              Utile pour une absence : aucun de ses objets ne pourra être choisi ces journées-là.
            </p>
          </PopoverContent>
        </Popover>
      </div>


      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (form.name.trim() && targetId) addItem.mutate();
        }}
        className="mb-6 grid gap-2 rounded-xl bg-gradient-brand p-4 shadow-panel sm:grid-cols-[2fr_1.2fr_0.7fr_1fr_auto]"
      >
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={`Nom (ex. Batterie NPF) — ${targetName}`}
          required
          maxLength={100}
          className={inputClass}
        />
        <Select
          value={form.category}
          onValueChange={(value) => setForm({ ...form, category: value })}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent className="pointer-events-auto">
            {EQUIPMENT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(form.quantity)}
          onValueChange={(value) => setForm({ ...form, quantity: Number(value) })}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Qté" />
          </SelectTrigger>
          <SelectContent className="pointer-events-auto max-h-64">
            {QUANTITY_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          value={form.serial}
          onChange={(e) => setForm({ ...form, serial: e.target.value })}
          placeholder="N° de série"
          maxLength={60}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={addItem.isPending}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-sm transition-transform hover:-translate-y-px disabled:opacity-60"
        >
          <Plus className="size-4" /> Ajouter
        </button>
      </form>

      <div className="space-y-5">
        {equipment.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : equipment.data?.length ? (
          groupByCategory(equipment.data, (i) => i.category).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                    categoryChipClass(category),
                  )}
                >
                  {category}
                </span>
                <span className="label-tech">{items.length} objet(s)</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              {items.map((item) => {
            const dates = datesFor(item.id);
            const editing = editingId === item.id;
            return (
              <div
                key={item.id}
                className={cn(
                  "panel flex flex-wrap items-center gap-3 p-4 transition-colors",
                  editing && "ring-2 ring-ring",
                )}
              >
                {editing ? (
                  <EditRow
                    item={item}
                    onCancel={() => setEditingId(null)}
                    onSave={(values) => {
                      patch.mutate({ id: item.id, values });
                      setEditingId(null);
                    }}
                  />
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{item.name}</p>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            categoryChipClass(item.category),
                          )}
                        >
                          {item.category ?? "Sans catégorie"}
                        </span>
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          ×{item.quantity}
                        </span>
                      </div>
                      <p className="label-tech mt-1">
                        {[
                          item.serial_number,
                          dates.length ? `${dates.length} jour(s) indisponible(s)` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Aucune indisponibilité"}
                      </p>
                    </div>

                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent">
                          <CalendarDays className="size-4" />
                          {dates.length ? `${dates.length} date(s)` : "Indisponibilités"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="multiple"
                          selected={dates.map(fromDateKey)}
                          onSelect={(value) =>
                            setDates.mutate({
                              equipmentId: item.id,
                              dates: (value ?? []).map(toDateKey),
                            })
                          }
                          className={cn("p-3 pointer-events-auto")}
                        />
                        <p className="border-t border-border p-3 text-xs text-muted-foreground">
                          Les dates sélectionnées marquent l'objet comme non disponible pour ces
                          journées de tournage.
                        </p>
                      </PopoverContent>
                    </Popover>

                    <button
                      onClick={() =>
                        patch.mutate({ id: item.id, values: { is_available: !item.is_available } })
                      }
                      className={
                        item.is_available
                          ? "rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-success-foreground"
                          : "rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {item.is_available ? "Disponible" : "Non disponible"}
                    </button>
                    <button
                      onClick={() => setEditingId(item.id)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-brand"
                      aria-label="Modifier"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => remove.mutate(item.id)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </div>
            );
              })}
            </div>
          ))

        ) : (
          <div className="panel p-6 text-sm text-muted-foreground">
            Aucun équipement déclaré pour l'instant.
          </div>
        )}
      </div>
    </AppShell>
  );
}

function EditRow({
  item,
  onSave,
  onCancel,
}: {
  item: {
    name: string;
    category: string | null;
    quantity: number;
    serial_number: string | null;
  };
  onSave: (values: {
    name: string;
    category: string;
    quantity: number;
    serial_number: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({
    name: item.name,
    category: item.category ?? EQUIPMENT_CATEGORIES[0].value,
    quantity: item.quantity,
    serial: item.serial_number ?? "",
  });

  return (
    <div className="grid w-full gap-2 sm:grid-cols-[2fr_1.2fr_0.7fr_1fr_auto_auto]">
      <input
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        maxLength={100}
        className={inputClass}
      />
      <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
        <SelectTrigger className="bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="pointer-events-auto">
          {EQUIPMENT_CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(draft.quantity)}
        onValueChange={(v) => setDraft({ ...draft, quantity: Number(v) })}
      >
        <SelectTrigger className="bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="pointer-events-auto max-h-64">
          {QUANTITY_OPTIONS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        value={draft.serial}
        onChange={(e) => setDraft({ ...draft, serial: e.target.value })}
        placeholder="N° de série"
        maxLength={60}
        className={inputClass}
      />
      <button
        onClick={() =>
          draft.name.trim() &&
          onSave({
            name: draft.name.trim(),
            category: draft.category,
            quantity: draft.quantity,
            serial_number: draft.serial.trim() || null,
          })
        }
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-foreground"
      >
        <Check className="size-4" /> Enregistrer
      </button>
      <button
        onClick={onCancel}
        className="inline-flex items-center justify-center rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground"
        aria-label="Annuler"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
