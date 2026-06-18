/**
 * Tiny fetch helper shared by every data module. Runs at build time inside
 * Astro frontmatter (SSG), so a failed request fails the build loudly rather
 * than shipping half-empty examples — that's intentional: the data is the
 * single source of truth, never hardcoded fallbacks.
 */
export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return (await response.json()) as T;
}
