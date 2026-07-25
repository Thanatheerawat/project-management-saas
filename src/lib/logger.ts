type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

/**
 * Thin logging wrapper. Every log call goes through here instead of raw
 * `console.*` so swapping to Pino (server) or Sentry (error reporting)
 * later is a one-file change — nothing that calls `logger.*` needs to move.
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  const entry = {
    level,
    message,
    ...(context ? { context } : {}),
    timestamp: new Date().toISOString(),
  };

  switch (level) {
    case "error":
      console.error(entry);
      break;
    case "warn":
      console.warn(entry);
      break;
    default:
      console.log(entry);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
};
