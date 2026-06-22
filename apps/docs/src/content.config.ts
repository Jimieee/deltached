import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

const changelog = defineCollection({
  loader: glob({
    pattern: "CHANGELOG.md",
    base: "../../packages/deltached",
  }),
});

export const collections = { changelog };
