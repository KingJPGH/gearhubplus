import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, CalendarDays, ClipboardList, Camera } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plateau — Hub d'équipement pour boîtes de production" },
      {
        name: "description",
        content:
          "Centralisez l'équipement de votre équipe : chaque membre déclare son matériel disponible, les admins l'assignent aux journées de tournage.",
      },
      { property: "og:title", content: "Plateau — Hub d'équipement de production" },
      {
        property: "og:description",
        content:
          "Entreprise, projet, journée de tournage : la liste exacte du matériel que chaque membre doit apporter.",
      },
    ],
  }),
  component: Index,
});

const FEATURES = [
  {
    icon: Boxes,
    title: "Inventaire par membre",
    text: "Chaque membre entre son équipement et le marque disponible ou non disponible.",
  },
  {
    icon: ClipboardList,
    title: "Assignation contrôlée",
    text: "L'administrateur ne peut choisir que le matériel rendu disponible par l'équipe.",
  },
  {
    icon: CalendarDays,
    title: "Journées de tournage",
    text: "Une liste claire par date, avec équipement manquant et demandes spéciales.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Camera className="size-4" />
            </span>
            <span className="font-display text-sm font-semibold">Plateau</span>
          </div>
          <Link
            to="/auth"
            className="rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-16">
          <p className="label-tech">Entreprise → Projet → Journée de tournage</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.1] sm:text-5xl">
            Le hub d'équipement de votre boîte de production.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            Chaque membre tient son inventaire à jour. L'administrateur bâtit, pour chaque date de
            tournage, la liste précise du matériel que l'équipe doit apporter.
          </p>
          <div className="mt-8">
            <Link
              to="/auth"
              className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Commencer
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel p-5">
              <f.icon className="size-5 text-brand" />
              <h2 className="mt-3 text-base font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
