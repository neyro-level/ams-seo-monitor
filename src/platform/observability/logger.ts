import pino from "pino";
import type { DestinationStream, Logger, LoggerOptions } from "pino";

const REDACTION_PATHS = [
  "password",
  "token",
  "authorization",
  "cookie",
  "cookies",
  "headers.authorization",
  "headers.cookie",
  "headers.set-cookie",
  "request.headers.authorization",
  "request.headers.cookie",
  "response.headers.set-cookie",
  "db.password",
  "db.connectionString",
  "databaseUrl",
  "DATABASE_URL",
  "env.DATABASE_URL",
  "env.DATABASE_PASSWORD",
  "env.BETTER_AUTH_SECRET",
  "payload.password",
  "payload.token",
  "payload.authorization",
  "payload.cookie",
  "payload.apiKey",
  "payload.secret",
  "safeErrorBody",
  "rawBody",
  "pii.email",
  "pii.phone",
] as const;

function createOptions(): LoggerOptions {
  return {
    level: process.env.LOG_LEVEL?.trim() || "info",
    base: undefined,
    messageKey: "message",
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    redact: {
      paths: [...REDACTION_PATHS],
      censor: "[REDACTED]",
    },
  };
}

const rootLogger = pino(createOptions());

export function createLogger(
  bindings?: Record<string, string | number | boolean | null>,
  destination?: DestinationStream,
): Logger {
  const logger = destination ? pino(createOptions(), destination) : rootLogger;
  return bindings ? logger.child(bindings) : logger;
}

export function getLogger(bindings?: Record<string, string | number | boolean | null>): Logger {
  return bindings ? rootLogger.child(bindings) : rootLogger;
}
