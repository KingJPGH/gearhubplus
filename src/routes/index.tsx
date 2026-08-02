import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, CalendarDays, ClipboardList, Clapperboard, ArrowRight } from "lucide-react";
import { useT } from "@/lib/settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GearUp — Hub d'équipement pour boîtes de production" },
      {
        name: "description",
        content:
          "Centralisez l'équipement de votre équipe : chaque membre déclare son matériel disponible, les admins l'assignent aux journées de tournage.",
      },
      { property: "og:title", content: "GearUp — Hub d'équipement pour boîtes de production" },
      {
        property: "og:description",
        content:
          "Centralisez l'équipement de votre équipe : chaque membre déclare son matériel disponible, les admins l'assignent aux journées de tournage.",
      },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: Boxes, key: "f1", tint: "text-tint-1 bg-tint-1-soft" },
  { icon: ClipboardList, key: "f2", tint: "text-tint-2 bg-tint-2-soft" },
  { icon: CalendarDays, key: "f3", tint: "text-tint-5 bg-tint-5-soft" },
] as const;

function Index() {
  const t = useT();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-tint-4 text-brand-foreground shadow-glow">
              <Clapperboard className="size-4" />
            </span>
            <span className="font-display text-base font-bold tracking-tight">GearUp</span>
          </div>
          <Link to="/auth" className="btn-brand px-4 py-2 text-sm">
            {t("landing.login")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-20 sm:py-28">
          <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand-soft px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-brand">
            {t("landing.kicker")}
          </span>
          <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
            <span className="text-gradient-brand">{t("landing.title")}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{t("landing.lead")}</p>
          <div className="mt-9">
            <Link to="/auth" className="btn-brand inline-flex items-center gap-2 px-6 py-3 text-sm">
              {t("landing.cta")} <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.key} className="panel p-6 transition-transform hover:-translate-y-1">
              <span className={`flex size-10 items-center justify-center rounded-2xl ${f.tint}`}>
                <f.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-bold">{t(`landing.${f.key}.title`)}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t(`landing.${f.key}.text`)}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
