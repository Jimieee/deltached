/** Normalized product used by the fullscreen example cards. */
export interface Product {
  id: number;
  title: string;
  description: string;
  image: string;
  price: number;
  category: string;
}

/**
 * Versioned fixtures keep documentation builds deterministic. The images are
 * remote demo assets, but no network request is needed to generate the site.
 */
const PRODUCTS: Product[] = [
  {
    id: 1,
    title: "Orbit headphones",
    description: "Wireless over-ear headphones with a lightweight matte shell.",
    image: "https://picsum.photos/seed/deltached-product-1/900/700",
    price: 129,
    category: "audio",
  },
  {
    id: 2,
    title: "Fold desk lamp",
    description: "A compact task light with a warm, dimmable glow.",
    image: "https://picsum.photos/seed/deltached-product-2/900/700",
    price: 84,
    category: "lighting",
  },
  {
    id: 3,
    title: "Arc side chair",
    description: "An upholstered chair shaped for small reading corners.",
    image: "https://picsum.photos/seed/deltached-product-3/900/700",
    price: 240,
    category: "furniture",
  },
  {
    id: 4,
    title: "Mono field watch",
    description: "A quiet everyday watch with a brushed steel case.",
    image: "https://picsum.photos/seed/deltached-product-4/900/700",
    price: 175,
    category: "accessories",
  },
  {
    id: 5,
    title: "Ridge bottle",
    description: "A double-wall bottle designed for a comfortable grip.",
    image: "https://picsum.photos/seed/deltached-product-5/900/700",
    price: 38,
    category: "outdoors",
  },
  {
    id: 6,
    title: "Frame speaker",
    description: "A compact room speaker with fabric controls and clear sound.",
    image: "https://picsum.photos/seed/deltached-product-6/900/700",
    price: 149,
    category: "audio",
  },
];

export async function getProducts(): Promise<Product[]> {
  return PRODUCTS;
}
