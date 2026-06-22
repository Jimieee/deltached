import FormsSection from "./sections/FormsSection.astro";
import FullscreenSection from "./sections/FullscreenSection.astro";
import GallerySection from "./sections/GallerySection.astro";
import MenusSection from "./sections/MenusSection.astro";

/**
 * The examples gallery, in render order. Each entry is a self-contained
 * section component plus the metadata the page and the navbar both need:
 *  - `id`       the anchor rendered on the <section> (single source of truth).
 *  - `navLabel` the short label shown in the navbar references.
 *
 * Every section is the SAME generic pipeline — a `[data-modal]` overlay morphed
 * by deltached — composed differently: a button into a form, a form field into
 * a custom select, a card into a fullscreen takeover, a thumbnail into a
 * lightbox, a toolbar button into a directional menu. Nesting is free because a
 * trigger can live inside another panel.
 *
 * Adding a section is one import + one line here; the page render AND the
 * in-page navigation update from the same list, so nothing is hardcoded twice.
 */
export const sections = [
  { id: "forms", navLabel: "Forms", Component: FormsSection },
  { id: "fullscreen", navLabel: "Fullscreen", Component: FullscreenSection },
  { id: "gallery", navLabel: "Gallery", Component: GallerySection },
  { id: "menus", navLabel: "Menus", Component: MenusSection },
];

/** In-page navbar references, derived from the sections above. */
export const references = sections.map((section) => ({
  label: section.navLabel,
  href: `#${section.id}`,
}));
