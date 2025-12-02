import { json } from "react-router";
import { AppError, ErrorCode } from "~/types/error";
import { logger } from "~/lib/logging/logger";

export function handleError(error: unknown) {
  if (error instanceof AppError) {
    logger.error("Application Error", {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack,
    });

    return json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
        timestamp: Date.now(),
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof Error) {
    logger.error("Unexpected Error", {
      message: error.message,
      stack: error.stack,
    });

    return json(
      {
        error: {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: "システムエラーが発生しました",
        },
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }

  logger.error("Unknown Error", { error });

  return json(
    {
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: "システムエラーが発生しました",
      },
      timestamp: Date.now(),
    },
    { status: 500 },
  );
}

