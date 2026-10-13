// Vite's `?raw` query imports a file as its text. Specs use it to read source
// files without a filesystem call.
declare module '*?raw' {
  const content: string;
  export default content;
}
