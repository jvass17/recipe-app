import type { CategoriesResponse, Meal, MealsResponse } from "./types";

/**
 * All requests go to same-origin `/api/*` — Vite dev server proxies to Express;
 * production should place the SPA and API behind one origin or a gateway.
 * The client never calls TheMealDB directly and never sees MEALDB_API_KEY.
 */
const API = "";
const API_TIMEOUT_MS = 8000;

async function fetchWithTimeout(input: RequestInfo | URL, timeoutMs = API_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const err = (await res.json()) as { message?: string; error?: string };
      message = err.message || err.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function searchMeals(query: string): Promise<Meal[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await fetchWithTimeout(`${API}/api/search?s=${encodeURIComponent(q)}`);
  const data = await handleJson<MealsResponse>(res);
  return data.meals ?? [];
}

export async function getMealById(id: string): Promise<Meal | null> {
  const res = await fetchWithTimeout(`${API}/api/meal/${encodeURIComponent(id)}`);
  const data = await handleJson<MealsResponse>(res);
  const meal = data.meals?.[0];
  return meal ?? null;
}

export async function getCategories(): Promise<CategoriesResponse["categories"]> {
  const res = await fetchWithTimeout(`${API}/api/categories`);
  const data = await handleJson<CategoriesResponse>(res);
  return data.categories ?? [];
}

export async function filterByCategory(category: string): Promise<Meal[]> {
  const res = await fetchWithTimeout(`${API}/api/filter?c=${encodeURIComponent(category)}`);
  const data = await handleJson<MealsResponse>(res);
  return data.meals ?? [];
}

export async function getRandomMeal(): Promise<Meal | null> {
  const res = await fetchWithTimeout(`${API}/api/random`);
  const data = await handleJson<MealsResponse>(res);
  return data.meals?.[0] ?? null;
}
