/**
 * Build-time syntax highlighting.
 *
 * One shared Shiki highlighter is created lazily and reused across every code
 * block on the page — `createHighlighter` is expensive (it loads the WASM regex
 * engine and each grammar), so we never spin up more than one. The site is
 * light-only (`color-scheme: light`), so a single light theme is loaded and the
 * tokens' inline colors carry the highlighting; the `<pre>` background is reset
 * in CSS so the surrounding component chrome owns the surface.
 *
 * Highlighting runs in component frontmatter (server/build), so nothing here
 * ships to the browser.
 */
import { createHighlighter, type Highlighter } from "shiki";

export const CODE_THEME = "github-light";
export const CODE_THEME_DARK = "github-dark";

/**
 * Every language used across the docs. Angular/React/Vue/Svelte components are
 * highlighted with their native grammar; package-manager rows use `bash`.
 */
const LANGS = [
  "typescript",
  "tsx",
  "jsx",
  "javascript",
  "vue",
  "svelte",
  "html",
  "css",
  "bash",
  "json",
] as const;

export type CodeLang = (typeof LANGS)[number] | (string & {});

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [CODE_THEME, CODE_THEME_DARK],
      langs: [...LANGS],
    });
  }
  return highlighterPromise;
}

/** Normalize a few friendly aliases onto the loaded grammar ids. */
function resolveLang(lang: CodeLang): string {
  const alias: Record<string, string> = {
    ts: "typescript",
    js: "javascript",
    sh: "bash",
    shell: "bash",
    text: "txt",
    txt: "txt",
  };
  const id = alias[lang] ?? lang;
  return (LANGS as readonly string[]).includes(id) ? id : "txt";
}

/**
 * Highlight a snippet to themed HTML. Leading/trailing blank lines are trimmed
 * so authored template strings can breathe without padding the rendered block.
 */
export async function highlight(code: string, lang: CodeLang): Promise<string> {
  const hl = await getHighlighter();
  return hl.codeToHtml(code.replace(/^\n+|\n+$/g, ""), {
    lang: resolveLang(lang),
    themes: { light: CODE_THEME, dark: CODE_THEME_DARK },
    defaultColor: "light",
  });
}
