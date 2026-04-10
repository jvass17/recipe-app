import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import type { Meal } from "@/lib/types";
import { getAllFavorites, removeFavorite } from "@/features/favorites/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type SortKey = "name" | "saved";

/**
 * Offline-first favorites: reads only from IndexedDB (works fully offline).
 */
export function Favorites() {
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("saved");
  const [pending, setPending] = useState(true);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setPending(true);
    try {
      const all = await getAllFavorites();
      setMeals(all);
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const list = meals ?? [];
    const q = filter.trim().toLowerCase();
    const next = q
      ? list.filter((m) => m.strMeal.toLowerCase().includes(q) || (m.strCategory ?? "").toLowerCase().includes(q))
      : list;
    const sorted = [...next];
    sorted.sort((a, b) => {
      if (sort === "name") {
        return a.strMeal.localeCompare(b.strMeal);
      }
      return 0;
    });
    return sorted;
  }, [meals, filter, sort]);

  const confirmRemove = async () => {
    if (!removeId) return;
    await removeFavorite(removeId);
    setRemoveId(null);
    await refresh();
  };

  if (pending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Favorites</h1>
        <p className="text-muted-foreground">
          Stored on this device in IndexedDB — available offline. Removing a favorite deletes it locally only.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md flex-1 space-y-2">
          <label htmlFor="fav-filter" className="text-sm font-medium">
            Filter
          </label>
          <Input
            id="fav-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name or category…"
            autoComplete="off"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={sort === "saved" ? "default" : "outline"}
            onClick={() => setSort("saved")}
            aria-pressed={sort === "saved"}
          >
            Recent
          </Button>
          <Button
            type="button"
            variant={sort === "name" ? "default" : "outline"}
            onClick={() => setSort("name")}
            aria-pressed={sort === "name"}
          >
            A–Z
          </Button>
        </div>
      </div>

      {(!meals || meals.length === 0) && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No favorites yet. Save recipes from search or details — they will appear here, even when offline.
          </CardContent>
        </Card>
      )}

      {meals && meals.length > 0 && filtered.length === 0 && (
        <p className="text-muted-foreground">No matches for that filter.</p>
      )}

      <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3" aria-label="Saved recipes">
        {filtered.map((m) => (
          <li key={m.idMeal}>
            <Card className="overflow-hidden">
              <div className="relative aspect-[4/3] bg-muted">
                <Link to={`/recipe/${m.idMeal}`} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <img
                    src={m.strMealThumb}
                    alt={m.strMeal}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </Link>
              </div>
              <CardContent className="space-y-3 p-4">
                <Link to={`/recipe/${m.idMeal}`} className="line-clamp-2 font-semibold hover:underline">
                  {m.strMeal}
                </Link>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setRemoveId(m.idMeal)}
                    aria-label={`Remove ${m.strMeal} from favorites`}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog open={removeId !== null} onOpenChange={(o) => !o && setRemoveId(null)}>
        <DialogContent aria-describedby="remove-desc">
          <DialogHeader>
            <DialogTitle>Remove favorite?</DialogTitle>
            <DialogDescription id="remove-desc">
              This removes the recipe from saved favorites on this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveId(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
