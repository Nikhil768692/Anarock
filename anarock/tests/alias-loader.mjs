const SRC = new URL("../src/", import.meta.url).href;

function mapSpecifier(specifier) {
  if (specifier.startsWith("@/")) {
    const target = new URL(specifier.slice(2), SRC).href;
    return /\.[cm]?js$/.test(target) ? target : `${target}.js`;
  }
  // Next.js entry points such as "next/server" have no package exports map,
  // so ES module resolution needs the file extension.
  if (/^next\/[a-z-]+$/.test(specifier)) return `${specifier}.js`;
  return specifier;
}

const loadContext = (url, context) =>
  url.startsWith(SRC) && url.endsWith(".js") ? { ...context, format: "module" } : context;

// Hooks for module.register() (async, older Node versions).
export async function resolve(specifier, context, nextResolve) {
  return nextResolve(mapSpecifier(specifier), context);
}

export async function load(url, context, nextLoad) {
  return nextLoad(url, loadContext(url, context));
}

// Hooks for module.registerHooks() (synchronous, newer Node versions).
export function resolveSync(specifier, context, nextResolve) {
  return nextResolve(mapSpecifier(specifier), context);
}

export function loadSync(url, context, nextLoad) {
  return nextLoad(url, loadContext(url, context));
}
