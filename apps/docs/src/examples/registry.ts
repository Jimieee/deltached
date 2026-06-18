import ModalsSection from "./sections/ModalsSection.astro";
import ProfilesSection from "./sections/ProfilesSection.astro";
import OthersSection from "./sections/OthersSection.astro";

/**
 * The examples gallery, in render order. Each entry is a self-contained
 * section component that owns its own copy, data fetching and demo markup —
 * the page just iterates this list. Adding a section is one import + one line
 * here; nothing else changes.
 */
export const sections = [ModalsSection, ProfilesSection, OthersSection];
