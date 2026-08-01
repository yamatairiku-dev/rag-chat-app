declare module "react-syntax-highlighter/dist/esm/prism-async-light" {
  import type { ComponentType } from "react";
  import type { SyntaxHighlighterProps } from "react-syntax-highlighter";

  const PrismAsyncLight: ComponentType<SyntaxHighlighterProps>;
  export default PrismAsyncLight;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus" {
  import type { CSSProperties } from "react";

  const style: Record<string, CSSProperties>;
  export default style;
}
