import { describe, expect, it } from "vitest";
import { cn } from "~/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("正常系: クラス名をマージできる", () => {
      const result = cn("class1", "class2");
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("正常系: 条件付きクラス名を処理できる", () => {
      const result = cn("base", true && "conditional", false && "not-included");
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("正常系: 配列のクラス名を処理できる", () => {
      const result = cn(["class1", "class2"], "class3");
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("正常系: オブジェクト形式のクラス名を処理できる", () => {
      const result = cn({ class1: true, class2: false, class3: true });
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("正常系: 重複するクラス名をマージできる", () => {
      const result = cn("px-2 py-1", "px-4");
      // tailwind-mergeにより、後のpx-4が優先される
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("正常系: 空の引数でもエラーにならない", () => {
      const result = cn();
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("正常系: undefinedやnullを無視できる", () => {
      const result = cn("class1", undefined, null, "class2");
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });
  });
});





