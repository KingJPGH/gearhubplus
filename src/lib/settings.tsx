import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
export type Lang = "fr" | "en";
export type ColorTheme = "neon" | "ocean" | "sunset" | "forest" | "rose" | "citrus" | "grape" | "mono";

export const COLOR_THEMES: { value: ColorTheme; label: { fr: string; en: string }; swatch: string[] }[] = [
  { value: "neon", label: { fr: "Néon studio", en: "Neon studio" }, swatch: ["#6d5efc", "#22b8cf", "#37d67a"] },
  { value: "ocean", label: { fr: "Océan", en: "Ocean" }, swatch: ["#1d7fd6", "#12b6b6", "#5ec8f5"] },
  { value: "sunset", label: { fr: "Coucher de soleil", en: "Sunset" }, swatch: ["#f2683c", "#f5a524", "#e8467c"] },
  { value: "forest", label: { fr: "Forêt", en: "Forest" }, swatch: ["#2f9e59", "#7cb518", "#0f8a7a"] },
  { value: "rose", label: { fr: "Rose", en: "Rose" }, swatch: ["#e8467c", "#f78fb3", "#b5449c"] },
  { value: "citrus", label: { fr: "Agrume", en: "Citrus" }, swatch: ["#e8a317", "#8bc34a", "#f2683c"] },
  { value: "grape", label: { fr: "Raisin", en: "Grape" }, swatch: ["#7b3fbf", "#a855f7", "#4f46e5"] },
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
  "nav.templates": { fr: "Modèles", en: "Templates" },
  "nav.settings": { fr: "Paramètres", en: "Settings" },
  "nav.signout": { fr: "Déconnexion", en: "Sign out" },
  "nav.superadmin": { fr: "Super admin", en: "Super admin" },

  // common
  "common.loading": { fr: "Chargement…", en: "Loading…" },
  "common.save": { fr: "Enregistrer", en: "Save" },
  "common.cancel": { fr: "Annuler", en: "Cancel" },
  "common.delete": { fr: "Supprimer", en: "Delete" },
  "common.edit": { fr: "Modifier", en: "Edit" },
  "common.add": { fr: "Ajouter", en: "Add" },
  "common.close": { fr: "Fermer", en: "Close" },
  "common.name": { fr: "Nom", en: "Name" },
  "common.notes": { fr: "Notes", en: "Notes" },
  "common.member": { fr: "Membre", en: "Member" },
  "common.items": { fr: "objet(s)", en: "item(s)" },
  "common.day": { fr: "journée", en: "day" },
  "common.days": { fr: "journée(s)", en: "day(s)" },
  "common.none": { fr: "Aucun", en: "None" },
  "common.saved": { fr: "Enregistré", en: "Saved" },
  "common.deleted": { fr: "Supprimé", en: "Deleted" },
  "common.confirmDelete": { fr: "Confirmer la suppression ?", en: "Confirm deletion?" },

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
  "settings.active": { fr: "Actif", en: "Active" },

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

  // agenda
  "agenda.title": { fr: "Journées à venir", en: "Upcoming days" },
  "agenda.subtitle": {
    fr: "Les prochaines journées de tournage où vous êtes présent.",
    en: "The upcoming shoot days where you are on set.",
  },
  "agenda.empty": {
    fr: "Aucune journée de tournage à venir où vous êtes présent.",
    en: "No upcoming shoot day where you are on set.",
  },
  "agenda.toplan": { fr: "À planifier", en: "To be planned" },

  // project
  "project.days": { fr: "Journées de tournage", en: "Shoot days" },
  "project.crew": { fr: "Équipe du projet", en: "Project crew" },
  "project.admin": { fr: "Administrateur du projet.", en: "Project administrator." },
  "project.memberOf": { fr: "Membre du projet.", en: "Project member." },
  "project.newDay": { fr: "Journée", en: "Day" },
  "project.dateStart": { fr: "Date (ou début de plage)", en: "Date (or range start)" },
  "project.dateEnd": { fr: "Fin de plage (optionnel)", en: "Range end (optional)" },
  "project.dayTitle": { fr: "Titre (ex. Bloc 3, scènes 12-18)", en: "Title (e.g. Block 3, scenes 12-18)" },
  "project.location": { fr: "Lieu", en: "Location" },
  "project.callTime": { fr: "Heure d'appel", en: "Call time" },
  "project.noDays": { fr: "Aucune journée de tournage.", en: "No shoot day yet." },
  "project.inProject": { fr: "Dans le projet", en: "On the project" },
  "project.editDay": { fr: "Modifier la journée", en: "Edit day" },
  "project.deleteDay": { fr: "Supprimer la journée", en: "Delete day" },
  "project.deleteRange": { fr: "Supprimer toute la plage", en: "Delete the whole range" },
  "project.rangeDays": { fr: "journées dans cette plage", en: "days in this range" },
  "project.dayCreated": { fr: "Journée de tournage créée", en: "Shoot day created" },
  "project.daysCreated": { fr: "journées créées", en: "days created" },
  "project.dayUpdated": { fr: "Journée mise à jour", en: "Day updated" },
  "project.dayDeleted": { fr: "Journée supprimée", en: "Day deleted" },
  "project.applyToRange": { fr: "Appliquer à toute la plage", en: "Apply to the whole range" },

  // day page
  "day.crewPresent": { fr: "Équipe présente", en: "Crew on set" },
  "day.present": { fr: "Présent", en: "On set" },
  "day.presentCount": { fr: "présent(s)", en: "on set" },
  "day.noCrew": { fr: "Aucun membre assigné.", en: "No crew assigned." },
  "day.callsheet": { fr: "Feuille de service (PDF)", en: "Call sheet (PDF)" },
  "day.noDoc": { fr: "Aucun document pour l'instant.", en: "No document yet." },
  "day.addPdf": { fr: "Ajouter un PDF", en: "Add a PDF" },
  "day.uploading": { fr: "Téléversement…", en: "Uploading…" },
  "day.available": { fr: "Disponible — à choisir", en: "Available — to pick" },
  "day.chosen": { fr: "Choisi — à apporter", en: "Chosen — to bring" },
  "day.pick": { fr: "Choisir", en: "Pick" },
  "day.taken": { fr: "Pris", en: "Taken" },
  "day.remove": { fr: "Retirer", en: "Remove" },
  "day.unavailable": { fr: "Indisponible", en: "Unavailable" },
  "day.allPicked": {
    fr: "Tout l'équipement disponible a été choisi (ou aucun membre présent).",
    en: "All available gear has been picked (or no crew on set).",
  },
  "day.nothingPicked": { fr: "Rien de retenu pour l'instant.", en: "Nothing picked yet." },
  "day.requests": { fr: "Équipement manquant / demandes spéciales", en: "Missing gear / special requests" },
  "day.requestLabel": { fr: "Ex. Trépied lourd manquant", en: "E.g. Heavy tripod missing" },
  "day.requestDetails": { fr: "Détails, note pour l'équipe (optionnel)", en: "Details, note for the crew (optional)" },
  "day.addRequest": { fr: "Ajouter la demande", en: "Add request" },
  "day.wrangling": { fr: "Data wrangling", en: "Data wrangling" },
  "day.wranglingEmpty": {
    fr: "Ajoutez des membres présents pour suivre le data wrangling.",
    en: "Add crew on set to track data wrangling.",
  },
  "day.wrangling.todo": { fr: "À faire", en: "To do" },
  "day.wrangling.done": { fr: "Fait", en: "Done" },
  "day.wrangling.na": { fr: "Ne s'applique pas", en: "Not applicable" },
  "day.wranglingDone": { fr: "fait", en: "done" },
  "day.summary": { fr: "Récapitulatif", en: "Summary" },
  "day.summaryTitle": { fr: "Récapitulatif", en: "Summary" },
  "day.noGearSummary": { fr: "Aucun équipement retenu.", en: "No gear picked." },
  "day.documents": { fr: "Documents", en: "Documents" },
  "day.notesRequests": { fr: "Notes et demandes spéciales", en: "Notes and special requests" },
  "day.kits": { fr: "Kits :", en: "Kits:" },
  "day.availableShort": { fr: "dispo.", en: "avail." },
  "day.blocked.member": { fr: "Membre indisponible cette journée", en: "Member unavailable that day" },
  "day.blocked.owner": { fr: "Bloqué par le propriétaire cette journée", en: "Blocked by the owner that day" },
  "day.blocked.usedBy": { fr: "Utilisé par", en: "Used by" },
  "day.editDay": { fr: "Modifier la journée", en: "Edit day" },
  "day.deleteDay": { fr: "Supprimer la journée", en: "Delete day" },

  // debrief
  "debrief.title": { fr: "Debrief", en: "Debrief" },
  "debrief.hint": {
    fr: "À remplir pendant ou après la journée : ce qui a bien été, les problèmes, les suivis.",
    en: "Fill in during or after the day: what went well, issues, follow-ups.",
  },
  "debrief.placeholder": {
    fr: "Notes de fin de journée…",
    en: "End-of-day notes…",
  },
  "debrief.saved": { fr: "Debrief enregistré", en: "Debrief saved" },

  // templates
  "tpl.title": { fr: "Modèles de journée", en: "Day templates" },
  "tpl.subtitle": {
    fr: "Sauvegardez la configuration d'équipement d'une journée et réutilisez-la à une autre date.",
    en: "Save a day's gear setup and reuse it on another date.",
  },
  "tpl.save": { fr: "Sauvegarder comme modèle", en: "Save as template" },
  "tpl.saveTitle": { fr: "Sauvegarder le modèle d'équipement", en: "Save the gear template" },
  "tpl.namePlaceholder": { fr: "Ex. Mariage Bruno, Thomas, Jordan", en: "E.g. Wedding Bruno, Thomas, Jordan" },
  "tpl.saved": { fr: "Modèle sauvegardé", en: "Template saved" },
  "tpl.apply": { fr: "Utiliser un modèle", en: "Use a template" },
  "tpl.applied": { fr: "objet(s) ajouté(s) depuis le modèle", en: "item(s) added from the template" },
  "tpl.empty": { fr: "Aucun modèle pour l'instant.", en: "No template yet." },
  "tpl.emptySelection": {
    fr: "Choisissez d'abord de l'équipement pour la journée.",
    en: "Pick some gear for the day first.",
  },
  "tpl.noneApplicable": {
    fr: "Aucun objet de ce modèle n'est disponible pour cette journée.",
    en: "No item from this template is available for this day.",
  },
  "tpl.deleted": { fr: "Modèle supprimé", en: "Template deleted" },
  "tpl.items": { fr: "objet(s)", en: "item(s)" },
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

export function useLang(): Lang {
  return useSettings().lang;
}
