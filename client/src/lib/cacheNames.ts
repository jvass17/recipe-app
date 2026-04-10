/**
 * Keep in sync with `src/sw.js` (manual SW — no shared import at runtime).
 * Used by client-side Cache API calls so entries land in the same buckets the SW expects.
 */
export const CACHE_VERSION = "recipes-v1";
export const SW_RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
/** Explicitly pinned images when saving favorites (checked first in SW for themealdb URLs). */
export const FAVORITE_IMAGE_CACHE = "recipes-favorite-images-v1";
