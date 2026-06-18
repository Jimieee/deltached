import { fetchJson } from "./http";

/** Normalized photo used by the Others (gallery) example cards. */
export interface Photo {
  id: string;
  author: string;
  thumb: string;
  full: string;
  source: string;
}

interface PicsumPhoto {
  id: string;
  author: string;
  url: string;
}

const ENDPOINT = "https://picsum.photos/v2/list?limit=6";

/** Source: Lorem Picsum (https://picsum.photos) — free, no key. */
export async function getPhotos(): Promise<Photo[]> {
  const data = await fetchJson<PicsumPhoto[]>(ENDPOINT);

  // Build sized URLs off the stable photo id so each card requests exactly the
  // dimensions it renders at (no oversized downloads, no layout shift).
  return data.map((photo) => ({
    id: photo.id,
    author: photo.author,
    thumb: `https://picsum.photos/id/${photo.id}/600/400`,
    full: `https://picsum.photos/id/${photo.id}/1200/800`,
    source: photo.url,
  }));
}
