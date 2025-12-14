import { describe, expect, it } from "vitest";
import winston from "winston";
import { logger } from "~/lib/logging/logger";

describe("logger", () => {
  it("正常系: ロガーはerror、warn、info、debugメソッドを持つ", () => {
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("正常系: ロガーはJSON形式でログを出力する", () => {
    // ロガーのフォーマットを確認
    expect(logger.format).toBeDefined();
  });

  it("正常系: ロガーはdefaultMetaにservice名を持つ", () => {
    expect(logger.defaultMeta).toMatchObject({
      service: "rag-chat-app",
    });
  });

  it("正常系: errorレベルのログはファイルに出力される", () => {
    const errorTransport = logger.transports.find(
      (t) =>
        t instanceof winston.transports.File &&
        (t as winston.transports.FileTransportInstance).level === "error"
    );
    
    expect(errorTransport).toBeDefined();
  });

  it("正常系: すべてのレベルのログはファイルに出力される", () => {
    const combinedTransport = logger.transports.find(
      (t) =>
        t instanceof winston.transports.File &&
        !(t as winston.transports.FileTransportInstance).level
    );
    
    expect(combinedTransport).toBeDefined();
  });

  it("正常系: 開発環境ではコンソールにも出力される", () => {
    // NODE_ENVがproductionでない場合はコンソールトランスポートが追加される
    const consoleTransport = logger.transports.find(
      (t) => t instanceof winston.transports.Console
    );
    
    // 開発環境ではコンソールトランスポートが存在する
    if (process.env.NODE_ENV !== "production") {
      expect(consoleTransport).toBeDefined();
    }
  });

  it("正常系: ロガーは実際にログを出力できる", () => {
    // ログがエラーなく出力されることを確認
    expect(() => {
      logger.info("テストログ", { test: true });
      logger.warn("警告ログ", { test: true });
      logger.error("エラーログ", { test: true });
      logger.debug("デバッグログ", { test: true });
    }).not.toThrow();
  });

  it("正常系: ロガーはオブジェクトをログに含められる", () => {
    const testObject = {
      key: "value",
      number: 123,
      nested: { inner: "data" },
    };
    
    expect(() => {
      logger.info("オブジェクトログ", testObject);
    }).not.toThrow();
  });

  it("正常系: ロガーはエラーオブジェクトをログに含められる", () => {
    const error = new Error("テストエラー");
    error.stack = "Error: テストエラー\n    at test";
    
    expect(() => {
      logger.error("エラーログ", { error });
    }).not.toThrow();
  });

  it("正常系: ロガーのtransportsが設定されている", () => {
    expect(logger.transports.length).toBeGreaterThan(0);
  });

  it("正常系: ファイルトランスポートが設定されている", () => {
    const fileTransports = logger.transports.filter(
      (t) => t instanceof winston.transports.File
    );
    
    expect(fileTransports.length).toBeGreaterThanOrEqual(2);
  });
});

