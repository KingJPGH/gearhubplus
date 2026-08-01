export type EquipmentCategory = {
  value: string;
  label: string;
  tint: number;
};

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  { value: "Caméra", label: "Caméra", tint: 1 },
  { value: "Optiques", label: "Optiques", tint: 2 },
  { value: "Éclairage", label: "Éclairage", tint: 3 },
  { value: "Son", label: "Son", tint: 4 },
  { value: "Énergie / batteries", label: "Énergie / batteries", tint: 5 },
  { value: "Machinerie / support", label: "Machinerie / support", tint: 6 },
  { value: "Média / stockage", label: "Média / stockage", tint: 2 },
  { value: "Moniteurs", label: "Moniteurs", tint: 1 },
  { value: "Câblage / accessoires", label: "Câblage / accessoires", tint: 6 },
  { value: "Transport / cases", label: "Transport / cases", tint: 3 },
  { value: "Autre", label: "Autre", tint: 5 },
];

export const QUANTITY_OPTIONS = Array.from({ length: 50 }, (_, i) => i + 1);

const TINT_CLASSES: Record<number, string> = {
  1: "bg-tint-1-soft text-tint-1 border-tint-1/25",
  2: "bg-tint-2-soft text-tint-2 border-tint-2/25",
  3: "bg-tint-3-soft text-tint-3 border-tint-3/25",
  4: "bg-tint-4-soft text-tint-4 border-tint-4/25",
  5: "bg-tint-5-soft text-tint-5 border-tint-5/25",
  6: "bg-tint-6-soft text-tint-6 border-tint-6/25",
};

export function categoryChipClass(category?: string | null): string {
  const found = EQUIPMENT_CATEGORIES.find((c) => c.value === category);
  return TINT_CLASSES[found?.tint ?? 0] ?? "bg-muted text-muted-foreground border-border";
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

const ORDER = new Map(EQUIPMENT_CATEGORIES.map((c, i) => [c.value, i]));

export const NO_CATEGORY = "Sans catégorie";

/** Group items by their category, following the reference category order. */
export function groupByCategory<T>(
  items: T[],
  getCategory: (item: T) => string | null | undefined,
): Array<[string, T[]]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getCategory(item) || NO_CATEGORY;
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()].sort(
    (a, b) => (ORDER.get(a[0]) ?? 999) - (ORDER.get(b[0]) ?? 999) || a[0].localeCompare(b[0]),
  );
}
