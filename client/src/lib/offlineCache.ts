import type { CategoryItem, Meal } from "@/lib/types";
import { FAVORITE_IMAGE_CACHE, SW_RUNTIME_CACHE } from "@/lib/cacheNames";

/**
 * Fetch and store remote images + same-origin meal JSON in Cache Storage so favorites
 * and recipe details stay usable offline (images + /api/meal/:id for React Query/SW).
 */
export async function cacheAssetsForFavorite(
  meal: Meal,
  categories?: CategoryItem[] | null
): Promise<void> {
  const fav = await caches.open(FAVORITE_IMAGE_CACHE);
  const urls = new Set<string>();
  if (meal.strMealThumb) urls.add(meal.strMealThumb);
  if (categories?.length) {
    for (const c of categories) {
      if (c.strCategoryThumb) urls.add(c.strCategoryThumb);
    }
  }

  await Promise.all(
    [...urls].map(async (url) => {
      try {
        const res = await fetch(url, { mode: "cors", credentials: "omit" });
        if (res.ok) await fav.put(url, res.clone());
      } catch {
        /* single URL failure should not block the rest */
      }
    })
  );

  try {
    const apiUrl = new URL(`/api/meal/${meal.idMeal}`, self.location.origin).href;
    const res = await fetch(apiUrl);
    if (res.ok) {
      const runtime = await caches.open(SW_RUNTIME_CACHE);
      await runtime.put(apiUrl, res.clone());
    }
  } catch {
    /* optional: network-only API cache */
  }
}

/**
 * Remove cached blobs tied to a favorite when the user unfavorites.
 */
export async function removeCachedAssetsForMeal(meal: Meal): Promise<void> {
  const fav = await caches.open(FAVORITE_IMAGE_CACHE);
  if (meal.strMealThumb) {
    await fav.delete(meal.strMealThumb);
  }
  try {
    const apiUrl = new URL(`/api/meal/${meal.idMeal}`, self.location.origin).href;
    const runtime = await caches.open(SW_RUNTIME_CACHE);
    await runtime.delete(apiUrl);
  } catch {
    /* ignore */
  }
}
