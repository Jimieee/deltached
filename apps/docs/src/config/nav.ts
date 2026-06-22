export interface NavItem {
  label: string;
  href: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const withBase = (path: `/${string}`): string =>
  path === "/" ? `${BASE}/` : `${BASE}${path}`;

export const navItems: NavItem[] = [
  { label: "Home", href: withBase("/") },
  { label: "Examples", href: withBase("/examples") },
  { label: "Docs", href: withBase("/docs") },
  { label: "Roadmap", href: withBase("/roadmap") },
  { label: "Changelog", href: withBase("/changelog") },
];

export const REPO = "https://github.com/Jimieee/deltached";
export const NPM = "https://www.npmjs.com/package/deltached";

/** Home matches exactly; every other item matches its path prefix. */
export const isActive = (pathname: string, href: string): boolean =>
  href === withBase("/") ? pathname === href : pathname.startsWith(href);
