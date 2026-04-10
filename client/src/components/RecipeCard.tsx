import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import type { CategoryItem, Meal } from "@/lib/types";
import { isFavorite, removeFavorite, saveFavorite } from "@/features/favorites/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

interface RecipeCardProps {
  meal: Meal;
}

export function RecipeCard({ meal }: RecipeCardProps) {
  const id = meal.idMeal;
  const queryClient = useQueryClient();
  const [fav, setFav] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isFavorite(id).then((v) => {
      if (!cancelled) setFav(v);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (fav) {
      await removeFavorite(id);
      setFav(false);
    } else {
      const categories = queryClient.getQueryData<CategoryItem[]>(["categories"]);
      await saveFavorite(meal, { categories });
      setFav(true);
    }
  };

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <Link to={`/recipe/${id}`} className="block h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img
            src={meal.strMealThumb}
            alt={meal.strMeal}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </Link>
        <Button
          type="button"
          size="icon"
          variant={fav ? "default" : "secondary"}
          className="absolute right-2 top-2 rounded-full shadow-md"
          onClick={toggle}
          aria-pressed={fav}
          aria-label={fav ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`h-4 w-4 ${fav ? "fill-current" : ""}`} aria-hidden />
        </Button>
      </div>
      <CardHeader className="p-4 pb-2">
        <Link to={`/recipe/${id}`} className="line-clamp-2 font-semibold leading-snug hover:underline">
          {meal.strMeal}
        </Link>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        <div className="flex flex-wrap gap-1">
          {meal.strCategory ? (
            <Badge variant="secondary">{meal.strCategory}</Badge>
          ) : null}
          {meal.strArea ? (
            <Badge variant="outline">{meal.strArea}</Badge>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to={`/recipe/${id}`}>View recipe</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
