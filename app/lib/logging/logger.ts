import winston from "winston";

const logLevel =
  process.env.LOG_LEVEL === "debug" ||
  process.env.LOG_LEVEL === "info" ||
  process.env.LOG_LEVEL === "warn" ||
  process.env.LOG_LEVEL === "error"
    ? process.env.LOG_LEVEL
    : "info";

const logDirectory = process.env.LOG_DIRECTORY || "./logs";
const logMaxFiles = Number.isFinite(Number(process.env.LOG_MAX_FILES))
  ? Number(process.env.LOG_MAX_FILES)
  : 30;

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: "rag-chat-app" },
  transports: [
    new winston.transports.File({
      filename: `${logDirectory}/error.log`,
      level: "error",
      maxsize: 10 * 1024 * 1024,
      maxFiles: logMaxFiles,
    }),
    new winston.transports.File({
      filename: `${logDirectory}/combined.log`,
      maxsize: 10 * 1024 * 1024,
      maxFiles: logMaxFiles,
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}
