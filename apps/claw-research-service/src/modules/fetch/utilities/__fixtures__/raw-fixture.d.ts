// Vite/Vitest `?raw` imports: a fixture file's text as a string, read by the
// bundler instead of an `fs` call in the spec.
declare module '*.html?raw' {
  const content: string;
  export default content;
}
