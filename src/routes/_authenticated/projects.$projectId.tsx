import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/lib/roles";
import { useSettings } from "@/lib/settings";
import { formatRange, parseDay, locOf, groupDayRanges } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Projet — GearUp" },
      { name: "description", content: "Équipe et journées de tournage du projet." },
      { property: "og:title", content: "Projet — GearUp" },
      { property: "og:description", content: "Équipe et journées de tournage du projet." },
    ],
  }),
  component: ProjectPage,
});

type EditState = {
  key: string;
  ids: string[];
  title: string;
  location: string;
  callTime: string;
  applyAll: boolean;
};

function ProjectPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t, lang } = useSettings();
  const [day, setDay] = useState({ date: "", endDate: "", title: "", location: "", callTime: "" });
  const [edit, setEdit] = useState<EditState | null>(null);

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, companies(id, name)")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const companyId = (project.data?.companies as { id: string; name: string } | null)?.id;

  const role = useQuery({
    queryKey: ["company-role", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("company_members")
        .select("role")
        .eq("company_id", companyId!)
        .eq("user_id", auth.user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role ?? null;
    },
  });
  const isSuper = useIsSuperAdmin();
  const isAdmin = role.data === "admin" || isSuper;

  const days = useQuery({
    queryKey: ["shoot-days", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoot_days")
        .select("*")
        .eq("project_id", projectId)
        .order("shoot_date");
      if (error) throw error;
      return data;
    },
  });

  const crew = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("id, user_id, profiles:user_id(full_name, email, role_title)")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const companyPeople = useQuery({
    queryKey: ["company-members", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("user_id, profiles:user_id(full_name, email)")
        .eq("company_id", companyId!);
      if (error) throw error;
      return data;
    },
  });

  const createDay = useMutation({
    mutationFn: async () => {
      const start = new Date(`${day.date}T12:00:00`);
      const end = day.endDate ? new Date(`${day.endDate}T12:00:00`) : start;
      if (end < start) throw new Error("La date de fin doit suivre la date de début.");
      const rangeId = day.endDate && day.endDate !== day.date ? crypto.randomUUID() : null;
      const rows: Array<{
        project_id: string;
        shoot_date: string;
        title: string | null;
        location: string | null;
        call_time: string | null;
        range_id: string | null;
      }> = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        rows.push({
          project_id: projectId,
          shoot_date: `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`,
          title: day.title.trim() || null,
          location: day.location.trim() || null,
          call_time: day.callTime.trim() || null,
          range_id: rangeId,
        });
      }
      if (rows.length > 60) throw new Error("Plage trop longue (max 60 journées).");
      const { error } = await supabase.from("shoot_days").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      setDay({ date: "", endDate: "", title: "", location: "", callTime: "" });
      queryClient.invalidateQueries({ queryKey: ["shoot-days", projectId] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-days"] });
      toast.success(
        count > 1 ? `${count} ${t("project.daysCreated")}` : t("project.dayCreated"),
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateDays = useMutation({
    mutationFn: async (state: EditState) => {
      const { error } = await supabase
        .from("shoot_days")
        .update({
          title: state.title.trim() || null,
          location: state.location.trim() || null,
          call_time: state.callTime.trim() || null,
        })
        .in("id", state.ids);
      if (error) throw error;
    },
    onSuccess: () => {
      setEdit(null);
      queryClient.invalidateQueries({ queryKey: ["shoot-days", projectId] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-days"] });
      toast.success(t("project.dayUpdated"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteDays = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("shoot_days").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      setEdit(null);
      queryClient.invalidateQueries({ queryKey: ["shoot-days", projectId] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-days"] });
      toast.success(t("project.dayDeleted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleCrew = useMutation({
    mutationFn: async ({ userId, add }: { userId: string; add: boolean }) => {
      if (add) {
        const { error } = await supabase
          .from("project_members")
          .insert({ project_id: projectId, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_members")
          .delete()
          .eq("project_id", projectId)
          .eq("user_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-members", projectId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const assigned = new Set((crew.data ?? []).map((c) => c.user_id));
  const groups = groupDayRanges(days.data ?? []);

  const inputClass =
    "rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <AppShell
      title={project.data?.name ?? "Projet"}
      subtitle={isAdmin ? t("project.admin") : t("project.memberOf")}
      breadcrumb={
        <span className="flex flex-wrap items-center gap-1">
          <Link to="/dashboard" className="hover:underline">
            {t("nav.companies")}
          </Link>
          <span>/</span>
          {companyId ? (
            <Link to="/companies/$companyId" params={{ companyId }} className="hover:underline">
              {(project.data?.companies as { name: string } | null)?.name}
            </Link>
          ) : null}
        </span>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section>
          <p className="label-tech mb-2">{t("project.days")}</p>
          {isAdmin ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (day.date) createDay.mutate();
              }}
              className="panel mb-3 grid gap-2 p-3 sm:grid-cols-2"
            >
              <label className="flex flex-col gap-1">
                <span className="label-tech">{t("project.dateStart")}</span>
                <input
                  type="date"
                  value={day.date}
                  onChange={(e) => setDay({ ...day, date: e.target.value })}
                  required
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label-tech">{t("project.dateEnd")}</span>
                <input
                  type="date"
                  value={day.endDate}
                  min={day.date || undefined}
                  onChange={(e) => setDay({ ...day, endDate: e.target.value })}
                  className={inputClass}
                />
              </label>

              <input
                value={day.title}
                onChange={(e) => setDay({ ...day, title: e.target.value })}
                placeholder={t("project.dayTitle")}
                maxLength={120}
                className={inputClass}
              />
              <input
                value={day.location}
                onChange={(e) => setDay({ ...day, location: e.target.value })}
                placeholder={t("project.location")}
                maxLength={120}
                className={inputClass}
              />
              <div className="flex gap-2">
                <input
                  value={day.callTime}
                  onChange={(e) => setDay({ ...day, callTime: e.target.value })}
                  placeholder={t("project.callTime")}
                  maxLength={30}
                  className={`flex-1 ${inputClass}`}
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground"
                >
                  <Plus className="size-4" /> {t("project.newDay")}
                </button>
              </div>
            </form>
          ) : null}

          <div className="space-y-2">
            {groups.length ? (
              groups.map((group) => {
                const multi = group.days.length > 1;
                const d = group.first;
                const editing = edit?.key === group.key;
                return (
                  <div key={group.key} className="panel overflow-hidden">
                    <div className="flex items-center gap-3 p-4">
                      <button
                        onClick={() => navigate({ to: "/days/$dayId", params: { dayId: d.id } })}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-primary">
                          <CalendarDays className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium">
                            {formatRange(d.shoot_date, group.last.shoot_date, lang)}
                          </span>
                          <span className="label-tech block truncate">
                            {[d.title, d.location, d.call_time].filter(Boolean).join(" · ") ||
                              t("agenda.toplan")}
                            {multi ? ` · ${group.days.length} ${t("common.days")}` : ""}
                          </span>
                        </span>
                      </button>
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() =>
                              setEdit(
                                editing
                                  ? null
                                  : {
                                      key: group.key,
                                      ids: group.days.map((x) => x.id),
                                      title: d.title ?? "",
                                      location: d.location ?? "",
                                      callTime: d.call_time ?? "",
                                      applyAll: multi,
                                    },
                              )
                            }
                            title={t("project.editDay")}
                            className="rounded-md border border-input p-1.5 text-muted-foreground hover:bg-accent"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(t("common.confirmDelete")))
                                deleteDays.mutate(group.days.map((x) => x.id));
                            }}
                            title={multi ? t("project.deleteRange") : t("project.deleteDay")}
                            className="rounded-md border border-input p-1.5 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </>
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      )}
                    </div>

                    {multi ? (
                      <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-2">
                        {group.days.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() =>
                              navigate({ to: "/days/$dayId", params: { dayId: sub.id } })
                            }
                            className="rounded-full border border-input px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent"
                          >
                            {parseDay(sub.shoot_date).toLocaleDateString(locOf(lang), {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {editing && edit ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          updateDays.mutate({
                            ...edit,
                            ids: edit.applyAll ? group.days.map((x) => x.id) : [d.id],
                          });
                        }}
                        className="grid gap-2 border-t border-border bg-accent/40 p-3 sm:grid-cols-2"
                      >
                        <input
                          value={edit.title}
                          onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                          placeholder={t("project.dayTitle")}
                          maxLength={120}
                          className={inputClass}
                        />
                        <input
                          value={edit.location}
                          onChange={(e) => setEdit({ ...edit, location: e.target.value })}
                          placeholder={t("project.location")}
                          maxLength={120}
                          className={inputClass}
                        />
                        <input
                          value={edit.callTime}
                          onChange={(e) => setEdit({ ...edit, callTime: e.target.value })}
                          placeholder={t("project.callTime")}
                          maxLength={30}
                          className={inputClass}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          {multi ? (
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={edit.applyAll}
                                onChange={(e) => setEdit({ ...edit, applyAll: e.target.checked })}
                              />
                              {t("project.applyToRange")}
                            </label>
                          ) : null}
                          <button
                            type="submit"
                            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                          >
                            {t("common.save")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEdit(null)}
                            className="rounded-md border border-input px-3 py-1.5 text-xs text-muted-foreground"
                          >
                            {t("common.cancel")}
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="panel p-6 text-sm text-muted-foreground">{t("project.noDays")}</div>
            )}
          </div>
        </section>

        <section>
          <p className="label-tech mb-2">{t("project.crew")}</p>
          <div className="panel divide-y divide-border">
            {(isAdmin ? companyPeople.data : crew.data)?.map((row) => {
              const userId = row.user_id;
              const profile = row.profiles as { full_name: string | null; email: string | null } | null;
              const isOn = assigned.has(userId);
              return (
                <div key={userId} className="flex items-center gap-2 p-3">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {profile?.full_name || profile?.email || t("common.member")}
                  </span>
                  {isAdmin ? (
                    <button
                      onClick={() => toggleCrew.mutate({ userId, add: !isOn })}
                      className={
                        isOn
                          ? "rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-brand-foreground"
                          : "rounded-md border border-input px-2.5 py-1 text-xs text-muted-foreground"
                      }
                    >
                      {isOn ? t("project.inProject") : t("common.add")}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
