import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Heart, Youtube } from "lucide-react";
import { getMealById } from "@/lib/api";
import { getMealIngredients, type CategoryItem, type Meal } from "@/lib/types";
import { getFavorite, isFavorite, removeFavorite, saveFavorite } from "@/features/favorites/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

async function loadMealWithOfflineFallback(id: string): Promise<Meal> {
  try {
    const m = await getMealById(id);
    if (m) return m;
  } catch {
    /* try offline */
  }
  const disk = await getFavorite(id);
  if (disk) return disk;
  throw new Error("Recipe unavailable offline. Connect to the internet or open a saved favorite.");
}

export function Details() {
  const { id } = useParams<{ id: string }>();
  const mealId = id ?? "";
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["meal", mealId],
    queryFn: () => loadMealWithOfflineFallback(mealId),
    enabled: !!mealId,
  });

  const meal = query.data;
  const [fav, setFav] = useState(false);

  useEffect(() => {
    if (!mealId) return;
    let cancelled = false;
    isFavorite(mealId).then((v) => {
      if (!cancelled) setFav(v);
    });
    return () => {
      cancelled = true;
    };
  }, [mealId]);

  const toggleFavorite = async () => {
    if (!meal) return;
    if (fav) {
      await removeFavorite(meal.idMeal);
      setFav(false);
    } else {
      const categories = queryClient.getQueryData<CategoryItem[]>(["categories"]);
      await saveFavorite(meal, { categories });
      setFav(true);
    }
  };

  if (!mealId) {
    return <p role="alert">Missing recipe id.</p>;
  }

  if (query.isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-6" aria-busy="true" aria-live="polite">
        <Skeleton className="aspect-video w-full rounded-lg" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (query.isError || !meal) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <p className="font-medium text-destructive" role="alert">
          {query.error instanceof Error ? query.error.message : "Could not load recipe."}
        </p>
        <Button asChild variant="outline">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  const ingredients = getMealIngredients(meal);
  const tags = meal.strTags
    ? meal.strTags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{meal.strMeal}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {meal.strCategory ? <Badge>{meal.strCategory}</Badge> : null}
              {meal.strArea ? <Badge variant="secondary">{meal.strArea}</Badge> : null}
            </div>
          </div>
          <Button
            type="button"
            variant={fav ? "default" : "outline"}
            onClick={toggleFavorite}
            aria-pressed={fav}
            aria-label={fav ? "Remove from favorites" : "Save to favorites"}
          >
            <Heart className={`mr-2 h-4 w-4 ${fav ? "fill-current" : ""}`} aria-hidden />
            {fav ? "Saved" : "Save"}
          </Button>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <img
          src={meal.strMealThumb}
          alt={meal.strMeal}
          className="aspect-video w-full object-cover"
          loading="eager"
          decoding="async"
        />
      </div>

      {tags.length > 0 && (
        <section aria-labelledby="tags-heading">
          <h2 id="tags-heading" className="mb-2 text-lg font-semibold">
            Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="ingredients-heading">
        <h2 id="ingredients-heading" className="mb-3 text-lg font-semibold">
          Ingredients
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2" role="list">
          {ingredients.map((row) => (
            <li
              key={row.ingredient}
              className="flex justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm"
            >
              <span>{row.ingredient}</span>
              <span className="text-muted-foreground">{row.measure || "—"}</span>
            </li>
          ))}
        </ul>
      </section>

      {meal.strYoutube ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Youtube className="h-5 w-5" aria-hidden />
              Video
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={meal.strYoutube}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
            >
              Watch on YouTube
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </CardContent>
        </Card>
      ) : null}

      <section aria-labelledby="instructions-heading">
        <h2 id="instructions-heading" className="mb-3 text-lg font-semibold">
          Instructions
        </h2>
        <div className="max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {meal.strInstructions ?? "No instructions provided."}
        </div>
      </section>
    </article>
  );
}
