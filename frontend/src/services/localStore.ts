const PREFS_KEY = 'labellens_allergen_prefs';

export const DEFAULT_ALLERGEN_OPTIONS = [
  'Milk / Dairy',
  'Peanuts',
  'Tree Nuts',
  'Soy / Soya',
  'Wheat / Gluten',
  'Egg',
  'Fish',
  'Crustaceans / Shellfish',
  'Sesame',
  'Mustard',
  'Sulphites',
];

export function getUserAllergenPreferences(): string[] {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return ['Wheat / Gluten', 'Peanuts', 'Milk / Dairy'];
}

export function saveUserAllergenPreferences(prefs: string[]): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}
