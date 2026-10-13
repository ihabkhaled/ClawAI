// Vite's `?raw` query imports a file as its text. Specs use it to read prisma
// migrations, schema and seed files without a filesystem call.
declare module '*?raw' {
  const content: string;
  export default content;
}
