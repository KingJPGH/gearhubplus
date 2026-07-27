import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/equipement")({
  head: () => ({
    meta: [
      { title: "Mon équipement — Plateau" },
      {
        name: "description",
        content: "Déclarez votre matériel et indiquez ce qui est disponible pour les tournages.",
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
  const [form, setForm] = useState({ name: "", category: "", serial: "", notes: "" });

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

  const addItem = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("equipment").insert({
        owner_id: auth.user!.id,
        name: form.name.trim(),
        category: form.category.trim() || null,
        serial_number: form.serial.trim() || null,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ name: "", category: "", serial: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["my-equipment"] });
      toast.success("Équipement ajouté");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("equipment").update({ is_available: value }).eq("id", id);
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

  return (
    <AppShell
      title="Mon équipement"
      subtitle="Seul le matériel marqué disponible peut être assigné à une journée de tournage."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (form.name.trim()) addItem.mutate();
        }}
        className="panel mb-6 grid gap-2 p-4 sm:grid-cols-[2fr_1fr_1fr_auto]"
      >
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nom (ex. Sony FX6)"
          required
          maxLength={100}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          placeholder="Catégorie"
          maxLength={60}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={form.serial}
          onChange={(e) => setForm({ ...form, serial: e.target.value })}
          placeholder="N° de série"
          maxLength={60}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={addItem.isPending}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          <Plus className="size-4" /> Ajouter
        </button>
      </form>

      <div className="space-y-2">
        {equipment.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : equipment.data?.length ? (
          equipment.data.map((item) => (
            <div key={item.id} className="panel flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name}</p>
                <p className="label-tech">
                  {[item.category, item.serial_number].filter(Boolean).join(" · ") || "Sans détail"}
                </p>
              </div>
              <button
                onClick={() => toggle.mutate({ id: item.id, value: !item.is_available })}
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
