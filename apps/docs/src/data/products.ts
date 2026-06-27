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
    image:
      "https://wsrv.nl/?url=cataas.com/cat/1eGEsddyKNwtBJFP&w=900&h=700&fit=cover&output=webp&q=80",
    price: 129,
    category: "audio",
  },
  {
    id: 2,
    title: "Fold desk lamp",
    description: "A compact task light with a warm, dimmable glow.",
    image:
      "https://wsrv.nl/?url=cataas.com/cat/1Egt9OiLoKACJHPw&w=900&h=700&fit=cover&output=webp&q=80",
    price: 84,
    category: "lighting",
  },
  {
    id: 3,
    title: "Arc side chair",
    description: "An upholstered chair shaped for small reading corners.",
    image:
      "https://wsrv.nl/?url=cataas.com/cat/1frqP6ajw0JzkR1o&w=900&h=700&fit=cover&output=webp&q=80",
    price: 240,
    category: "furniture",
  },
  {
    id: 4,
    title: "Mono field watch",
    description: "A quiet everyday watch with a brushed steel case.",
    image:
      "https://wsrv.nl/?url=cataas.com/cat/1gROXVBHMQ8nLxCQ&w=900&h=700&fit=cover&output=webp&q=80",
    price: 175,
    category: "accessories",
  },
  {
    id: 5,
    title: "Ridge bottle",
    description: "A double-wall bottle designed for a comfortable grip.",
    image:
      "https://wsrv.nl/?url=cataas.com/cat/1ihNtm9HkcOub9Li&w=900&h=700&fit=cover&output=webp&q=80",
    price: 38,
    category: "outdoors",
  },
  {
    id: 6,
    title: "Frame speaker",
    description: "A compact room speaker with fabric controls and clear sound.",
    image:
      "https://wsrv.nl/?url=cataas.com/cat/1JcOo3LnevDdZlcq&w=900&h=700&fit=cover&output=webp&q=80",
    price: 149,
    category: "audio",
  },
];

export async function getProducts(): Promise<Product[]> {
  return PRODUCTS;
}
