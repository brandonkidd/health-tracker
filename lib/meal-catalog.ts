import catalog from '@/data/meal-catalog.json';

export const MEAL_CATALOG_META = {
  catalog: catalog.catalog,
  updated: catalog.updated,
  planContext: catalog.planContext,
  needFromYou: catalog.needFromYou,
};

type CatalogFood = (typeof catalog.foods)[number];

export type RestaurantPreset = {
  id: string;
  label: string;
  say: string;
  category: 'restaurant';
  cals: number;
  p: number;
  c: number;
  f: number;
  fiber?: number;
  notes?: string;
  source?: string;
  verifiedMacros?: boolean;
};

function catalogToPreset(food: CatalogFood): RestaurantPreset | null {
  const macros = food.macros as Partial<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodiumMg: number;
  }>;

  if (!macros.calories || !macros.protein) return null;

  const sodiumNote = macros.sodiumMg != null && macros.sodiumMg >= 1200 ? 'High sodium' : null;
  const notes = [food.source, food.serving, food.orderTip, sodiumNote].filter(Boolean).join(' · ');

  return {
    id: food.id,
    label: food.name,
    say: food.id.replace(/-/g, ' '),
    category: 'restaurant',
    cals: macros.calories,
    p: macros.protein,
    c: macros.carbs ?? 0,
    f: macros.fat ?? 0,
    fiber: macros.fiber,
    notes,
    source: food.source,
    verifiedMacros: food.verifiedMacros,
  };
}

/** Restaurant meals from data/meal-catalog.json */
export const RESTAURANT_PRESETS: RestaurantPreset[] = catalog.foods
  .map(catalogToPreset)
  .filter((preset): preset is RestaurantPreset => preset != null);
