import { createFileRoute } from "@tanstack/react-router";
import { Moon, Sun, Languages } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — GearUp" },
      { name: "description", content: "Thème sombre ou lumineux et langue de l'interface GearUp." },
      { property: "og:title", content: "Paramètres — GearUp" },
      { property: "og:description", content: "Choisissez votre thème et votre langue." },
    ],
  }),
  component: SettingsPage,
});

function OptionCard({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center gap-3 rounded-2xl border p-4 text-left text-sm font-medium transition-all",
        active
          ? "border-brand bg-brand-soft text-brand shadow-glow"
          : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground",
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-background/60">
        {icon}
      </span>
      {label}
    </button>
  );
}

function SettingsPage() {
  const { theme, lang, colorTheme, setTheme, setLang, setColorTheme, t } = useSettings();

  return (
    <AppShell title={t("settings.title")} subtitle={t("settings.subtitle")}>
      <div className="grid gap-4 md:grid-cols-2">

        <section className="panel p-6">
          <p className="label-tech">{t("settings.appearance")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("settings.appearance.hint")}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <OptionCard
              active={theme === "light"}
              onClick={() => setTheme("light")}
              icon={<Sun className="size-4" />}
              label={t("settings.light")}
            />
            <OptionCard
              active={theme === "dark"}
              onClick={() => setTheme("dark")}
              icon={<Moon className="size-4" />}
              label={t("settings.dark")}
            />
          </div>
        </section>

        <section className="panel p-6">
          <p className="label-tech">{t("settings.language")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("settings.language.hint")}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <OptionCard
              active={lang === "fr"}
              onClick={() => setLang("fr")}
              icon={<Languages className="size-4" />}
              label={t("settings.french")}
            />
            <OptionCard
              active={lang === "en"}
              onClick={() => setLang("en")}
              icon={<Languages className="size-4" />}
              label={t("settings.english")}
            />
          </div>
        </section>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{t("settings.saved")}</p>
    </AppShell>
  );
}
