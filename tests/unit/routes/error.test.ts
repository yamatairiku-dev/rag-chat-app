import { describe, expect, it } from "vitest";
import { loader, meta } from "~/routes/error";

describe("error route", () => {
  describe("loader", () => {
    it("正常系: title・message・statusがクエリパラメータから取得できる", async () => {
      const request = new Request(
        "http://localhost/error?title=" +
          encodeURIComponent("アクセス権限がありません") +
          "&message=" +
          encodeURIComponent("所属部署が見つかりません。") +
          "&status=403",
      );

      const result = await loader({ request } as never);

      expect(result).toEqual({
        title: "アクセス権限がありません",
        message: "所属部署が見つかりません。",
        status: 403,
      });
    });

    it("正常系: クエリパラメータがない場合はデフォルト値を返す", async () => {
      const request = new Request("http://localhost/error");

      const result = await loader({ request } as never);

      expect(result).toEqual({
        title: "エラーが発生しました",
        message: "予期しないエラーが発生しました。しばらく時間をおいて再度お試しください。",
        status: null,
      });
    });

    it("正常系: statusが数値に変換できない文字列の場合はNaNになる", async () => {
      const request = new Request("http://localhost/error?status=abc");

      const result = await loader({ request } as never);

      expect(result.status).toBeNaN();
    });
  });

  describe("meta", () => {
    it("正常系: titleを含むメタデータを返す", () => {
      const result = meta({
        data: { title: "認証エラー", message: "", status: 400 },
      } as never);

      expect(result).toEqual([
        { title: "認証エラー - 社内RAG検索チャットボット" },
      ]);
    });

    it("正常系: dataがない場合はデフォルトタイトルを使用する", () => {
      const result = meta({ data: undefined } as never);

      expect(result).toEqual([
        { title: "エラー - 社内RAG検索チャットボット" },
      ]);
    });
  });
});
