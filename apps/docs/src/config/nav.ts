export interface NavItem {
  label: string;
  href: string;
}

export const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Examples", href: "/examples" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "Changelog", href: "/changelog" },
];

export const REPO = "https://github.com/Jimieee/deltached";
export const NPM = "https://www.npmjs.com/package/deltached";

/** Home matches only "/"; every other item matches its path prefix. */
export const isActive = (pathname: string, href: string): boolean =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);
