import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  // 環境変数を読み込む
  const env = loadEnv(mode, process.cwd(), "");
  
  return {
    plugins: [
      tailwindcss(),
      // テスト環境ではReact Routerプラグインを条件付きで適用
      ...(process.env.NODE_ENV !== 'test' ? [reactRouter()] : []),
      tsconfigPaths(),
    ],
    server: {
      port: env.PORT ? parseInt(env.PORT, 10) : 5173,
    },
    ssr: {
      // markdown系を外部化せずにバンドルさせ、manualChunks指定を安定化
      noExternal: [
        "react-markdown",
        "remark-gfm",
        "react-syntax-highlighter",
        "refractor",
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (
                id.includes("react-markdown") ||
                id.includes("remark-gfm") ||
                id.includes("unified") ||
                id.includes("mdast-") ||
                id.includes("micromark") ||
                id.includes("hast-util") ||
                id.includes("property-information") ||
                id.includes("/vfile")
              ) {
                return "markdown";
              }
              if (
                id.includes("react-syntax-highlighter") ||
                id.includes("refractor")
              ) {
                return "syntax";
              }
            }
            return undefined;
          },
        },
      },
    },
    test: {
      // DOM環境を有効化（Reactコンポーネントのテスト用）
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      // E2Eテストを除外（Playwrightで実行）
      exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: [
          'node_modules/',
          'tests/',
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/*.spec.ts',
          '**/*.spec.tsx',
          '**/dist/',
          '**/build/',
          '**/.{idea,git,cache,output,temp}/',
          '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
          '**/coverage/**',
          '**/playwright-report/**',
        ],
        include: ['app/**/*.{ts,tsx}'],
      },
    },
  };
});
