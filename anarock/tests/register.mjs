// Lets `node --test` load the app's source files: maps the "@/..." import
// alias to src/ and reads the .js files there as ES modules.
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
