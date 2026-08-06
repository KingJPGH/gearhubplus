import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Section } from "@/components/Section";
import { supabase } from "@/integrations/supabase/client";
import { toDateKey } from "@/lib/equipment-categories";
import { formatRange, locOf, parseDay, groupDayRanges } from "@/lib/dates";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Journées à venir — GearUp" },
      {
        name: "description",
        content:
          "Vos prochaines journées de tournage où vous êtes présent, toutes entreprises confondues.",
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
  range_id: string | null;
  title: string | null;
  location: string | null;
  call_time: string | null;
  projects: { id: string; name: string; companies: { id: string; name: string } | null } | null;
};

function AgendaPage() {
  const today = toDateKey(new Date());
  const { t, lang } = useSettings();

  const days = useQuery({
    queryKey: ["upcoming-days", today],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: memberships, error: mErr } = await supabase
        .from("shoot_day_members")
        .select("shoot_day_id")
        .eq("user_id", auth.user!.id);
      if (mErr) throw mErr;
      const ids = memberships.map((m) => m.shoot_day_id);
      if (!ids.length) return [] as DayRow[];
      const { data, error } = await supabase
        .from("shoot_days")
        .select(
          "id, shoot_date, range_id, title, location, call_time, projects(id, name, companies(id, name))",
        )
        .in("id", ids)
        .gte("shoot_date", today)
        .order("shoot_date");
      if (error) throw error;
      return data as unknown as DayRow[];
    },
  });

  const groups = groupDayRanges(days.data ?? []);

  const byMonth = groups.reduce<Record<string, typeof groups>>((acc, group) => {
    const key = parseDay(group.first.shoot_date).toLocaleDateString(locOf(lang), {
      month: "long",
      year: "numeric",
    });
    (acc[key] ??= []).push(group);
    return acc;
  }, {});

  return (
    <AppShell title={t("agenda.title")} subtitle={t("agenda.subtitle")}>
      {days.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : groups.length ? (
        <div className="space-y-4">
          {Object.entries(byMonth).map(([month, monthGroups], index) => (
            <Section
              key={month}
              title={month}
              icon={<CalendarClock className="size-4 text-brand" />}
              count={`${monthGroups.length} ${t("common.days")}`}
              defaultOpen={index === 0}
            >
              <div className="space-y-2">
                {monthGroups.map((group) => {
                  const d = group.first;
                  const multi = group.days.length > 1;
                  return (
                    <Link
                      key={group.key}
                      to="/days/$dayId"
                      params={{ dayId: d.id }}
                      className="panel flex items-center gap-3 p-4 transition-colors hover:bg-accent"
                    >
                      <span className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-brand-soft py-1.5 text-brand">
                        <span className="text-lg font-bold leading-none">
                          {multi
                            ? `${parseDay(d.shoot_date).getDate()}–${parseDay(group.last.shoot_date).getDate()}`
                            : parseDay(d.shoot_date).getDate()}
                        </span>
                        <span className="text-[11px] uppercase">
                          {multi
                            ? `${group.days.length} ${t("common.day")}s`
                            : parseDay(d.shoot_date).toLocaleDateString(locOf(lang), {
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
                          {formatRange(d.shoot_date, group.last.shoot_date, lang)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[d.title, d.location, d.call_time].filter(Boolean).join(" · ") ||
                            t("agenda.toplan")}
                        </p>
                      </div>
                      <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            </Section>
          ))}
        </div>
      ) : (
        <div className="panel p-6 text-sm text-muted-foreground">{t("agenda.empty")}</div>
      )}
    </AppShell>
  );
}
