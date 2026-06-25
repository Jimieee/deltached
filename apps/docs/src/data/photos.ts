/** Normalized photo used by the gallery example cards. */
export interface Photo {
  id: string;
  author: string;
  thumb: string;
  full: string;
  source: string;
}

/**
 * Cat photos (cataas IDs) are served through wsrv.nl: it resizes, crops, and
 * re-encodes to WebP on a Cloudflare CDN, so the browser gets a small cached
 * image instead of cataas re-rendering a heavy JPEG on every request.
 */
const cat = (id: string, w: number, h: number, q = 80): string =>
  `https://wsrv.nl/?url=cataas.com/cat/${id}&w=${w}&h=${h}&fit=cover&output=webp&q=${q}`;

const photo = (id: string, author: string): Photo => ({
  id,
  author,
  thumb: cat(id, 600, 400),
  full: cat(id, 1200, 800, 82),
  source: `https://cataas.com/cat/${id}?json=true`,
});

/** Static metadata means the documentation build never depends on an API. */
const PHOTOS: Photo[] = [
  photo("04eEQhDfAL8l5nt3", "Paul Jarvis"),
  photo("05Xd4JtN14983pns", "Alejandro Escamilla"),
  photo("09wFxpacQzvf9jfM", "Lukas Budimaier"),
  photo("0B2g7aTANObiqPJJ", "Annie Spratt"),
  photo("0C2bQ39x8kuhx31p", "Tuur Tisseghem"),
  photo("0DVs2d6bIVIt3ehk", "Glenn Carstens-Peters"),
];

export async function getPhotos(): Promise<Photo[]> {
  return PHOTOS;
}
