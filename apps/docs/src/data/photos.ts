/** Normalized photo used by the gallery example cards. */
export interface Photo {
  id: string;
  author: string;
  thumb: string;
  full: string;
  source: string;
}

const photo = (id: string, author: string): Photo => ({
  id,
  author,
  thumb: `https://picsum.photos/id/${id}/600/400`,
  full: `https://picsum.photos/id/${id}/1200/800`,
  source: `https://picsum.photos/id/${id}/info`,
});

/** Static metadata means the documentation build never depends on an API. */
const PHOTOS: Photo[] = [
  photo("10", "Paul Jarvis"),
  photo("20", "Alejandro Escamilla"),
  photo("29", "Lukas Budimaier"),
  photo("42", "Annie Spratt"),
  photo("48", "Tuur Tisseghem"),
  photo("64", "Glenn Carstens-Peters"),
];

export async function getPhotos(): Promise<Photo[]> {
  return PHOTOS;
}
