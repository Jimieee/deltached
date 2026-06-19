import ModalsSection from "./sections/ModalsSection.astro";
import ProfilesSection from "./sections/ProfilesSection.astro";
import OthersSection from "./sections/OthersSection.astro";

/**
 * The examples gallery, in render order. Each entry is a self-contained
 * section component plus the metadata the page and the navbar both need:
 *  - `id`       the anchor rendered on the <section> (single source of truth).
 *  - `navLabel` the short label shown in the navbar references.
 *
 * Adding a section is one import + one line here; the page render AND the
 * in-page navigation update from the same list, so nothing is hardcoded twice.
 */
export const sections = [
  { id: "modals", navLabel: "Modals", Component: ModalsSection },
  { id: "profiles", navLabel: "Profiles", Component: ProfilesSection },
  { id: "others", navLabel: "Others", Component: OthersSection },
];

/** In-page navbar references, derived from the sections above. */
export const references = sections.map((section) => ({
  label: section.navLabel,
  href: `#${section.id}`,
}));
