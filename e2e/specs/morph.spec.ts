import { defineMorphSuite } from "./morph.shared";

// The same behaviour suite, run against the vanilla controller and each
// framework wrapper, to confirm the bindings behave identically.
defineMorphSuite("vanilla", "/");
defineMorphSuite("react", "/react/");
defineMorphSuite("vue", "/vue/");
defineMorphSuite("svelte", "/svelte/");
