import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
export type Lang = "fr" | "en";

const THEME_KEY = "plateau.theme";
const LANG_KEY = "plateau.lang";

type Dict = Record<string, { fr: string; en: string }>;

export const DICT: Dict = {
  // shell / nav
  "nav.companies": { fr: "Entreprises", en: "Companies" },
  "nav.inventory": { fr: "Inventaire", en: "Inventory" },
  "nav.settings": { fr: "Paramètres", en: "Settings" },
  "nav.signout": { fr: "Déconnexion", en: "Sign out" },

  // settings
  "settings.title": { fr: "Paramètres", en: "Settings" },
  "settings.subtitle": {
    fr: "Personnalisez l'apparence et la langue de GearUp.",
    en: "Customize the look and language of GearUp.",
  },
  "settings.appearance": { fr: "Apparence", en: "Appearance" },
  "settings.appearance.hint": {
    fr: "Choisissez entre le mode lumineux et le mode sombre.",
    en: "Choose between light and dark mode.",
  },
  "settings.light": { fr: "Mode lumineux", en: "Light mode" },
  "settings.dark": { fr: "Mode sombre", en: "Dark mode" },
  "settings.language": { fr: "Langue", en: "Language" },
  "settings.language.hint": {
    fr: "L'interface bascule immédiatement.",
    en: "The interface switches immediately.",
  },
  "settings.french": { fr: "Français", en: "French" },
  "settings.english": { fr: "Anglais", en: "English" },
  "settings.saved": { fr: "Préférences enregistrées sur cet appareil.", en: "Preferences saved on this device." },

  // landing
  "landing.kicker": {
    fr: "Entreprise → Projet → Journée de tournage",
    en: "Company → Project → Shoot day",
  },
  "landing.title": {
    fr: "Le hub d'équipement de votre boîte de production.",
    en: "The gear hub for your production company.",
  },
  "landing.lead": {
    fr: "Chaque membre tient son inventaire à jour. L'administrateur bâtit, pour chaque date de tournage, la liste précise du matériel à apporter.",
    en: "Every crew member keeps their kit up to date. Admins build the exact gear list to bring for each shoot day.",
  },
  "landing.cta": { fr: "Commencer", en: "Get started" },
  "landing.login": { fr: "Se connecter", en: "Log in" },
  "landing.f1.title": { fr: "Inventaire par membre", en: "Per-member inventory" },
  "landing.f1.text": {
    fr: "Chaque membre entre son équipement et le marque disponible ou non.",
    en: "Each member adds their gear and marks it available or not.",
  },
  "landing.f2.title": { fr: "Assignation contrôlée", en: "Controlled assignment" },
  "landing.f2.text": {
    fr: "L'administrateur ne choisit que le matériel rendu disponible par l'équipe.",
    en: "Admins can only pick gear the crew has made available.",
  },
  "landing.f3.title": { fr: "Journées de tournage", en: "Shoot days" },
  "landing.f3.text": {
    fr: "Une liste claire par date, avec équipement manquant et demandes spéciales.",
    en: "A clear list per date, with missing gear and special requests.",
  },

  // dashboard
  "dash.title": { fr: "Entreprises", en: "Companies" },
  "dash.subtitle": {
    fr: "Vos boîtes de production et leurs projets.",
    en: "Your production companies and their projects.",
  },
  "dash.new": { fr: "Nouvelle entreprise", en: "New company" },
  "dash.create": { fr: "Créer", en: "Create" },
  "dash.empty": {
    fr: "Aucune entreprise pour l'instant. Créez la vôtre ou demandez à un administrateur de vous ajouter.",
    en: "No company yet. Create one or ask an admin to add you.",
  },
  "dash.admin": { fr: "Administrateur", en: "Administrator" },
  "dash.member": { fr: "Membre", en: "Member" },
  "dash.profile": { fr: "Mon profil", en: "My profile" },
  "dash.fullname": { fr: "Nom complet", en: "Full name" },
  "dash.roletitle": { fr: "Poste (ex. Directeur photo)", en: "Role (e.g. Director of photography)" },
  "dash.save": { fr: "Enregistrer", en: "Save" },
  "common.loading": { fr: "Chargement…", en: "Loading…" },
};

type Ctx = {
  theme: Theme;
  lang: Lang;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof DICT | string) => string;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const storedLang = localStorage.getItem(LANG_KEY) as Lang | null;
    const prefersDark =
      !storedTheme && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    setThemeState(storedTheme ?? (prefersDark ? "dark" : "light"));
    if (storedLang) setLangState(storedLang);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<Ctx>(
    () => ({
      theme,
      lang,
      setTheme: (t) => {
        localStorage.setItem(THEME_KEY, t);
        setThemeState(t);
      },
      setLang: (l) => {
        localStorage.setItem(LANG_KEY, l);
        setLangState(l);
      },
      t: (key) => DICT[key]?.[lang] ?? String(key),
    }),
    [theme, lang],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

export function useT() {
  return useSettings().t;
}
