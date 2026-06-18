import { fetchJson } from "./http";

/** Normalized product used by the Modals example cards. */
export interface Product {
  id: number;
  title: string;
  description: string;
  image: string;
  price: number;
  category: string;
}

interface DummyJsonProducts {
  products: Array<{
    id: number;
    title: string;
    description: string;
    thumbnail: string;
    price: number;
    category: string;
  }>;
}

const ENDPOINT =
  "https://dummyjson.com/products?limit=6&select=title,description,thumbnail,price,category";

/** Source: DummyJSON (https://dummyjson.com) — free, no key. */
export async function getProducts(): Promise<Product[]> {
  const data = await fetchJson<DummyJsonProducts>(ENDPOINT);

  return data.products.map((product) => ({
    id: product.id,
    title: product.title,
    description: product.description,
    image: product.thumbnail,
    price: product.price,
    category: product.category,
  }));
}
