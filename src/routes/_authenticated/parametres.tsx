import { createFileRoute } from "@tanstack/react-router";
import { Moon, Sun, Languages } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { COLOR_THEMES, useSettings } from "@/lib/settings";
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

      <section className="panel mt-4 p-6">
        <p className="label-tech">{t("settings.palette")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("settings.palette.hint")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {COLOR_THEMES.map((themeOption) => (
            <button
              key={themeOption.value}
              onClick={() => setColorTheme(themeOption.value)}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all",
                colorTheme === themeOption.value
                  ? "border-brand bg-brand-soft shadow-glow"
                  : "border-border bg-card hover:border-brand/40",
              )}
            >
              <span className="flex gap-1.5">
                {themeOption.swatch.map((color) => (
                  <span
                    key={color}
                    className="size-6 rounded-full border border-border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              <span className="mt-3 block text-sm font-medium">{themeOption.label[lang]}</span>
              {colorTheme === themeOption.value ? (
                <span className="label-tech mt-1 block text-brand">
                  {lang === "fr" ? "Actif" : "Active"}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <p className="mt-4 text-xs text-muted-foreground">{t("settings.saved")}</p>
    </AppShell>
  );
}

