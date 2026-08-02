import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Boxes, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { categoryChipClass, groupByCategory } from "@/lib/equipment-categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/kits")({
  head: () => ({
    meta: [
      { title: "Mes kits — GearUp" },
      {
        name: "description",
        content:
          "Créez des kits (modèles d'équipement) et ajoutez plusieurs items d'un seul clic à une journée de tournage.",
      },
      { property: "og:title", content: "Mes kits — GearUp" },
      {
        property: "og:description",
        content: "Modèles d'équipement réutilisables pour vos journées de tournage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KitsPage,
});

const inputClass =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring";

type EquipmentRow = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
};

function KitsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "" });

  const me = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user!.id;
    },
  });

  const equipment = useQuery({
    queryKey: ["my-equipment", me.data],
    enabled: !!me.data,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, category, quantity")
        .eq("owner_id", me.data!)
        .order("name");
      if (error) throw error;
      return data as EquipmentRow[];
    },
  });

  const kits = useQuery({
    queryKey: ["my-kits", me.data],
    enabled: !!me.data,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kits")
        .select("id, name, description, kit_items(id, equipment_id, equipment(id, name, category, quantity))")
        .eq("owner_id", me.data!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["my-kits", me.data] });

  const createKit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("kits").insert({
        owner_id: me.data!,
        name: form.name.trim(),
        description: form.description.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ name: "", description: "" });
      invalidate();
      toast.success("Kit créé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteKit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Kit supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async ({ kitId, equipmentId }: { kitId: string; equipmentId: string }) => {
      const { error } = await supabase
        .from("kit_items")
        .insert({ kit_id: kitId, equipment_id: equipmentId });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kit_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Mes kits"
      subtitle="Un kit regroupe plusieurs objets de votre inventaire : ajoutez-les tous d'un seul clic à une journée de tournage."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (form.name.trim() && me.data) createKit.mutate();
        }}
        className="mb-6 grid gap-2 rounded-xl bg-gradient-brand p-4 shadow-panel sm:grid-cols-[1.2fr_2fr_auto]"
      >
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nom du kit (ex. Kit Mariage)"
          required
          maxLength={80}
          className={inputClass}
        />
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description (optionnel)"
          maxLength={200}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={createKit.isPending}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-sm transition-transform hover:-translate-y-px disabled:opacity-60"
        >
          <Plus className="size-4" /> Créer le kit
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        {kits.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : kits.data?.length ? (
          kits.data.map((kit) => {
            const items = (kit.kit_items ?? []) as Array<{
              id: string;
              equipment_id: string;
              equipment: EquipmentRow | null;
            }>;
            const usedIds = new Set(items.map((i) => i.equipment_id));
            const available = (equipment.data ?? []).filter((e) => !usedIds.has(e.id));
            return (
              <section key={kit.id} className="panel overflow-hidden">
                <div className="flex items-center gap-2 head-strip px-4 py-3">
                  <Boxes className="size-4 text-brand" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{kit.name}</p>
                    {kit.description ? (
                      <p className="truncate text-xs text-muted-foreground">{kit.description}</p>
                    ) : null}
                  </div>
                  <span className="label-tech">{items.length} item(s)</span>
                  <button
                    onClick={() => deleteKit.mutate(kit.id)}
                    aria-label="Supprimer le kit"
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="divide-y divide-border">
                  {items.length ? (
                    groupByCategory(items, (i) => i.equipment?.category).map(([category, rows]) => (
                      <div key={category} className="p-3">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            categoryChipClass(category),
                          )}
                        >
                          {category}
                        </span>
                        <ul className="mt-2 space-y-1">
                          {rows.map((row) => (
                            <li key={row.id} className="flex items-center gap-2 text-sm">
                              <span className="min-w-0 flex-1 truncate">
                                {row.equipment?.name ?? "Objet supprimé"}
                              </span>
                              <button
                                onClick={() => removeItem.mutate(row.id)}
                                className="rounded-md border border-input px-2 py-0.5 text-xs text-muted-foreground hover:text-destructive"
                              >
                                Retirer
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-sm text-muted-foreground">
                      Ce kit est vide. Ajoutez-y des objets de votre inventaire.
                    </p>
                  )}
                </div>

                <div className="border-t border-border p-3">
                  <Select
                    value=""
                    onValueChange={(equipmentId) => addItem.mutate({ kitId: kit.id, equipmentId })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Ajouter un objet au kit…" />
                    </SelectTrigger>
                    <SelectContent className="pointer-events-auto max-h-64">
                      {available.length ? (
                        available.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                            {e.category ? ` — ${e.category}` : ""}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Aucun objet disponible
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </section>
            );
          })
        ) : (
          <div className="panel p-6 text-sm text-muted-foreground">
            Aucun kit pour l'instant. Créez-en un ci-dessus.
          </div>
        )}
      </div>
    </AppShell>
  );
}
