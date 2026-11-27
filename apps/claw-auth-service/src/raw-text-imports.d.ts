// Vite's `?raw` query imports a file as its text. Specs use it to read prisma
// migrations, schema and seed files without a filesystem call.
declare module '*?raw' {
  const content: string;
  export default content;
}

// Vite's `import.meta.glob`, for specs that read a whole folder (every prisma
// migration) without building a file path at run time. Only Vitest transforms
// it; production code never calls it, and no `vite` types are pulled into the build.
interface ImportMeta {
  glob<T = unknown>(
    pattern: string | string[],
    options: { query?: string; import?: string; eager: true },
  ): Record<string, T>;
}
