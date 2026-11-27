const SRC = new URL("../src/", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    let target = new URL(specifier.slice(2), SRC).href;
    if (!/\.[cm]?js$/.test(target)) target += ".js";
    return nextResolve(target, context);
  }
  // Next.js entry points such as "next/server" have no package exports map,
  // so ES module resolution needs the file extension.
  if (/^next\/[a-z-]+$/.test(specifier)) {
    return nextResolve(`${specifier}.js`, context);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith(SRC) && url.endsWith(".js")) {
    return nextLoad(url, { ...context, format: "module" });
  }
  return nextLoad(url, context);
}
