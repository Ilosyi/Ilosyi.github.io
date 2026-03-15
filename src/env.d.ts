/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module 'katex/contrib/auto-render' {
  interface AutoRenderDelimiter {
    left: string;
    right: string;
    display: boolean;
  }

  interface AutoRenderOptions {
    delimiters?: AutoRenderDelimiter[];
    throwOnError?: boolean;
    strict?: boolean | string | ((errorCode: string, errorMsg: string, token?: string) => boolean | string);
    ignoredTags?: string[];
    ignoredClasses?: string[];
  }

  export default function renderMathInElement(element: HTMLElement, options?: AutoRenderOptions): void;
}
