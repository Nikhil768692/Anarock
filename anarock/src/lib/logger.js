// Server log helper. One line per entry with a level, so the hosting logs can
// be filtered. Debug and info entries are written only when LOG_LEVEL allows
// it (default: "info" in development, "warn" in production).
// Never pass names, phone numbers or e-mail addresses to the logger.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const DEFAULT_LEVEL = process.env.NODE_ENV === "production" ? "warn" : "info";
const threshold =
  LEVELS[String(process.env.LOG_LEVEL || "").toLowerCase()] ?? LEVELS[DEFAULT_LEVEL];

function write(level, args) {
  if (LEVELS[level] < threshold) return;
  const output = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  output(`[${level}]`, ...args);
}

export const logger = {
  debug: (...args) => write("debug", args),
  info: (...args) => write("info", args),
  warn: (...args) => write("warn", args),
  error: (...args) => write("error", args),
};

export default logger;
