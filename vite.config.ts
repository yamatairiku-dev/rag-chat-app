import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  // 環境変数を読み込む
  const env = loadEnv(mode, process.cwd(), "");
  
  return {
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
    server: {
      port: env.PORT ? parseInt(env.PORT, 10) : 5173,
    },
    test: {
      // E2Eテストを除外（Playwrightで実行）
      exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    },
  };
});
