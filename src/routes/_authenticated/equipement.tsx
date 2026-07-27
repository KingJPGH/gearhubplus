import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
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
import {
  EQUIPMENT_CATEGORIES,
  QUANTITY_OPTIONS,
  categoryChipClass,
  fromDateKey,
  toDateKey,
} from "@/lib/equipment-categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/equipement")({
  head: () => ({
    meta: [
      { title: "Mon équipement — Plateau" },
      {
        name: "description",
        content: "Déclarez votre matériel, sa quantité et ses dates d'indisponibilité.",
      },
      { property: "og:title", content: "Mon équipement — Plateau" },
      {
        property: "og:description",
        content: "Votre inventaire personnel de matériel de production.",
      },
    ],
  }),
  component: EquipmentPage,
});

function EquipmentPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    category: EQUIPMENT_CATEGORIES[0].value,
    quantity: 1,
    serial: "",
  });

  const equipment = useQuery({
    queryKey: ["my-equipment"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("owner_id", auth.user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const unavailability = useQuery({
    queryKey: ["my-equipment-unavailability"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("equipment_unavailability")
        .select("id, equipment_id, unavailable_on")
        .eq("owner_id", auth.user!.id);
      if (error) throw error;
      return data;
    },
  });

  const datesFor = (equipmentId: string) =>
    (unavailability.data ?? [])
      .filter((u) => u.equipment_id === equipmentId)
      .map((u) => u.unavailable_on)
      .sort();

  const addItem = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("equipment").insert({
        owner_id: auth.user!.id,
        name: form.name.trim(),
        category: form.category,
        quantity: form.quantity,
        serial_number: form.serial.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ name: "", category: EQUIPMENT_CATEGORIES[0].value, quantity: 1, serial: "" });
      queryClient.invalidateQueries({ queryKey: ["my-equipment"] });
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
      values: { is_available?: boolean; quantity?: number; category?: string };
    }) => {
      const { error } = await supabase.from("equipment").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-equipment"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-equipment"] });
      toast.success("Équipement supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDates = useMutation({
    mutationFn: async ({ equipmentId, dates }: { equipmentId: string; dates: string[] }) => {
      const { data: auth } = await supabase.auth.getUser();
      const current = datesFor(equipmentId);
      const toAdd = dates.filter((d) => !current.includes(d));
      const toRemove = current.filter((d) => !dates.includes(d));
      if (toAdd.length) {
        const { error } = await supabase.from("equipment_unavailability").insert(
          toAdd.map((d) => ({
            equipment_id: equipmentId,
            owner_id: auth.user!.id,
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
      queryClient.invalidateQueries({ queryKey: ["my-equipment-unavailability"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const inputClass =
    "rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <AppShell
      title="Mon équipement"
      subtitle="Choisissez une catégorie, une quantité, et marquez au calendrier les journées où l'objet n'est pas disponible."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (form.name.trim()) addItem.mutate();
        }}
        className="panel mb-6 grid gap-2 border-l-4 border-l-brand p-4 sm:grid-cols-[2fr_1.2fr_0.7fr_1fr_auto]"
      >
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nom (ex. Batterie NPF)"
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
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-60"
        >
          <Plus className="size-4" /> Ajouter
        </button>
      </form>

      <div className="space-y-2">
        {equipment.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : equipment.data?.length ? (
          equipment.data.map((item) => {
            const dates = datesFor(item.id);
            return (
              <div key={item.id} className="panel flex flex-wrap items-center gap-3 p-4">
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

                <Select
                  value={String(item.quantity)}
                  onValueChange={(value) =>
                    patch.mutate({ id: item.id, values: { quantity: Number(value) } })
                  }
                >
                  <SelectTrigger className="h-8 w-20 bg-background text-xs">
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

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent">
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
                      ? "rounded-md bg-success px-3 py-1.5 text-xs font-medium text-success-foreground"
                      : "rounded-md border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {item.is_available ? "Disponible" : "Non disponible"}
                </button>
                <button
                  onClick={() => remove.mutate(item.id)}
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                  aria-label="Supprimer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="panel p-6 text-sm text-muted-foreground">
            Aucun équipement déclaré pour l'instant.
          </div>
        )}
      </div>
    </AppShell>
  );
}
