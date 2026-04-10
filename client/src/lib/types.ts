/**
 * Subset of TheMealDB meal fields used in the UI.
 * Ingredient/measure pairs use indexed keys strIngredient1..20, strMeasure1..20.
 */
export interface Meal {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strYoutube?: string;
  strTags?: string | null;
  [key: string]: string | null | undefined;
}

export interface CategoriesResponse {
  categories: {
    idCategory: string;
    strCategory: string;
    strCategoryThumb: string;
    strCategoryDescription: string;
  }[];
}

/** Single category row from TheMealDB `categories.php` (cached offline with favorites). */
export type CategoryItem = CategoriesResponse["categories"][number];

export interface MealsResponse {
  meals: Meal[] | null;
}

export function getMealIngredients(meal: Meal): { ingredient: string; measure: string }[] {
  const out: { ingredient: string; measure: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const meas = meal[`strMeasure${i}`];
    if (ing && String(ing).trim()) {
      out.push({
        ingredient: String(ing).trim(),
        measure: meas ? String(meas).trim() : "",
      });
    }
  }
  return out;
}
