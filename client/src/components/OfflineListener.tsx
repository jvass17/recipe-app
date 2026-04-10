import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Shows a friendly toast when the browser goes offline / back online.
 * Complements service worker offline navigation fallbacks.
 */
export function OfflineListener() {
  const wasOffline = useRef(false);

  useEffect(() => {
    const onOffline = () => {
      wasOffline.current = true;
      toast.message("You are offline", {
        description: "Cached recipes and favorites stay available.",
      });
    };
    const onOnline = () => {
      if (wasOffline.current) {
        toast.success("Back online");
      }
      wasOffline.current = false;
    };
    if (!navigator.onLine) {
      wasOffline.current = true;
      toast.message("You are offline", {
        description: "Showing cached content where possible.",
      });
    }
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
