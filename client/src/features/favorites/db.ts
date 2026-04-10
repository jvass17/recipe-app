import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CategoryItem, Meal } from "@/lib/types";
import { cacheAssetsForFavorite, removeCachedAssetsForMeal } from "@/lib/offlineCache";

const DB_NAME = "recipes-favorites";
const DB_VERSION = 2;
const STORE_MEALS = "meals";
const STORE_META = "meta";
const META_CATEGORIES_KEY = "categories";

interface MealRow {
  id: string;
  meal: Meal;
  savedAt: number;
}

interface MetaCategoriesRow {
  id: typeof META_CATEGORIES_KEY;
  list: CategoryItem[];
  savedAt: number;
}

interface RecipesDB extends DBSchema {
  [STORE_MEALS]: {
    key: string;
    value: MealRow;
    indexes: { "by-savedAt": number };
  };
  [STORE_META]: {
    key: string;
    value: MetaCategoriesRow;
  };
}

let dbPromise: Promise<IDBPDatabase<RecipesDB>> | null = null;

function getDb(): Promise<IDBPDatabase<RecipesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RecipesDB>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion) {
        if (!database.objectStoreNames.contains(STORE_MEALS)) {
          const store = database.createObjectStore(STORE_MEALS, { keyPath: "id" });
          store.createIndex("by-savedAt", "savedAt");
        }
        if (oldVersion < 2 && !database.objectStoreNames.contains(STORE_META)) {
          database.createObjectStore(STORE_META, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveCategoriesSnapshot(list: CategoryItem[]): Promise<void> {
  const db = await getDb();
  await db.put(STORE_META, {
    id: META_CATEGORIES_KEY,
    list,
    savedAt: Date.now(),
  });
}

export async function getCategoriesSnapshot(): Promise<CategoryItem[]> {
  const db = await getDb();
  const row = await db.get(STORE_META, META_CATEGORIES_KEY);
  return row?.list ?? [];
}

export type SaveFavoriteOptions = {
  /** Category list from React Query when available — stored for offline Home chips + image thumbs. */
  categories?: CategoryItem[] | null;
};

/**
 * Persist full meal payload so favorites work offline (ingredients, instructions, tags, links).
 * Optionally snapshots categories + caches images / API meal response via `offlineCache`.
 */
export async function saveFavorite(meal: Meal, options?: SaveFavoriteOptions): Promise<void> {
  const id = meal.idMeal;
  if (!id) throw new Error("Meal has no idMeal");
  const db = await getDb();
  await db.put(STORE_MEALS, {
    id,
    meal,
    savedAt: Date.now(),
  });
  if (options?.categories?.length) {
    await saveCategoriesSnapshot(options.categories);
  }
  const categoriesForImages =
    options?.categories?.length ? options.categories : await getCategoriesSnapshot();
  await cacheAssetsForFavorite(
    meal,
    categoriesForImages.length ? categoriesForImages : null
  );
}

export async function removeFavorite(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.get(STORE_MEALS, id);
  await db.delete(STORE_MEALS, id);
  if (row?.meal) {
    await removeCachedAssetsForMeal(row.meal);
  }
}

export async function getFavorite(id: string): Promise<Meal | undefined> {
  const db = await getDb();
  const row = await db.get(STORE_MEALS, id);
  return row?.meal;
}

export async function getAllFavorites(): Promise<Meal[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex(STORE_MEALS, "by-savedAt");
  return rows.map((r) => r.meal).reverse();
}

export async function isFavorite(id: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.get(STORE_MEALS, id);
  return !!row;
}
