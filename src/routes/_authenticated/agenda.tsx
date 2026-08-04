import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Section } from "@/components/Section";
import { supabase } from "@/integrations/supabase/client";
import { toDateKey } from "@/lib/equipment-categories";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Journées à venir — GearUp" },
      {
        name: "description",
        content:
          "Toutes vos prochaines journées de tournage, toutes entreprises et projets confondus.",
      },
      { property: "og:title", content: "Journées à venir — GearUp" },
      {
        property: "og:description",
        content: "Agenda unifié de vos prochaines journées de tournage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaPage,
});

type DayRow = {
  id: string;
  shoot_date: string;
  title: string | null;
  location: string | null;
  call_time: string | null;
  projects: { id: string; name: string; companies: { id: string; name: string } | null } | null;
};

function AgendaPage() {
  const today = toDateKey(new Date());

  const days = useQuery({
    queryKey: ["upcoming-days", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoot_days")
        .select("id, shoot_date, title, location, call_time, projects(id, name, companies(id, name))")
        .gte("shoot_date", today)
        .order("shoot_date");
      if (error) throw error;
      return data as unknown as DayRow[];
    },
  });

  const rows = days.data ?? [];

  const byMonth = rows.reduce<Record<string, DayRow[]>>((acc, row) => {
    const key = new Date(`${row.shoot_date}T12:00:00`).toLocaleDateString("fr-CA", {
      month: "long",
      year: "numeric",
    });
    (acc[key] ??= []).push(row);
    return acc;
  }, {});

  return (
    <AppShell
      title="Journées à venir"
      subtitle="Toutes vos prochaines journées de tournage, peu importe l'entreprise ou le projet."
    >
      {days.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : rows.length ? (
        <div className="space-y-4">
          {Object.entries(byMonth).map(([month, monthRows], index) => (
            <Section
              key={month}
              title={month}
              icon={<CalendarClock className="size-4 text-brand" />}
              count={`${monthRows.length} journée(s)`}
              defaultOpen={index === 0}
            >
              <div className="space-y-2">
                {monthRows.map((d) => (
                  <Link
                    key={d.id}
                    to="/days/$dayId"
                    params={{ dayId: d.id }}
                    className="panel flex items-center gap-3 p-4 transition-colors hover:bg-accent"
                  >
                    <span className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-brand-soft py-1.5 text-brand">
                      <span className="text-lg font-bold leading-none">
                        {new Date(`${d.shoot_date}T12:00:00`).getDate()}
                      </span>
                      <span className="text-[11px] uppercase">
                        {new Date(`${d.shoot_date}T12:00:00`).toLocaleDateString("fr-CA", {
                          weekday: "short",
                        })}
                      </span>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {[d.projects?.companies?.name, d.projects?.name]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="label-tech truncate">
                        {[d.title, d.location, d.call_time].filter(Boolean).join(" · ") ||
                          "À planifier"}
                      </p>
                    </div>
                    <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </Section>
          ))}
        </div>
      ) : (
        <div className="panel p-6 text-sm text-muted-foreground">
          Aucune journée de tournage à venir.
        </div>
      )}
    </AppShell>
  );
}
