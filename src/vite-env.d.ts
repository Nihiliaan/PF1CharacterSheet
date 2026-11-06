/// <reference types="vite/client" />

declare module '*.svgt?raw' {
  const content: string;
  export default content;
}

declare module '*.bbc?raw' {
  const content: string;
  export default content;
}
