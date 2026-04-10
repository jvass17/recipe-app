import { Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Layout } from "@/components/Layout";
import { OfflineListener } from "@/components/OfflineListener";
import { Home } from "@/pages/Home";
import { Details } from "@/pages/Details";
import { Favorites } from "@/pages/Favorites";

export default function App() {
  return (
    <ErrorBoundary>
      <OfflineListener />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recipe/:id" element={<Details />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route
            path="*"
            element={
              <div className="rounded-md border p-6 text-center" role="alert">
                <p className="font-medium">Page not found</p>
                <a href="/" className="mt-2 inline-block text-primary underline">
                  Go home
                </a>
              </div>
            }
          />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}
