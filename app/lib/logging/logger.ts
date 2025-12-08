import winston from "winston";
import { env } from "~/lib/utils/env";

/**
 * ログフォーマッター
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * ロガーインスタンス
 */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: "rag-chat-app" },
  transports: [
    // ファイル出力
    new winston.transports.File({
      filename: `${env.LOG_DIRECTORY}/error.log`,
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: env.LOG_MAX_FILES,
    }),
    new winston.transports.File({
      filename: `${env.LOG_DIRECTORY}/combined.log`,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: env.LOG_MAX_FILES,
    }),
  ],
});

// 開発環境ではコンソールにも出力
if (env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}
