import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChefHat, Heart } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const qParam = params.get("q") ?? "";
  const [q, setQ] = useState(qParam);

  useEffect(() => {
    setQ(qParam);
  }, [qParam]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate(`/?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <header
        className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        role="banner"
      >
        <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 font-semibold tracking-tight text-foreground hover:underline focus-visible:outline-none"
            >
              <ChefHat className="h-7 w-7 text-primary" aria-hidden />
              <span>Recipes</span>
            </Link>
            <nav className="flex items-center gap-1" aria-label="Main">
              <Button variant="ghost" asChild>
                <Link to="/favorites">
                  <Heart className="mr-1 h-4 w-4" aria-hidden />
                  Favorites
                </Link>
              </Button>
            </nav>
            <div className="flex items-center sm:ml-auto" aria-label="Appearance">
              <ThemeToggle />
            </div>
          </div>
          <form
            className="flex w-full max-w-xl flex-1 flex-wrap gap-2 sm:justify-end sm:ml-auto"
            onSubmit={onSearch}
            role="search"
            aria-label="Search recipes"
          >
            <label htmlFor="header-search" className="sr-only">
              Search recipes by name
            </label>
            <Input
              id="header-search"
              name="q"
              placeholder="Search recipes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
              className="min-w-[12rem] flex-1 sm:max-w-xs"
            />
            <Button type="submit">Search</Button>
          </form>
        </div>
      </header>
      <main id="main-content" className="container mx-auto flex-1 px-4 py-6" tabIndex={-1}>
        {children}
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground" role="contentinfo">
        Data from TheMealDB via local API proxy — for development only.
      </footer>
    </div>
  );
}
