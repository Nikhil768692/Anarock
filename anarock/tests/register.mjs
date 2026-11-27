// Lets `node --test` load the app's source files: maps the "@/..." import
// alias to src/ and reads the .js files there as ES modules.
// Newer Node versions use registerHooks(); older ones fall back to register().
import * as nodeModule from "node:module";
import * as hooks from "./alias-loader.mjs";

if (typeof nodeModule.registerHooks === "function") {
  nodeModule.registerHooks({
    resolve: hooks.resolveSync,
    load: hooks.loadSync,
  });
} else {
  nodeModule.register("./alias-loader.mjs", import.meta.url);
}
