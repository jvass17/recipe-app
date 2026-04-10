import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Shuffle } from "lucide-react";
import { getCategoriesSnapshot, saveCategoriesSnapshot } from "@/features/favorites/db";
import { filterByCategory, getCategories, getRandomMeal, searchMeals } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RecipeCard } from "@/components/RecipeCard";

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Home: browse categories, search by name (via URL `q`), or filter by category (`c`).
 */
export function Home() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const qParam = params.get("q")?.trim() ?? "";
  const cParam = params.get("c")?.trim() ?? "";

  const [localQ, setLocalQ] = useState(qParam);
  useEffect(() => {
    setLocalQ(qParam);
  }, [qParam]);

  const [debouncedQ, setDebouncedQ] = useState(qParam);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(qParam), 350);
    return () => clearTimeout(t);
  }, [qParam]);

  const mode = useMemo(() => {
    if (debouncedQ) return "search" as const;
    if (cParam) return "category" as const;
    return "idle" as const;
  }, [debouncedQ, cParam]);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const list = await getCategories();
        await saveCategoriesSnapshot(list);
        return list;
      } catch (e) {
        const cached = await getCategoriesSnapshot();
        if (cached.length) return cached;
        throw e;
      }
    },
  });

  const searchQuery = useQuery({
    queryKey: ["search", debouncedQ],
    queryFn: () => searchMeals(debouncedQ),
    enabled: mode === "search",
  });

  const filterQuery = useQuery({
    queryKey: ["filter", cParam],
    queryFn: () => filterByCategory(cParam),
    enabled: mode === "category",
  });

  const onSubmitSearch = (e: FormEvent) => {
    e.preventDefault();
    const term = localQ.trim();
    if (!term) return;
    const next = new URLSearchParams();
    next.set("q", term);
    setParams(next);
  };

  const pickCategory = (name: string) => {
    const next = new URLSearchParams();
    next.set("c", name);
    setParams(next);
  };

  const clearFilters = () => setParams(new URLSearchParams());

  const results =
    mode === "search" ? searchQuery.data : mode === "category" ? filterQuery.data : undefined;
  const loading =
    mode === "search"
      ? searchQuery.isPending
      : mode === "category"
        ? filterQuery.isPending
        : false;
  const error =
    mode === "search"
      ? searchQuery.error
      : mode === "category"
        ? filterQuery.error
        : undefined;

  const [randomBusy, setRandomBusy] = useState(false);
  const surprise = async () => {
    setRandomBusy(true);
    try {
      const meal = await getRandomMeal();
      if (meal?.idMeal) {
        navigate(`/recipe/${meal.idMeal}`);
      }
    } finally {
      setRandomBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Find your next meal</h1>
        <p className="text-muted-foreground">
          Search by name, pick a category, or try a random recipe. Favorites work offline.
        </p>
      </div>

      <section aria-labelledby="home-search-heading" className="space-y-3">
        <h2 id="home-search-heading" className="text-lg font-semibold">
          Search
        </h2>
        <form className="flex max-w-xl flex-col gap-2 sm:flex-row" onSubmit={onSubmitSearch}>
          <label htmlFor="home-search-input" className="sr-only">
            Search recipes by name
          </label>
          <Input
            id="home-search-input"
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="e.g. Arrabiata"
            autoComplete="off"
            className="sm:flex-1"
          />
          <div className="flex gap-2">
            <Button type="submit">Search</Button>
            <Button type="button" variant="secondary" onClick={surprise} disabled={randomBusy}>
              <Shuffle className="mr-2 h-4 w-4" aria-hidden />
              Surprise me
            </Button>
          </div>
        </form>
      </section>

      <section aria-labelledby="categories-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="categories-heading" className="text-lg font-semibold">
            Categories
          </h2>
          {(qParam || cParam) && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
        {categoriesQuery.isPending ? (
          <div className="flex flex-wrap gap-2" aria-busy="true" aria-live="polite">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full" />
            ))}
          </div>
        ) : categoriesQuery.error ? (
          <p className="text-sm text-destructive" role="alert">
            Could not load categories. {String(categoriesQuery.error)}
          </p>
        ) : (
          <div
            className="flex flex-wrap gap-2"
            role="list"
            aria-label="Recipe categories"
          >
            {categoriesQuery.data?.map((c) => {
              const active = cParam === c.strCategory;
              return (
                <Button
                  key={c.idCategory}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => pickCategory(c.strCategory)}
                  aria-pressed={active}
                >
                  {c.strCategory}
                </Button>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="results-heading" className="space-y-4">
        <h2 id="results-heading" className="text-lg font-semibold">
          {mode === "search"
            ? `Results for “${debouncedQ}”`
            : mode === "category"
              ? `Category: ${cParam}`
              : "Browse"}
        </h2>

        {mode === "idle" && (
          <p className="text-muted-foreground">
            Start by searching or choosing a category to see recipes here.
          </p>
        )}

        {loading && (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
            aria-live="polite"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {error && mode !== "idle" && (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {String((error as Error).message)}
          </p>
        )}

        {!loading && !error && mode !== "idle" && (!results || results.length === 0) && (
          <p className="text-muted-foreground">No recipes found. Try another search or category.</p>
        )}

        {!loading && results && results.length > 0 && (
          <ul
            className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Recipe results"
          >
            {results.map((meal) => (
              <li key={meal.idMeal}>
                <RecipeCard meal={meal} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
