import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
export type Lang = "fr" | "en";
export type ColorTheme = "neon" | "ocean" | "sunset" | "forest" | "mono";

export const COLOR_THEMES: { value: ColorTheme; label: { fr: string; en: string }; swatch: string[] }[] = [
  { value: "neon", label: { fr: "Néon studio", en: "Neon studio" }, swatch: ["#6d5efc", "#22b8cf", "#37d67a"] },
  { value: "ocean", label: { fr: "Océan", en: "Ocean" }, swatch: ["#1d7fd6", "#12b6b6", "#5ec8f5"] },
  { value: "sunset", label: { fr: "Coucher de soleil", en: "Sunset" }, swatch: ["#f2683c", "#f5a524", "#e8467c"] },
  { value: "forest", label: { fr: "Forêt", en: "Forest" }, swatch: ["#2f9e59", "#7cb518", "#0f8a7a"] },
  { value: "mono", label: { fr: "Graphite", en: "Graphite" }, swatch: ["#4a5568", "#8a94a6", "#2d3542"] },
];

const THEME_KEY = "plateau.theme";
const LANG_KEY = "plateau.lang";
const COLOR_KEY = "plateau.color";

type Dict = Record<string, { fr: string; en: string }>;

export const DICT: Dict = {
  // shell / nav
  "nav.companies": { fr: "Entreprises", en: "Companies" },
  "nav.agenda": { fr: "Journées à venir", en: "Upcoming days" },

  "nav.inventory": { fr: "Inventaire", en: "Inventory" },
  "nav.kits": { fr: "Kits", en: "Kits" },
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
  "settings.palette": { fr: "Thème de couleurs", en: "Color theme" },
  "settings.palette.hint": {
    fr: "Change les couleurs d'accent de toute l'application.",
    en: "Changes the accent colors across the whole app.",
  },

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
  colorTheme: ColorTheme;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  setColorTheme: (c: ColorTheme) => void;
  t: (key: keyof typeof DICT | string) => string;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [lang, setLangState] = useState<Lang>("fr");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("neon");

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const storedLang = localStorage.getItem(LANG_KEY) as Lang | null;
    const storedColor = localStorage.getItem(COLOR_KEY) as ColorTheme | null;
    const prefersDark =
      !storedTheme && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    setThemeState(storedTheme ?? (prefersDark ? "dark" : "light"));
    if (storedLang) setLangState(storedLang);
    if (storedColor) setColorThemeState(storedColor);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", colorTheme);
  }, [colorTheme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<Ctx>(
    () => ({
      theme,
      lang,
      colorTheme,
      setTheme: (t) => {
        localStorage.setItem(THEME_KEY, t);
        setThemeState(t);
      },
      setLang: (l) => {
        localStorage.setItem(LANG_KEY, l);
        setLangState(l);
      },
      setColorTheme: (c) => {
        localStorage.setItem(COLOR_KEY, c);
        setColorThemeState(c);
      },
      t: (key) => DICT[key]?.[lang] ?? String(key),
    }),
    [theme, lang, colorTheme],
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
